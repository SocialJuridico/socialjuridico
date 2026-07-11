import { supabaseAdmin } from "@/lib/supabase";
import { logOraculoEvent, ORACULO_EVENTS } from "@/lib/oraculo/telemetry/oraculoTelemetry";
import { recordNotebookActivity } from "@/lib/oraculo/notebook/notebookActivityBridge";

// Fichamentos do Caderno Jurídico: repertório acadêmico por tema, com
// fontes e casos vinculados por id (cada um já preserva seu próprio
// snapshot). Sempre escopado por oraculo_id resolvido no servidor.

const FIELDS =
  "id, title, theme, summary, practical_application, questions, linked_source_ids, linked_analysis_ids, tags, status, completed_at, created_at, updated_at";

export async function listFichamentos({ oraculoId, limit = 100 }) {
  if (!supabaseAdmin || !oraculoId) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .select(FIELDS)
    .eq("oraculo_id", oraculoId)
    .neq("status", "ARCHIVED")
    .order("updated_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function countFichamentos({ oraculoId }) {
  if (!supabaseAdmin || !oraculoId) return 0;
  const { count } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .select("id", { count: "exact", head: true })
    .eq("oraculo_id", oraculoId)
    .neq("status", "ARCHIVED");
  return count || 0;
}

export async function createFichamento({ context, oraculoId, title, theme }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const t = String(title || "").trim();
  if (!t) return { ok: false, code: "TITLE_REQUIRED" };

  const { data, error } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .insert([
      {
        oraculo_id: oraculoId,
        student_program_link_id: context?.studentProgramLinkId || null,
        title: t.slice(0, 200),
        theme: theme ? String(theme).trim().slice(0, 200) : null,
      },
    ])
    .select(FIELDS)
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };

  await logOraculoEvent({
    context,
    type: ORACULO_EVENTS.NOTEBOOK_FICHAMENTO_CREATED,
    surface: "/dashboard/oraculo/caderno",
    refType: "FICHAMENTO",
    refId: data.id,
    metadata: { title: t },
  });

  return { ok: true, fichamento: data };
}

async function loadOwned({ oraculoId, id }) {
  const { data } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .select(FIELDS)
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  return data || null;
}

/**
 * Carrega o fichamento + detalhes das fontes e casos vinculados (para exibir
 * título/trecho sem o cliente precisar buscar cada um separadamente).
 */
export async function getFichamentoDetail({ oraculoId, id }) {
  if (!supabaseAdmin || !oraculoId) return null;
  const fichamento = await loadOwned({ oraculoId, id });
  if (!fichamento) return null;

  const [sourcesRes, analysesRes] = await Promise.all([
    fichamento.linked_source_ids.length
      ? supabaseAdmin
          .from("oraculo_legal_saved_items")
          .select("id, title_snapshot, collection_slug_snapshot, legal_unit_id")
          .in("id", fichamento.linked_source_ids)
      : Promise.resolve({ data: [] }),
    fichamento.linked_analysis_ids.length
      ? supabaseAdmin
          .from("oraculo_analises")
          .select("id, titulo, area, status")
          .in("id", fichamento.linked_analysis_ids)
      : Promise.resolve({ data: [] }),
  ]);

  return {
    fichamento,
    sources: sourcesRes.data || [],
    analyses: analysesRes.data || [],
  };
}

