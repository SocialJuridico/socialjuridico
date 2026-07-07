import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import {
  createInstitutionInviteToken,
  INSTITUTION_ROLE_LABELS,
  INSTITUTION_ROLES,
  isEmailOutsideInstitutionDomain,
  recordInstitutionAudit,
} from "@/lib/oraculoInstitutionAccess";
import { oraculoInstitutionInviteTemplate } from "@/lib/oraculo/oraculoEmails";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";

const RESEND_FROM = "Social Juridico <contato@socialjuridico.com.br>";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request, { params }) {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return json({ success: false, message: auth.message }, auth.status);
  }

  const { id } = await params;

  try {
    const body = await request.json().catch(() => null);
    const nome = String(body?.nome || "").trim().slice(0, 160);
    const email = String(body?.email || "").trim().toLowerCase();
    const role = String(body?.role || "").trim().toUpperCase();
    const motivoExcecaoEmail = String(body?.motivo_excecao_email || "").trim();

    if (nome.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ success: false, message: "Informe nome e e-mail validos." }, 400);
    }
    if (!INSTITUTION_ROLES.includes(role)) {
      return json({ success: false, message: "Role institucional invalida." }, 400);
    }

    const { data: instituicao, error: institutionError } = await supabaseAdmin
      .from("oraculo_instituicoes")
      .select("id, nome, status, dominio_institucional, dominio_email")
      .eq("id", id)
      .maybeSingle();

    if (institutionError) throw institutionError;
    if (!instituicao) {
      return json({ success: false, message: "Instituicao nao encontrada." }, 404);
    }
    if (instituicao.status !== "ATIVA") {
      return json(
        { success: false, message: "A instituicao precisa estar ATIVA para convidar usuarios." },
        409,
      );
    }

    const domain = instituicao.dominio_institucional || instituicao.dominio_email;
    const emailForaDominio = isEmailOutsideInstitutionDomain(email, domain);
    if (emailForaDominio && motivoExcecaoEmail.length < 10) {
      return json(
        {
          success: false,
          message:
            "E-mail fora do dominio institucional exige motivo de excecao aprovado.",
        },
        400,
      );
    }

    const { data: existing } = await supabaseAdmin
      .from("oraculo_instituicao_convites")
      .select("id")
      .eq("instituicao_id", id)
      .eq("email", email)
      .eq("role", role)
      .eq("status", "PENDENTE")
      .maybeSingle();

    if (existing) {
      return json(
        { success: false, message: "Ja existe convite pendente para este e-mail e role." },
        409,
      );
    }

    const { token, tokenHash } = createInstitutionInviteToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("oraculo_instituicao_convites")
      .insert([
        {
          instituicao_id: id,
          email,
          nome_convidado: nome,
          role,
          token_hash: tokenHash,
          status: "PENDENTE",
          invited_by_auth_user_id: auth.user.id,
          invited_by_role: "ADMIN",
          expires_at: expiresAt,
        },
      ])
      .select("id")
      .single();

    if (inviteError) throw inviteError;

    const inviteUrl = `${
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.socialjuridico.com.br"
    }/oraculoacademico/convite-institucional/${token}`;

    await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject: "Voce foi convidado para o Oraculo Academico",
      html: oraculoInstitutionInviteTemplate({
        invitedName: nome,
        institutionName: instituicao.nome,
        roleLabel: INSTITUTION_ROLE_LABELS[role] || role,
        inviteUrl,
        expiresAt,
      }),
    });

    await recordInstitutionAudit({
      instituicaoId: id,
      authUserId: auth.user.id,
      eventType: "INSTITUTION_INVITE_SENT",
      action: "admin_send_institution_invite",
      request,
      metadata: { inviteId: invite.id, email, role, emailForaDominio },
    });

    return json({
      success: true,
      id: invite.id,
      message: "Convite institucional enviado.",
    });
  } catch (error) {
    console.error("[Admin/OraculoAcademico/Convites][POST] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel enviar o convite." },
      500,
    );
  }
}
