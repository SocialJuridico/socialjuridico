import { NextResponse } from "next/server";

import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import {
  hashInstitutionInviteToken,
  isEmailOutsideInstitutionDomain,
  recordInstitutionAudit,
} from "@/lib/oraculoInstitutionAccess";
import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const { token } = await params;
  const tokenHash = hashInstitutionInviteToken(token);

  try {
    const body = await request.json().catch(() => null);
    const password = String(body?.password || "");
    const existingPassword = String(body?.existingPassword || "");

    if (password.length < 8 && existingPassword.length < 1) {
      return json(
        { success: false, message: "Informe uma senha com pelo menos 8 caracteres." },
        400,
      );
    }

    const { data: invite, error } = await supabaseAdmin
      .from("oraculo_instituicao_convites")
      .select(
        "id, instituicao_id, email, nome_convidado, role, status, expires_at, oraculo_instituicoes(id, nome, status, dominio_institucional, dominio_email, instituicao_mfa_policy)",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;
    if (!invite) {
      return json({ success: false, message: "Convite nao encontrado." }, 404);
    }
    if (invite.status !== "PENDENTE") {
      return json({ success: false, message: "Este convite nao esta pendente." }, 409);
    }
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from("oraculo_instituicao_convites")
        .update({ status: "EXPIRADO" })
        .eq("id", invite.id);
      return json({ success: false, message: "Este convite expirou." }, 410);
    }
    if (invite.oraculo_instituicoes?.status !== "ATIVA") {
      return json(
        {
          success: false,
          message: "A instituicao ainda nao esta ativa para liberar acesso.",
        },
        409,
      );
    }

    const email = normalizeEmail(invite.email);
    let authUserId = null;
    const { data: existingAuth } =
      await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingAuth?.users?.find(
      (user) => normalizeEmail(user.email) === email,
    );

    if (existingUser) {
      if (!existingPassword) {
        return json(
          {
            success: false,
            code: "EXISTING_ACCOUNT_PASSWORD_REQUIRED",
            message:
              "Este e-mail ja possui conta. Informe a senha atual para vincular o acesso institucional.",
          },
          409,
        );
      }
      const supabase = createClient();
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password: existingPassword,
        });
      await supabase.auth.signOut().catch(() => {});
      if (signInError || signInData?.user?.id !== existingUser.id) {
        return json({ success: false, message: "Senha da conta existente invalida." }, 401);
      }
      authUserId = existingUser.id;
    } else {
      const { data: created, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: invite.nome_convidado,
            role: "ORACULO_INSTITUTIONAL",
          },
        });
      if (createError) throw createError;
      authUserId = created.user.id;
    }

    const domain =
      invite.oraculo_instituicoes?.dominio_institucional ||
      invite.oraculo_instituicoes?.dominio_email;
    const emailForaDominio = isEmailOutsideInstitutionDomain(email, domain);
    const mfaRequired =
      invite.oraculo_instituicoes?.instituicao_mfa_policy === "ALL_USERS" ||
      [
        "ORACULO_INSTITUICAO_ADMIN",
        "ORACULO_COORDENADOR_CURSO",
        "ORACULO_COORDENADOR_NPJ",
      ].includes(invite.role);

    const { data: institutionUser, error: userError } = await supabaseAdmin
      .from("oraculo_instituicao_usuarios")
      .upsert(
        [
          {
            instituicao_id: invite.instituicao_id,
            auth_user_id: authUserId,
            nome_completo: invite.nome_convidado,
            email,
            status: mfaRequired ? "PENDENTE_MFA" : "ATIVO",
            email_institucional: !emailForaDominio,
            email_fora_dominio: emailForaDominio,
            excecao_email_aprovada: emailForaDominio,
            mfa_required: mfaRequired,
            activated_at: mfaRequired ? null : new Date().toISOString(),
          },
        ],
        { onConflict: "instituicao_id,auth_user_id" },
      )
      .select("id")
      .single();

    if (userError) throw userError;

    const { error: roleError } = await supabaseAdmin
      .from("oraculo_instituicao_user_roles")
      .insert([
        {
          instituicao_usuario_id: institutionUser.id,
          role: invite.role,
          granted_by_auth_user_id: authUserId,
        },
      ]);

    if (roleError && !/duplicate/i.test(roleError.message || "")) {
      throw roleError;
    }

    const acceptedAt = new Date().toISOString();
    await supabaseAdmin
      .from("oraculo_instituicao_convites")
      .update({
        status: "ACEITO",
        accepted_at: acceptedAt,
        instituicao_usuario_id: institutionUser.id,
      })
      .eq("id", invite.id)
      .eq("status", "PENDENTE");

    await recordInstitutionAudit({
      instituicaoId: invite.instituicao_id,
      instituicaoUsuarioId: institutionUser.id,
      authUserId,
      eventType: "INSTITUTION_INVITE_ACCEPTED",
      action: "accept_institution_invite",
      request,
      metadata: { role: invite.role, email },
    });

    return json({
      success: true,
      message: mfaRequired
        ? "Convite aceito. Configure MFA para ativar o acesso institucional."
        : "Convite aceito. Seu acesso institucional foi ativado.",
      redirectTo: "/dashboard/oraculoacademico/instituicao",
    });
  } catch (error) {
    console.error("[Oraculo/ConviteInstitucional][POST] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel aceitar o convite." },
      500,
    );
  }
}
