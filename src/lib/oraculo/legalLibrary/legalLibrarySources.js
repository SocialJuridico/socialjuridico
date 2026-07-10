import { supabaseAdmin } from "@/lib/supabase";

import { getLegalUnitFull } from "@/lib/oraculo/legalLibrary/legalLibraryRead";
import { buildLegalCitation } from "@/lib/oraculo/legalLibrary/legalLibraryFormat";
import { logOraculoEvent, ORACULO_EVENTS } from "@/lib/oraculo/telemetry/oraculoTelemetry";

// Vínculo da Biblioteca com a Mesa de Análise e o Caderno.
// - Snapshot obrigatório ao adicionar/salvar: a análise fica presa à versão
//   consultada; alteração legislativa futura não muda o histórico.
// - Nunca confia em oraculo_id / analise_id do frontend: valida no servidor.

const EDITABLE_STATUSES = ["EM_ANDAMENTO", "AJUSTE_SOLICITADO"];
const VIEW_DEDUP_MINUTES = 30;

function citationFor({ document, unit }) {
  return buildLegalCitation({
    officialTitle: document?.official_title,
    documentShortName: document?.short_title,
    unitLabel: unit?.label,
  });
}

/**
 * Registra consulta a um dispositivo (dedup temporal para não inflar histórico).
 * Nunca lança.
 */
