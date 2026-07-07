import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase";
import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { computeOraculoStatus } from "@/lib/oraculo/oraculoStatus";
import { oraculoAdminDecisionTemplate } from "@/lib/oraculo/oraculoEmails";
import { resend } from "@/lib/resend";

const RESEND_FROM = "Social Jurídico <contato@socialjuridico.com.br>";

const RELACAO_LABELS = {
  PROFESSOR: "Professor",
  ADVOGADO_CONHECIDO: "Advogado conhecido",
  ADVOGADO_ESCRITORIO: "Advogado do escritório onde estagia",
  COORDENADOR_ACADEMICO: "Coordenador acadêmico",
  MENTOR: "Mentor",
  OUTRO: "Outro",
};

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function adminDecisionFromRow(row) {
  if (row.status === "REPROVADO") return "REPROVADO";
  if (row.status === "SUSPENSO") return "SUSPENSO";
  if (row.aprovado_em) return "APROVADO";
  return null;
}

async function loadInvite(token) {
  const { data: supervisor, error } = await supabaseAdmin
    .from("oraculo_supervisores")
    .select(
      "id, oraculo_id, nome, email, relacao, status, convidado_em, respondido_em",
    )
    .eq("token_convite", token)
    .maybeSingle();

  if (error) throw new Error(`Falha ao consultar convite: ${error.message}`);
  if (!supervisor) return null;

  const { data: oraculo } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id, name, email, tipo, status, aprovado_em")
    .eq("id", supervisor.oraculo_id)
    .maybeSingle();

  return { supervisor, oraculo };
}

export async function GET(request, { params }) {
  const { token } = await params;

  try {
    const invite = await loadInvite(token);
    if (!invite) {
      return json({ success: false, message: "Convite não encontrado." }, 404);
    }

    return json({
      success: true,
      data: {
        supervisorNome: invite.supervisor.nome,
        oraculoNome: invite.oraculo?.name || "Candidato",
        relacaoLabel:
          RELACAO_LABELS[invite.supervisor.relacao] || invite.supervisor.relacao,
        status: invite.supervisor.status,
      },
    });
  } catch (error) {
    console.error("[Oraculo/Supervisor][GET] Erro:", error);
    return json(
      { success: false, message: "Não foi possível carregar o convite." },
      500,
    );
  }
}

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const { token } = await params;

  try {
    const body = await request.json().catch(() => null);
    const decision = String(body?.decision || "").toUpperCase();

    if (!["APROVADO", "RECUSADO"].includes(decision)) {
      return json({ success: false, message: "Decisão inválida." }, 400);
    }

    const invite = await loadInvite(token);
    if (!invite) {
      return json({ success: false, message: "Convite não encontrado." }, 404);
    }

    if (invite.supervisor.status !== "CONVIDADO") {
      return json(
        {
          success: false,
          message: "Este convite já foi respondido anteriormente.",
        },
        409,
      );
    }

    const respondedAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("oraculo_supervisores")
      .update({ status: decision, respondido_em: respondedAt })
      .eq("id", invite.supervisor.id)
      .eq("status", "CONVIDADO");

    if (updateError) {
      throw new Error(`Falha ao registrar decisão: ${updateError.message}`);
    }

    // Recomputa o status do cadastro considerando todos os supervisores.
    const { data: allSupervisors } = await supabaseAdmin
      .from("oraculo_supervisores")
      .select("status")
      .eq("oraculo_id", invite.oraculo.id);

    const supervisorApproved = (allSupervisors || []).some(
      (item) => item.status === "APROVADO",
    );

    const previousStatus = invite.oraculo.status;
    const nextStatus = computeOraculoStatus({
      adminDecision: adminDecisionFromRow(invite.oraculo),
      supervisorApproved,
    });

    if (nextStatus !== previousStatus) {
      await supabaseAdmin
        .from("oraculo_profissionais")
        .update({ status: nextStatus })
        .eq("id", invite.oraculo.id);

      if (nextStatus === "ATIVO") {
        try {
          await resend.emails.send({
            from: RESEND_FROM,
            to: invite.oraculo.email,
            subject: "Seu cadastro no Oráculo Jurídico está: Ativo",
            html: oraculoAdminDecisionTemplate({
              name: invite.oraculo.name,
              status: "ATIVO",
            }),
          });
        } catch (emailError) {
          console.error(
            "[Oraculo/Supervisor] Falha ao notificar ativação:",
            emailError,
          );
        }
      }
    }

    return json({
      success: true,
      message:
        decision === "APROVADO"
          ? "Convite aceito. Obrigado por apoiar o Oráculo Jurídico."
          : "Convite recusado.",
    });
  } catch (error) {
    console.error("[Oraculo/Supervisor][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível registrar sua resposta." },
      500,
    );
  }
}
