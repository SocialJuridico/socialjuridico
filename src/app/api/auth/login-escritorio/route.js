import { NextResponse } from "next/server";

import {
  OFFICE_SESSION_COOKIE,
  OFFICE_SESSION_SIGNATURE_COOKIE,
  signOfficeSessionValue,
} from "@/lib/officeSession";
import { hashPassword, isHashedPassword, verifyPassword } from "@/lib/passwordHash";
import { recordSecurityAuditEvent } from "@/lib/audit/securityAuditLog";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function officeCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8,
    path: "/",
  };
}

function createOfficeSessionResponse(office) {
  const response = json({
    success: true,
    user: {
      id: office.id,
      nome: office.nome,
      cnpj: office.cnpj,
      email: office.email,
      plano: office.plano,
    },
  });
  const sessionValue = Buffer.from(
    JSON.stringify({
      id: office.id,
      email: office.email,
      nome: office.nome,
      cnpj: office.cnpj,
      plano: office.plano,
      role: "ESCRITORIO",
      loginAt: new Date().toISOString(),
    }),
  ).toString("base64");
  const signature = signOfficeSessionValue(sessionValue);
  if (!signature) {
    throw new Error("Não foi possível assinar a sessão do escritório.");
  }
  response.cookies.set(OFFICE_SESSION_COOKIE, sessionValue, officeCookieOptions());
  response.cookies.set(
    OFFICE_SESSION_SIGNATURE_COOKIE,
    signature,
    officeCookieOptions(),
  );
  return response;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    const email = normalizeEmail(body?.email);
    const password = String(body?.password || "");
    if (!email || !password) {
      return json({ success: false, message: "E-mail e senha são obrigatórios." }, 400);
    }

    const supabase = createClient();
    const db = supabaseAdmin || supabase;
    const { data: staffMember, error: staffError } = await db
      .from("advogados")
      .select(
        "id, name, email, role, phone, cargo, escritorio_id, oab, estado, oab_verification_status, oab_warning_started_at",
      )
      .eq("email", email)
      .not("escritorio_id", "is", null)
      .maybeSingle();
    if (staffError) {
      console.error("[Login Escritório] Falha ao consultar membro:", staffError);
      return json({ success: false, message: "Não foi possível validar as credenciais." }, 500);
    }

    if (staffMember) {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError || !authData?.user) {
        await recordSecurityAuditEvent({
          db,
          eventType: "OFFICE_LOGIN_FAILED",
          actorType: "OFFICE_STAFF",
          actorEmail: email,
          targetUserId: staffMember.id,
          targetType: staffMember.cargo || "office_staff",
          targetEmail: email,
          request,
          outcome: "FAILURE",
          statusCode: 401,
          metadata: {
            reason_code: authError?.code || "INVALID_STAFF_CREDENTIALS",
            provider_status: authError?.status || null,
          },
        });

        return json({ success: false, message: "Senha incorreta ou credenciais inválidas." }, 401);
      }
      if (!authData.user.email_confirmed_at) {
        await supabase.auth.signOut();
        await recordSecurityAuditEvent({
          db,
          eventType: "AUTH_LOGIN_BLOCKED_EMAIL_NOT_CONFIRMED",
          actorId: authData.user.id,
          actorType: "OFFICE_STAFF",
          actorEmail: email,
          targetUserId: staffMember.id,
          targetType: staffMember.cargo || "office_staff",
          targetEmail: email,
          request,
          outcome: "BLOCKED",
          statusCode: 401,
          metadata: { reason_code: "EMAIL_NOT_CONFIRMED" },
        });

        return json(
          {
            success: false,
            message: "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.",
          },
          401,
        );
      }

      if (staffMember.cargo === "advogado") {
        let hasOabError = staffMember.oab_verification_status === "ERROR";
        if (
          !hasOabError &&
          staffMember.oab_verification_status === "PENDING" &&
          staffMember.oab_warning_started_at
        ) {
          const warningStart = new Date(staffMember.oab_warning_started_at);
          const elapsedDays = (Date.now() - warningStart.getTime()) / 86_400_000;
          if (!Number.isNaN(elapsedDays) && elapsedDays >= 7) {
            hasOabError = true;
            const { error: updateError } = await db
              .from("advogados")
              .update({ oab_verification_status: "ERROR" })
              .eq("id", staffMember.id);
            if (updateError) {
              console.error("[Login Escritório] Falha ao atualizar status da OAB:", updateError);
            }
          }
        }
        if (hasOabError) {
          await supabase.auth.signOut();
          await recordSecurityAuditEvent({
            db,
            eventType: "AUTH_LOGIN_BLOCKED_OAB",
            actorId: authData.user.id,
            actorType: "OFFICE_STAFF",
            actorEmail: email,
            targetUserId: staffMember.id,
            targetType: staffMember.cargo || "office_staff",
            targetEmail: email,
            request,
            outcome: "BLOCKED",
            statusCode: 403,
            metadata: {
              escritorio_id: staffMember.escritorio_id,
              reason_code: "OAB_VERIFICATION_BLOCK",
            },
          });

          return json(
            {
              success: false,
              type: "OAB_ERROR",
              message: "Acesso suspenso por pendência de verificação da OAB.",
            },
            403,
          );
        }
      }

      const response = json({
        success: true,
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: staffMember.name,
          role: staffMember.role || "LAWYER",
          cargo: staffMember.cargo,
          needsPasswordUpdate:
            authData.user.user_metadata?.needs_password_update === true,
        },
      });
      response.cookies.set(
        "sj_login_time",
        Buffer.from(
          JSON.stringify({ loginAt: new Date().toISOString(), userId: authData.user.id }),
        ).toString("base64"),
        {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 4 * 60 * 60,
          path: "/",
        },
      );
      await recordSecurityAuditEvent({
        db,
        eventType: "OFFICE_LOGIN_SUCCESS",
        actorId: authData.user.id,
        actorType: "OFFICE_STAFF",
        actorEmail: email,
        targetUserId: staffMember.id,
        targetType: staffMember.cargo || "office_staff",
        targetEmail: email,
        request,
        outcome: "SUCCESS",
        statusCode: 200,
        metadata: { escritorio_id: staffMember.escritorio_id },
      });

      return response;
    }

    const { data: office, error: officeError } = await db
      .from("escritorios")
      .select("id, nome, cnpj, email, plano, senha")
      .eq("email", email)
      .maybeSingle();
    if (officeError || !office) {
      await recordSecurityAuditEvent({
        db,
        eventType: "OFFICE_LOGIN_FAILED",
        actorType: "OFFICE",
        actorEmail: email,
        targetEmail: email,
        request,
        outcome: "FAILURE",
        statusCode: 401,
        metadata: { reason_code: "OFFICE_NOT_FOUND" },
      });

      return json(
        { success: false, message: "Escritório não cadastrado ou credenciais incorretas." },
        401,
      );
    }
    if (!verifyPassword(password, office.senha)) {
      await recordSecurityAuditEvent({
        db,
        eventType: "OFFICE_LOGIN_FAILED",
        actorId: office.id,
        actorType: "OFFICE",
        actorEmail: email,
        targetUserId: office.id,
        targetType: "OFFICE",
        targetEmail: email,
        request,
        outcome: "FAILURE",
        statusCode: 401,
        metadata: { reason_code: "INVALID_OFFICE_PASSWORD" },
      });

      return json({ success: false, message: "Senha incorreta para este escritório." }, 401);
    }

    if (!isHashedPassword(office.senha) && supabaseAdmin) {
      try {
        const { error: migrationError } = await supabaseAdmin
          .from("escritorios")
          .update({ senha: hashPassword(password) })
          .eq("id", office.id);
        if (migrationError) {
          console.error("[Login Escritório] Falha ao migrar senha legada:", migrationError);
        }
      } catch (migrationError) {
        console.error("[Login Escritório] Falha ao gerar hash da senha legada:", migrationError);
      }
    }

    const response = createOfficeSessionResponse(office);
    await recordSecurityAuditEvent({
      db,
      eventType: "OFFICE_LOGIN_SUCCESS",
      actorId: office.id,
      actorType: "OFFICE",
      actorEmail: office.email,
      targetUserId: office.id,
      targetType: "OFFICE",
      targetEmail: office.email,
      request,
      outcome: "SUCCESS",
      statusCode: 200,
      metadata: { plano: office.plano },
    });

    return response;
  } catch (error) {
    console.error("[Login Escritório] Erro:", error);
    return json({ success: false, message: "Erro interno no servidor." }, 500);
  }
}