export async function recordLegalUnitView({ context, legalUnitId, analysisId = null }) {
  try {
    if (!supabaseAdmin || !context?.oraculoId || !legalUnitId) return;

    const since = new Date(Date.now() - VIEW_DEDUP_MINUTES * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("oraculo_legal_unit_views")
      .select("id")
      .eq("oraculo_id", context.oraculoId)
      .eq("legal_unit_id", legalUnitId)
      .gte("viewed_at", since)
      .maybeSingle();
    if (recent) return;

    const full = await getLegalUnitFull(legalUnitId);
    if (!full) return;

    await supabaseAdmin.from("oraculo_legal_unit_views").insert([
      {
        oraculo_id: context.oraculoId,
        student_program_link_id: context.studentProgramLinkId || null,
        legal_unit_id: legalUnitId,
        document_version_id: full.version.id,
        legal_collection_id: full.collection?.id || null,
        analysis_id: analysisId,
        label_snapshot: full.unit.label,
        document_title_snapshot: full.document.official_title,
        collection_slug_snapshot: full.collection?.slug || null,
      },
    ]);

    await logOraculoEvent({
      context,
      type: ORACULO_EVENTS.LEGAL_UNIT_VIEWED,
      surface: "/dashboard/oraculo/biblioteca",
      refType: "LEGAL_UNIT",
      refId: legalUnitId,
      metadata: { label: full.unit.label, collection: full.collection?.slug },
    });
  } catch {
    // telemetria/consulta nunca quebra a leitura.
  }
}

/**
 * Consultas recentes do aluno (Home da Biblioteca).
 */
export async function listRecentLegalViews({ oraculoId, limit = 8 }) {
  if (!supabaseAdmin || !oraculoId) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_legal_unit_views")
    .select("legal_unit_id, label_snapshot, document_title_snapshot, collection_slug_snapshot, viewed_at")
    .eq("oraculo_id", oraculoId)
    .order("viewed_at", { ascending: false })
    .limit(limit * 3);

  // Dedup por dispositivo mantendo o mais recente.
  const seen = new Set();
  const out = [];
  for (const v of data || []) {
    if (!v.legal_unit_id || seen.has(v.legal_unit_id)) continue;
    seen.add(v.legal_unit_id);
    out.push(v);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Adiciona um dispositivo da Biblioteca à análise, com SNAPSHOT da versão.
 */
export async function addLegalSourceToAnalysis({ analiseId, oraculoId, context, legalUnitId }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const { data: analysis } = await supabaseAdmin
    .from("oraculo_analises")
    .select("id, status")
    .eq("id", analiseId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!analysis) return { ok: false, code: "NOT_FOUND" };
  if (!EDITABLE_STATUSES.includes(analysis.status)) {
    return { ok: false, code: "NOT_EDITABLE" };
  }

  const full = await getLegalUnitFull(legalUnitId);
  if (!full) return { ok: false, code: "UNIT_NOT_FOUND" };

  // Evita duplicar a mesma fonte legal ativa.
  const { data: existing } = await supabaseAdmin
    .from("oraculo_analise_fontes")
    .select("id")
    .eq("analise_id", analiseId)
    .eq("document_version_id", full.version.id)
    .eq("legal_unit_id", legalUnitId)
    .is("removed_at", null)
    .maybeSingle();
  if (existing) return { ok: false, code: "ALREADY_ADDED" };

  const label = full.collection?.short_title
    ? `${full.collection.short_title} — ${full.unit.label}`
    : `${full.document.official_title} — ${full.unit.label}`;
  const citation = citationFor(full);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("oraculo_analise_fontes")
    .insert([
      {
        analise_id: analiseId,
        origin_type: "LIBRARY",
        titulo: label.slice(0, 240),
        referencia: citation.slice(0, 240),
        legal_collection_id: full.collection?.id || null,
        legal_document_id: full.document.id,
        document_version_id: full.version.id,
        legal_unit_id: legalUnitId,
        label_snapshot: full.unit.label,
        content_snapshot: full.unit.content,
        document_title_snapshot: full.document.official_title,
        source_name_snapshot: full.document.source_name,
        source_url_snapshot: full.document.source_url,
        collection_slug_snapshot: full.collection?.slug || null,
        consulted_at: nowIso,
        added_at: nowIso,
      },
    ])
    .select("id, titulo, referencia, created_at")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, code: "ALREADY_ADDED" };
    return { ok: false, code: "SAVE_FAILED" };
  }

  await logOraculoEvent({
    context,
    eventType: ORACULO_EVENTS.LEGAL_SOURCE_ADDED,
    surface: "/dashboard/oraculo/biblioteca",
    refType: "ANALYSIS",
    refId: analiseId,
    metadata: { label, unit: legalUnitId },
  });

  return { ok: true, source: data };
}

/**
 * Salva um dispositivo no Caderno Jurídico (com snapshot + nota opcional).
 */
export async function saveLegalUnitToNotebook({ context, oraculoId, legalUnitId, note }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const full = await getLegalUnitFull(legalUnitId);
  if (!full) return { ok: false, code: "UNIT_NOT_FOUND" };

  const title = full.collection?.short_title
    ? `${full.collection.short_title} — ${full.unit.label}`
    : full.unit.label;

  const { data, error } = await supabaseAdmin
    .from("oraculo_legal_saved_items")
    .upsert(
      [
        {
          oraculo_id: oraculoId,
          student_program_link_id: context?.studentProgramLinkId || null,
          legal_collection_id: full.collection?.id || null,
          legal_document_id: full.document.id,
          document_version_id: full.version.id,
          legal_unit_id: legalUnitId,
          title_snapshot: title,
          content_snapshot: full.unit.content,
          source_name_snapshot: full.document.source_name,
          collection_slug_snapshot: full.collection?.slug || null,
          note: note ? String(note).slice(0, 1000) : null,
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "oraculo_id,document_version_id,legal_unit_id" },
    )
    .select("id, title_snapshot")
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };

  await logOraculoEvent({
    context,
    eventType: ORACULO_EVENTS.LEGAL_SOURCE_SAVED,
    surface: "/dashboard/oraculo/biblioteca",
    refType: "LEGAL_UNIT",
    refId: legalUnitId,
    metadata: { label: full.unit.label },
  });

  return { ok: true, item: data };
}

/**
 * Lista o Caderno Jurídico do aluno.
 */
export async function listNotebookItems({ oraculoId, limit = 100 }) {
  if (!supabaseAdmin || !oraculoId) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_legal_saved_items")
    .select("id, legal_unit_id, title_snapshot, content_snapshot, collection_slug_snapshot, note, created_at")
    .eq("oraculo_id", oraculoId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

export async function countNotebookItems({ oraculoId }) {
  if (!supabaseAdmin || !oraculoId) return 0;
  const { count } = await supabaseAdmin
    .from("oraculo_legal_saved_items")
    .select("id", { count: "exact", head: true })
    .eq("oraculo_id", oraculoId);
  return count || 0;
}
