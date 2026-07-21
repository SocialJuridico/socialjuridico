import { supabaseAdmin } from "@/lib/supabase";

const HISTORY_LIMIT = 50;

/**
 * Registra uma consulta do módulo Interpretar (transparência com o advogado).
 * Nunca lança — telemetria não pode derrubar a consulta em si.
 */
export async function recordInterpretarConsulta({ advogadoId, origem, resultadosCount }) {
  try {
    if (!supabaseAdmin || !advogadoId) return;
    await supabaseAdmin.from("oraculo_interpretar_consultas").insert([
      {
        advogado_id: advogadoId,
        origem: origem === "CREDITO" ? "CREDITO" : "FREE",
        resultados_count: Number(resultadosCount || 0),
      },
    ]);
  } catch (error) {
    console.error("[Interpretar/Log] Falha não fatal ao registrar consulta:", error?.message);
  }
}

/** Últimas consultas do advogado, mais recentes primeiro. */
export async function listInterpretarConsultas(advogadoId, limit = HISTORY_LIMIT) {
  if (!supabaseAdmin || !advogadoId) return [];
  const { data, error } = await supabaseAdmin
    .from("oraculo_interpretar_consultas")
    .select("id, origem, resultados_count, created_at")
    .eq("advogado_id", advogadoId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[Interpretar/Log] Falha ao listar consultas:", error.message);
    return [];
  }
  return (data || []).map((r) => ({
    id: r.id,
    origem: r.origem,
    resultadosCount: r.resultados_count,
    createdAt: r.created_at,
  }));
}
