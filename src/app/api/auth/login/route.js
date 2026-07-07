import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { recordSecurityAuditEvent } from "@/lib/audit/securityAuditLog";
import { OAB_GRACE_PERIOD_DAYS } from "@/lib/oab";
import { NextResponse } from "next/server";

// ── RATE LIMITING ──
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const LEGACY_DEFAULT_PASSWORD =
  process.env.LEGACY_DEFAULT_PASSWORD || process.env.DEFAULT_PASSWORD || null;

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now - entry.firstAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  if (entry.count >= MAX_ATTEMPTS) {
    const retryMin = Math.ceil(
      (WINDOW_MS - (now - entry.firstAttempt)) / 60000,
    );
    return { allowed: false, retryMin };
  }
  entry.count++;
  return { allowed: true };
}

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1";
  const rateCheck = checkRateLimit(ip);

  // Ignorar rate limit em localhost para testes
  const isLocalhost = ip === "127.0.0.1" || ip === "::1";

  if (!rateCheck.allowed && !isLocalhost) {
    return NextResponse.json(
      {
        success: false,
        message: `Muitas tentativas. Aguarde ${rateCheck.retryMin} minuto(s).`,
      },
      { status: 429 },
    );
  }

  try {
    const { email, password } = await request.json();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email e senha são obrigatórios." },
        { status: 400 },
      );
    }

    const supabase = createClient();

    // 1. Autenticar no Supabase Auth
    let { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

    // LOG DIAGNOSTIC — para identificar a causa raiz
    if (authError) {
      console.log("[LOGIN DIAGNOSTIC]", {
        code: authError.code,
        message: authError.message,
        status: authError.status,
        name: authError.name,
        fullError: JSON.stringify(authError),
      });
    }

    // Se o erro for "Email not confirmed", retornar erro amigável orientando a confirmação
    if (
      authError &&
      (authError.message?.toLowerCase().includes("email not confirmed") ||
        authError.message?.toLowerCase().includes("email_not_confirmed") ||
        authError.code === "email_not_confirmed")
    ) {
      await recordSecurityAuditEvent({
        eventType: "AUTH_LOGIN_BLOCKED_EMAIL_NOT_CONFIRMED",
        actorType: "UNKNOWN",
        actorEmail: normalizedEmail,
        targetEmail: normalizedEmail,
        request,
        outcome: "BLOCKED",
        statusCode: 401,
        metadata: { reason_code: "EMAIL_NOT_CONFIRMED" },
      });

      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_NOT_CONFIRMED",
          message:
            "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou solicite um novo link.",
        },
        { status: 401 },
      );
    }

    // Se falhar, vamos tentar o "Lazy Sync" para usuários antigos/migrados
    if (
      authError &&
      (authError.status === 401 || authError.status === 400) &&
      supabaseAdmin &&
      LEGACY_DEFAULT_PASSWORD &&
      password === LEGACY_DEFAULT_PASSWORD
    ) {
      const db = supabaseAdmin || supabase;
      let existingProfile = null;

      // Procurar em todas as tabelas pelo email
      for (const table of ["advogados", "clientes", "admins"]) {
        const { data } = await db
          .from(table)
          .select("id, name, role")
          .eq("email", normalizedEmail)
          .maybeSingle();
        if (data) {
          existingProfile = { ...data, table };
          break;
        }
      }

      if (existingProfile) {
        // Criar ou atualizar usuário no Auth com a senha padrão e flag de troca obrigatória
        const { data: syncData, error: syncError } =
          await supabaseAdmin.auth.admin.createUser({
            id: existingProfile.id,
            email: normalizedEmail,
            password: LEGACY_DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: {
              full_name: existingProfile.name,
              role: existingProfile.role,
              needs_password_update: true,
            },
          });

        if (syncError) {
          if (syncError.message.includes("already has been registered")) {
            const { data: userData } =
              await supabaseAdmin.auth.admin.getUserById(existingProfile.id);

            await supabaseAdmin.auth.admin.updateUserById(existingProfile.id, {
              password: LEGACY_DEFAULT_PASSWORD,
              email_confirm: true,
              user_metadata: {
                ...(userData?.user?.user_metadata || {}),
                full_name: existingProfile.name,
                role: existingProfile.role,
                needs_password_update: true,
              },
            });
          } else {
            console.error(
              "[LazySync] Erro crítico ao criar user no Auth:",
              syncError.message,
            );
          }
        }

        // Tentar logar novamente após o sync
        const { data: retryData, error: retryError } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (!retryError) {
          authData = retryData;
          authError = null;
        }
      }
    }

    if (authError) {
      console.error("ERRO LOGIN AUTH:", {
        errorCode: authError.code,
        errorMessage: authError.message,
        status: authError.status,
      });
      await recordSecurityAuditEvent({
        eventType: "AUTH_LOGIN_FAILED",
        actorType: "UNKNOWN",
        actorEmail: normalizedEmail,
        targetEmail: normalizedEmail,
        request,
        outcome: "FAILURE",
        statusCode: 401,
        metadata: {
          reason_code: authError.code || "INVALID_CREDENTIALS",
          provider_status: authError.status || null,
        },
      });

      return NextResponse.json(
        {
          success: false,
          message: `Erro de autenticação: Credenciais inválidas ou conta não encontrada.`,
        },
        { status: 401 },
      );
    }

    const user = authData.user;

    if (user.user_metadata?.role === "SIGNATURE_CUSTOMER") {
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          success: false,
          code: "USE_SIGNATURE_LOGIN",
          message:
            "Esta conta pertence ao Social Jurídico Assinatura. Utilize a página de acesso do produto.",
          redirectTo: "/assinatura/entrar",
        },
        { status: 403 },
      );
    }

    // BLOQUEIO ADICIONAL: Mesmo que o Supabase permita o login, nós verificamos se o email foi confirmado
    if (!user.email_confirmed_at) {
      await supabase.auth.signOut();
      await recordSecurityAuditEvent({
        eventType: "AUTH_LOGIN_BLOCKED_EMAIL_NOT_CONFIRMED",
        actorId: user.id,
        actorType: "UNKNOWN",
        actorEmail: normalizedEmail,
        targetUserId: user.id,
        targetEmail: normalizedEmail,
        request,
        outcome: "BLOCKED",
        statusCode: 401,
        metadata: { reason_code: "EMAIL_NOT_CONFIRMED_AFTER_AUTH" },
      });

      return NextResponse.json(
        {
          success: false,
          code: "EMAIL_NOT_CONFIRMED",
          message:
            "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada ou solicite um novo link.",
        },
        { status: 401 },
      );
    }

    const db = supabaseAdmin || supabase;

    // 2. Buscar perfil — select('*') para compatibilidade entre tabelas
    let profile = null;
    const tables = ["clientes", "advogados", "admins"];
    for (const table of tables) {
      const { data } = await db
        .from(table)
        .select(
          `id, name, email, role, phone, avatar${table === "advogados" ? ", oab_verification_status, oab_warning_started_at, escritorio_id" : ""}`,
        )
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        profile = data;
        break;
      }
    }

    // oraculo_profissionais usa auth_user_id (não id) como FK, então não
    // participa do loop genérico acima — sem este bloco, um Oráculo sem
    // perfil em clientes/advogados/admins cairia no fallback "criar perfil
    // padrão" abaixo e seria indevidamente transformado em CLIENT.
    if (!profile) {
      const { data: oraculoData } = await db
        .from("oraculo_profissionais")
        .select("id, name, email, status")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (oraculoData) {
        profile = {
          id: user.id,
          name: oraculoData.name,
          email: oraculoData.email,
          role: "ORACULO",
          oraculo_status: oraculoData.status,
        };
      }
    }

    const { data: institutionalAccess, error: institutionalAccessError } =
      await db
        .from("oraculo_instituicao_usuarios")
        .select(
          "id, instituicao_id, status, mfa_required, oraculo_instituicoes(id, nome), oraculo_instituicao_user_roles(role, programa_academico_id, revoked_at)",
        )
        .eq("auth_user_id", user.id)
        .in("status", ["ATIVO", "PENDENTE_MFA"]);

    const institutionContexts = institutionalAccessError
      ? []
      : (institutionalAccess || []).map((item) => ({
          institutionUserId: item.id,
          instituicaoId: item.instituicao_id,
          instituicaoNome: item.oraculo_instituicoes?.nome || null,
          status: item.status,
          mfaRequired: Boolean(item.mfa_required),
          roles: (item.oraculo_instituicao_user_roles || [])
            .filter((role) => !role.revoked_at)
            .map((role) => role.role),
        }));

    // Bloquear membros de escritório no login individual
    if (profile && profile.escritorio_id) {
      await supabase.auth.signOut(); // Revoga a sessão
      await recordSecurityAuditEvent({
        db,
        eventType: "AUTH_LOGIN_BLOCKED_OFFICE_MEMBER",
        actorId: user.id,
        actorType: profile.role || "LAWYER",
        actorEmail: normalizedEmail,
        targetUserId: user.id,
        targetType: profile.cargo || "office_member",
        targetEmail: normalizedEmail,
        request,
        outcome: "BLOCKED",
        statusCode: 403,
        metadata: {
          escritorio_id: profile.escritorio_id,
          reason_code: "OFFICE_MEMBER_INDIVIDUAL_LOGIN",
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            "Acesso restrito. Membros de escritório (Enterprise) devem efetuar o login pela aba 'Escritórios (Enterprise)'.",
        },
        { status: 403 },
      );
    }

    // Verificação de bloqueio de OAB
    if (profile?.role === "LAWYER") {
      let isError = profile.oab_verification_status === "ERROR";

      // Se estiver pendente, verifica se o prazo de carência já estourou enquanto estava offline
      if (
        !isError &&
        profile.oab_verification_status === "PENDING" &&
        profile.oab_warning_started_at
      ) {
        const startedDate = new Date(profile.oab_warning_started_at);
        const daysPassed =
          (new Date().getTime() - startedDate.getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysPassed >= OAB_GRACE_PERIOD_DAYS) {
          isError = true;
          // Suspende a conta imediatamente no banco
          await db
            .from("advogados")
            .update({ oab_verification_status: "ERROR" })
            .eq("id", profile.id);
        }
      }

      if (isError) {
        await supabase.auth.signOut(); // Revoga a sessão
        await recordSecurityAuditEvent({
          db,
          eventType: "AUTH_LOGIN_BLOCKED_OAB",
          actorId: user.id,
          actorType: "LAWYER",
          actorEmail: normalizedEmail,
          targetUserId: user.id,
          targetType: "LAWYER",
          targetEmail: normalizedEmail,
          request,
          outcome: "BLOCKED",
          statusCode: 403,
          metadata: {
            oab_verification_status: "ERROR",
            reason_code: "OAB_VERIFICATION_BLOCK",
          },
        });

        return NextResponse.json(
          {
            success: false,
            type: "OAB_ERROR",
            message:
              "Sua verificação de OAB apresentou inconsistências ou o prazo de envio expirou, e seu acesso foi restrito.",
          },
          { status: 403 },
        );
      }
    }

    // 3. Criar perfil padrão se não existir
    if (!profile) {
      const newProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email.split("@")[0],
        role: "CLIENT",
        created_at: new Date().toISOString(),
      };
      const { data: inserted } = await db
        .from("clientes")
        .insert([newProfile])
        .select("id, name, email, role")
        .single();
      if (inserted) profile = inserted;
    }

    // 4. Montar resposta — os cookies de sessão Supabase são gerenciados automaticamente pelo createClient()
    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.email.split("@")[0],
        role: profile?.role || "CLIENT",
        cargo: profile?.cargo || null,
        oraculoStatus: profile?.oraculo_status || null,
        institutionContexts,
        needsPasswordUpdate: user.user_metadata?.needs_password_update === true,
      },
    });

    // Cookie de controle de 4 horas
    const loginData = Buffer.from(
      JSON.stringify({ loginAt: new Date().toISOString(), userId: user.id }),
    ).toString("base64");
    res.cookies.set("sj_login_time", loginData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 4 * 60 * 60,
      path: "/",
    });

    await recordSecurityAuditEvent({
      db,
      eventType: "AUTH_LOGIN_SUCCESS",
      actorId: user.id,
      actorType: profile?.role || "CLIENT",
      actorEmail: normalizedEmail,
      targetUserId: user.id,
      targetType: profile?.role || "CLIENT",
      targetEmail: normalizedEmail,
      request,
      outcome: "SUCCESS",
      statusCode: 200,
      metadata: {
        profile_role: profile?.role || "CLIENT",
        cargo: profile?.cargo || null,
        institution_contexts_count: institutionContexts.length,
      },
    });

    return res;
  } catch (error) {
    console.error("Erro na API de Login:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
