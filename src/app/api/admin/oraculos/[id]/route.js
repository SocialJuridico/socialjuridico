import { NextResponse } from "next/server";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { computeOraculoStatus } from "@/lib/oraculo/oraculoStatus";
import { oraculoAdminDecisionTemplate } from "@/lib/oraculo/oraculoEmails";
import { resend } from "@/lib/resend";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";
const DECISIONS = ["APROVADO", "REPROVADO", "SUSPENSO"];

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

    if (!DECISIONS.includes(decision)) {
      return json({ success: false, message: "Decisão inválida." }, 400);
    }

    if (decision !== "APROVADO" && !motivo) {
      return json(
        {
          success: false,
          message: "Informe o motivo da rejeição ou suspensão.",
        },
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
      return json({ success: false, message: "Cadastro não encontrado." }, 404);
    }

    const { data: supervisors, error: supervisorsError } = await supabaseAdmin
      .from("oraculo_supervisores")
      .select("status")
      .eq("oraculo_id", id);

    if (supervisorsError) {
      throw new Error(
        `Falha ao consultar supervisores: ${supervisorsError.message}`,
      );
    }

    const supervisorApproved = (supervisors || []).some(
      (item) => item.status === "APROVADO",
    );

    const nextStatus = computeOraculoStatus({
      adminDecision: decision,
      supervisorApproved,
    });

    const nowIso = new Date().toISOString();
    const updatePayload = { status: nextStatus };

    if (decision === "APROVADO") {
      updatePayload.aprovado_em = nowIso;
      updatePayload.aprovado_por = auth.user.id;
      updatePayload.reprovado_em = null;
      updatePayload.motivo_reprovacao = null;
      updatePayload.suspenso_em = null;
      updatePayload.motivo_suspensao = null;
    } else if (decision === "REPROVADO") {
      updatePayload.reprovado_em = nowIso;
      updatePayload.motivo_reprovacao = motivo;
    } else if (decision === "SUSPENSO") {
      updatePayload.suspenso_em = nowIso;
      updatePayload.motivo_suspensao = motivo;
    }

    const { error: updateError } = await supabaseAdmin
      .from("oraculo_profissionais")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      throw new Error(`Falha ao atualizar cadastro: ${updateError.message}`);
    }

    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: oraculo.email,
        subject: `Seu cadastro no Oráculo Jurídico está: ${nextStatus}`,
        html: oraculoAdminDecisionTemplate({
          name: oraculo.name,
          status: nextStatus,
          motivo: decision === "APROVADO" ? null : motivo,
        }),
      });
    } catch (emailError) {
      console.error(
        "[Admin/Oraculos] Falha ao notificar decisão:",
        emailError,
      );
    }

    return json({
      success: true,
      message: `Cadastro atualizado para ${nextStatus}.`,
      data: { status: nextStatus },
    });
  } catch (error) {
    console.error("[Admin/Oraculos][PATCH] Erro:", error);
    return json(
      { success: false, message: "Não foi possível atualizar o cadastro." },
      500,
    );
  }
}
