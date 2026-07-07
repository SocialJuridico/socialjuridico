import { NextResponse } from "next/server";

import {
  hashInstitutionInviteToken,
  INSTITUTION_ROLE_LABELS,
} from "@/lib/oraculoInstitutionAccess";
import { supabaseAdmin } from "@/lib/supabase";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(_request, { params }) {
  const { token } = await params;
  const tokenHash = hashInstitutionInviteToken(token);

  try {
    const { data: invite, error } = await supabaseAdmin
      .from("oraculo_instituicao_convites")
      .select(
        "id, email, nome_convidado, role, status, expires_at, oraculo_instituicoes(id, nome, status)",
      )
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (error) throw error;
    if (!invite) {
      return json({ success: false, message: "Convite nao encontrado." }, 404);
    }

    const expired = new Date(invite.expires_at).getTime() < Date.now();
    if (expired && invite.status === "PENDENTE") {
      await supabaseAdmin
        .from("oraculo_instituicao_convites")
        .update({ status: "EXPIRADO" })
        .eq("id", invite.id);
    }

    return json({
      success: true,
      data: {
        email: invite.email,
        nomeConvidado: invite.nome_convidado,
        role: invite.role,
        roleLabel: INSTITUTION_ROLE_LABELS[invite.role] || invite.role,
        status: expired ? "EXPIRADO" : invite.status,
        expiresAt: invite.expires_at,
        instituicao: invite.oraculo_instituicoes,
      },
    });
  } catch (error) {
    console.error("[Oraculo/ConviteInstitucional][GET] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel carregar o convite." },
      500,
    );
  }
}