export async function updateFichamento({ context, oraculoId, id, patch }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const existing = await loadOwned({ oraculoId, id });
  if (!existing || existing.status === "ARCHIVED") return { ok: false, code: "NOT_FOUND" };

  const update = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) {
    const t = String(patch.title || "").trim();
    if (!t) return { ok: false, code: "TITLE_REQUIRED" };
    update.title = t.slice(0, 200);
  }
  for (const key of ["theme", "summary", "practical_application", "questions"]) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (patch[camel] !== undefined) {
      update[key] = patch[camel] ? String(patch[camel]).trim().slice(0, 8000) : null;
    }
  }
  if (patch.tags !== undefined) {
    update.tags = Array.isArray(patch.tags)
      ? patch.tags.map((t) => String(t || "").trim().toLowerCase().slice(0, 40)).filter(Boolean).slice(0, 12)
      : [];
  }

  let completing = false;
  if (patch.status && ["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"].includes(patch.status)) {
    update.status = patch.status;
    if (patch.status === "COMPLETED" && existing.status !== "COMPLETED") {
      update.completed_at = new Date().toISOString();
      completing = true;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .update(update)
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .select(FIELDS)
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };

  await logOraculoEvent({
    context,
    type: completing ? ORACULO_EVENTS.NOTEBOOK_FICHAMENTO_COMPLETED : ORACULO_EVENTS.NOTEBOOK_FICHAMENTO_UPDATED,
    surface: "/dashboard/oraculo/caderno",
    refType: "FICHAMENTO",
    refId: id,
    metadata: {},
  });

  if (completing) {
    await recordNotebookActivity({
      context,
      tipoAtividade: "FICHAMENTO_CONCLUIDO",
      titulo: `Fichamento: ${data.title}`,
      resumo: data.theme,
    });
  }

  return { ok: true, fichamento: data };
}

/**
 * Vincula uma fonte salva (do próprio Caderno) a um fichamento.
 */
export async function addFichamentoSource({ oraculoId, id, sourceId }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const existing = await loadOwned({ oraculoId, id });
  if (!existing) return { ok: false, code: "NOT_FOUND" };

  const { data: source } = await supabaseAdmin
    .from("oraculo_legal_saved_items")
    .select("id")
    .eq("id", sourceId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!source) return { ok: false, code: "SOURCE_NOT_FOUND" };

  if (existing.linked_source_ids.includes(sourceId)) return { ok: true, fichamento: existing };

  const linked_source_ids = [...existing.linked_source_ids, sourceId];
  const { data, error } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .update({ linked_source_ids, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .select(FIELDS)
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };
  return { ok: true, fichamento: data };
}

export async function removeFichamentoSource({ oraculoId, id, sourceId }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const existing = await loadOwned({ oraculoId, id });
  if (!existing) return { ok: false, code: "NOT_FOUND" };

  const linked_source_ids = existing.linked_source_ids.filter((s) => s !== sourceId);
  const { data, error } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .update({ linked_source_ids, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .select(FIELDS)
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };
  return { ok: true, fichamento: data };
}

/**
 * Vincula uma análise (caso) do próprio aluno a um fichamento.
 */
export async function addFichamentoAnalysis({ oraculoId, id, analysisId }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const existing = await loadOwned({ oraculoId, id });
  if (!existing) return { ok: false, code: "NOT_FOUND" };

  const { data: analysis } = await supabaseAdmin
    .from("oraculo_analises")
    .select("id")
    .eq("id", analysisId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!analysis) return { ok: false, code: "ANALYSIS_NOT_FOUND" };

  if (existing.linked_analysis_ids.includes(analysisId)) return { ok: true, fichamento: existing };

  const linked_analysis_ids = [...existing.linked_analysis_ids, analysisId];
  const { data, error } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .update({ linked_analysis_ids, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .select(FIELDS)
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };
  return { ok: true, fichamento: data };
}

export async function removeFichamentoAnalysis({ oraculoId, id, analysisId }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const existing = await loadOwned({ oraculoId, id });
  if (!existing) return { ok: false, code: "NOT_FOUND" };

  const linked_analysis_ids = existing.linked_analysis_ids.filter((a) => a !== analysisId);
  const { data, error } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .update({ linked_analysis_ids, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .select(FIELDS)
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };
  return { ok: true, fichamento: data };
}

export async function archiveFichamento({ oraculoId, id }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const { data, error } = await supabaseAdmin
    .from("oraculo_fichamentos")
    .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .neq("status", "ARCHIVED")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, code: "SAVE_FAILED" };
  if (!data) return { ok: false, code: "NOT_FOUND" };
  return { ok: true };
}
