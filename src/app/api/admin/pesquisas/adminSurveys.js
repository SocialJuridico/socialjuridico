import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const LAWYER_QUESTION_KEYS = [
  "q1_velocidade",
  "q2_marketplace",
  "q3_ia_redator",
  "q4_ia_personalidade",
  "q5_seguranca",
  "q6_prazos",
  "q7_crm",
  "q8_smartdocs",
  "q9_suporte",
  "q10_roi",
];

export const CLIENT_QUESTION_KEYS = [
  "q1_cadastro",
  "q2_clareza",
  "q3_velocidade",
  "q4_confianca",
  "q5_qualidade",
  "q6_chat",
  "q7_transparencia",
  "q8_seguranca",
  "q9_pwa",
  "q10_recomendacao",
];

export const PLATFORM_UPDATE_QUESTION_KEYS = [
  "q1_design",
  "q2_facilidade_uso",
  "q3_velocidade",
  "q4_estabilidade",
  "q5_seguranca",
  "q6_qualidade_geral",
  "q7_qualidade_ia",
  "q8_cartao_digital",
  "q9_organizacao_rotas",
  "q10_confianca_recomendar",
];

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireAdminAccess() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço administrativo indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, db: supabaseAdmin, auth };
}

export async function fetchSurveyData(db, { includeUsers = true } = {}) {
  const lawyerSelect = includeUsers
    ? "*, advogados:user_id (name, email)"
    : "*";
  const clientSelect = includeUsers
    ? "*, clientes:user_id (name, email)"
    : "*";
  const platformUpdateSelect = includeUsers
    ? "*, advogados:user_id (name, email)"
    : "*";

  const [lawyersResult, clientsResult, platformUpdateResult] = await Promise.all([
    db
      .from("pesquisas_satisfacao_advogados")
      .select(lawyerSelect)
      .order("created_at", { ascending: false }),
    db
      .from("pesquisas_satisfacao_clientes")
      .select(clientSelect)
      .order("created_at", { ascending: false }),
    db
      .from("pesquisas_atualizacao_plataforma_advogados")
      .select(platformUpdateSelect)
      .order("created_at", { ascending: false }),
  ]);

  if (lawyersResult.error || clientsResult.error || platformUpdateResult.error) {
    const details = [
      lawyersResult.error?.message,
      clientsResult.error?.message,
      platformUpdateResult.error?.message,
    ]
      .filter(Boolean)
      .join(" | ");
    throw new Error(`Falha ao consultar pesquisas: ${details}`);
  }

  return {
    advogados: lawyersResult.data || [],
    clientes: clientsResult.data || [],
    atualizacao: platformUpdateResult.data || [],
  };
}

export function calculateSurveyAverage(item, questionKeys) {
  if (!questionKeys.length) return 0;

  const total = questionKeys.reduce(
    (sum, key) => sum + Number(item?.[key] || 0),
    0,
  );

  return total / questionKeys.length;
}
