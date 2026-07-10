import { supabaseAdmin } from "@/lib/supabase";

// Faixa tier ORACULO: intenção de fechamento 0-59 (ver getIntentTier).
export const ORACULO_INTENT_MAX = 59;

const ACTIVE_CLAIM_STATUSES = ["WAITING_CLIENT_ACCEPTANCE", "ACCEPTED"];

function resumoFrom(descricao = "") {
  const text = String(descricao || "").trim();
  if (text.length <= 220) return text;
  return `${text.slice(0, 217)}…`;
}

async function safe(query) {
  if (!supabaseAdmin) return [];
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

/**
 * Casos reais tier ORACULO disponíveis para manifestação de interesse deste
 * estudante. Exclui casos já rejeitados por ele e casos já reservados por
 * qualquer Oráculo (distribuição != AVAILABLE).
 */
export async function loadAvailableOraculoCases(oraculoId) {
  if (!supabaseAdmin) return [];

  const [rejeicoes, distribuicoes] = await Promise.all([
    safe(
      supabaseAdmin
        .from("oraculo_caso_rejeicoes")
        .select("caso_id")
        .eq("oraculo_id", oraculoId),
    ),
    safe(
      supabaseAdmin
        .from("oraculo_caso_distribuicoes")
        .select("caso_id, oraculo_status, call_round"),
    ),
  ]);

  const rejectedIds = new Set(rejeicoes.map((row) => row.caso_id));
  const distByCase = new Map(
    distribuicoes.map((row) => [row.caso_id, row]),
  );

  const casos = await safe(
    supabaseAdmin
      .from("casos")
      .select(
        "id, titulo, descricao, area_atuacao, cidade, estado, status, advogado_id, intencao_fechamento, created_at",
      )
      .eq("status", "ABERTO")
      .is("advogado_id", null)
      .gte("intencao_fechamento", 0)
      .lte("intencao_fechamento", ORACULO_INTENT_MAX)
      .order("created_at", { ascending: false })
      .limit(120),
  );

  return casos
    .filter((caso) => {
      if (rejectedIds.has(caso.id)) return false;
      const dist = distByCase.get(caso.id);
      // Sem distribuição = nunca reservado = disponível.
      if (!dist) return true;
      return dist.oraculo_status === "AVAILABLE";
    })
    .map((caso) => {
      const dist = distByCase.get(caso.id);
      const round = dist?.call_round || 1;
      return {
        id: caso.id,
        titulo: caso.titulo || "Caso sem título",
        area: caso.area_atuacao || "Área não informada",
        resumo: resumoFrom(caso.descricao),
        uf: caso.estado || null,
        createdAt: caso.created_at,
        callRound: round,
        callTag: round >= 3 ? "3ª CHAMADA" : round === 2 ? "2ª CHAMADA" : null,
      };
    });
}

/**
 * Manifestações ativas do estudante (aguardando cliente ou aceitas).
 */
export async function loadMyOraculoClaims(oraculoId) {
  if (!supabaseAdmin) return [];

  const claims = await safe(
    supabaseAdmin
      .from("oraculo_caso_claims")
      .select(
        "id, caso_id, status, call_round, claimed_at, client_response_deadline",
      )
      .eq("oraculo_id", oraculoId)
      .in("status", ACTIVE_CLAIM_STATUSES)
      .order("claimed_at", { ascending: false })
      .limit(50),
  );

  if (!claims.length) return [];

  const caseIds = claims.map((claim) => claim.caso_id);
  const casos = await safe(
    supabaseAdmin
      .from("casos")
      .select("id, titulo, area_atuacao")
      .in("id", caseIds),
  );
  const casosById = new Map(casos.map((caso) => [caso.id, caso]));

  return claims.map((claim) => {
    const caso = casosById.get(claim.caso_id) || {};
    return {
      id: claim.id,
      casoId: claim.caso_id,
      titulo: caso.titulo || "Caso",
      area: caso.area_atuacao || "Área não informada",
      status: claim.status,
      deadline: claim.client_response_deadline,
      claimedAt: claim.claimed_at,
    };
  });
}

/**
 * Estado de cooldown de manifestação do estudante.
 * Retorna { active, nextAvailableAt } — active=true bloqueia novo claim.
 */
export async function loadOraculoClaimCooldown(oraculoId) {
  if (!supabaseAdmin) return { active: false, nextAvailableAt: null };

  const { data, error } = await supabaseAdmin
    .from("oraculo_claim_cooldowns")
    .select("next_claim_available_at")
    .eq("oraculo_id", oraculoId)
    .maybeSingle();

  if (error || !data?.next_claim_available_at) {
    return { active: false, nextAvailableAt: null };
  }

  const next = new Date(data.next_claim_available_at);
  return {
    active: next.getTime() > Date.now(),
    nextAvailableAt: data.next_claim_available_at,
  };
}
