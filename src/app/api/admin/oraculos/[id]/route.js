import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { oraculoAdminDecisionTemplate } from "@/lib/oraculo/oraculoEmails";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";

const RESEND_FROM = "Social Juridico <contato@socialjuridico.com.br>";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(request, { params }) {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) {
    return json({ success: false, message: auth.message }, auth.status);
  }

  const { id } = await params;

  try {
    const body = await request.json().catch(() => null);
    const decision = String(body?.decision || "").toUpperCase();
    const motivo = String(body?.motivo || "").trim().slice(0, 1000);

    if (decision !== "SUSPENSO") {
      return json(
        {
          success: false,
          message:
            "O admin do Social Juridico pode apenas suspender cadastros do Oraculo. Aprovacao e reprovacao sao competencia da instituicao de ensino.",
        },
        403,
      );
    }

    if (!motivo) {
      return json(
        { success: false, message: "Informe o motivo da suspensao." },
        400,
      );
    }

    const { data: oraculo, error: fetchError } = await supabaseAdmin
      .from("oraculo_profissionais")
      .select("id, name, email, status")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Falha ao consultar cadastro: ${fetchError.message}`);
    }
    if (!oraculo) {
      return json({ success: false, message: "Cadastro nao encontrado." }, 404);
    }

    const nextStatus = "SUSPENSO";
    const { error: updateError } = await supabaseAdmin
      .from("oraculo_profissionais")
      .update({
        status: nextStatus,
        suspenso_em: new Date().toISOString(),
        motivo_suspensao: motivo,
      })
      .eq("id", id);

    if (updateError) {
      throw new Error(`Falha ao atualizar cadastro: ${updateError.message}`);
    }

    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: oraculo.email,
        subject: `Seu cadastro no Oraculo Juridico esta: ${nextStatus}`,
        html: oraculoAdminDecisionTemplate({
          name: oraculo.name,
          status: nextStatus,
          motivo,
        }),
      });
    } catch (emailError) {
      console.error("[Admin/Oraculos] Falha ao notificar suspensao:", emailError);
    }

    return json({
      success: true,
      message: "Cadastro suspenso pelo administrador do Social Juridico.",
      data: { status: nextStatus },
    });
  } catch (error) {
    console.error("[Admin/Oraculos][PATCH] Erro:", error);
    return json(
      { success: false, message: "Nao foi possivel suspender o cadastro." },
      500,
    );
  }
}
