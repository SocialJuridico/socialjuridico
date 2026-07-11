import { supabaseAdmin } from "@/lib/supabase";
import { logOraculoEvent, ORACULO_EVENTS } from "@/lib/oraculo/telemetry/oraculoTelemetry";
import { recordNotebookActivity } from "@/lib/oraculo/notebook/notebookActivityBridge";

// Anotações livres e rascunhos do Caderno Jurídico. Sempre escopado por
// oraculo_id resolvido no servidor — nunca confia no id enviado pelo cliente.

const ENTRY_FIELDS =
  "id, entry_type, title, content, category, tags, status, linked_analysis_id, case_title_snapshot, question_status, answer_notes, created_at, updated_at, archived_at";

const CASE_LINKED_TYPES = ["CASE_NOTE", "STUDY_QUESTION"];

export const NOTEBOOK_CATEGORIES = [
  "Direito Constitucional",
  "Direito Civil",
  "Direito do Consumidor",
  "Direito Penal",
  "Processo Civil",
  "Processo Penal",
  "Trabalhista",
  "Família",
  "Previdenciário",
  "Administrativo",
  "Tributário",
  "Prática Jurídica",
  "Dúvida Geral",
  "Outro",
];

export async function listNotebookEntries({
  oraculoId,
  entryType = null,
  linkedAnalysisId = null,
  limit = 200,
}) {
  if (!supabaseAdmin || !oraculoId) return [];
  let query = supabaseAdmin
    .from("oraculo_notebook_entries")
    .select(ENTRY_FIELDS)
    .eq("oraculo_id", oraculoId)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (entryType) query = query.eq("entry_type", entryType);
  if (linkedAnalysisId) query = query.eq("linked_analysis_id", linkedAnalysisId);

  const { data } = await query;
  return data || [];
}

export async function countNotebookEntries({ oraculoId, entryType = null }) {
  if (!supabaseAdmin || !oraculoId) return 0;
  let query = supabaseAdmin
    .from("oraculo_notebook_entries")
    .select("id", { count: "exact", head: true })
    .eq("oraculo_id", oraculoId)
    .eq("status", "ACTIVE");
  if (entryType) query = query.eq("entry_type", entryType);

  const { count } = await query;
  return count || 0;
}

const VALID_ENTRY_TYPES = ["NOTE", "DRAFT", "CASE_NOTE", "STUDY_QUESTION"];

export async function createNotebookEntry({
  context,
  oraculoId,
  entryType,
  title,
  content,
  category,
  tags,
  linkedAnalysisId,
}) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const type = VALID_ENTRY_TYPES.includes(entryType) ? entryType : "NOTE";
  const body = String(content || "").trim();
  if (!body) return { ok: false, code: "CONTENT_REQUIRED" };

  let caseTitleSnapshot = null;
  let analysisId = null;
  if (CASE_LINKED_TYPES.includes(type) && linkedAnalysisId) {
    // Nunca confia no título vindo do cliente: resolve e valida posse no servidor.
    const { data: analysis } = await supabaseAdmin
      .from("oraculo_analises")
      .select("id, titulo")
      .eq("id", linkedAnalysisId)
      .eq("oraculo_id", oraculoId)
      .maybeSingle();
    if (!analysis) return { ok: false, code: "ANALYSIS_NOT_FOUND" };
    analysisId = analysis.id;
    caseTitleSnapshot = analysis.titulo || null;
  }

  const { data, error } = await supabaseAdmin
    .from("oraculo_notebook_entries")
    .insert([
      {
        oraculo_id: oraculoId,
        student_program_link_id: context?.studentProgramLinkId || null,
        entry_type: type,
        title: title ? String(title).trim().slice(0, 200) : null,
        content: body.slice(0, 20000),
        category: category ? String(category).trim().slice(0, 80) : null,
        tags: normalizeTags(tags),
        linked_analysis_id: analysisId,
        case_title_snapshot: caseTitleSnapshot,
        question_status: type === "STUDY_QUESTION" ? "OPEN" : null,
      },
    ])
    .select(ENTRY_FIELDS)
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };

  await logOraculoEvent({
    context,
    type: ORACULO_EVENTS.NOTEBOOK_ENTRY_CREATED,
    surface: "/dashboard/oraculo/caderno",
    refType: "NOTEBOOK_ENTRY",
    refId: data.id,
    metadata: { entryType: type },
  });

  if (type === "CASE_NOTE" && analysisId) {
    await recordNotebookActivity({
      context,
      tipoAtividade: "ANOTACAO_CASO_ANALISE",
      titulo: caseTitleSnapshot ? `Nota de caso: ${caseTitleSnapshot}` : "Nota de caso",
      codigoCaso: analysisId,
    });
  }

  return { ok: true, entry: data };
}

export async function updateNotebookEntry({ context, oraculoId, id, patch }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const { data: existing } = await supabaseAdmin
    .from("oraculo_notebook_entries")
    .select("id, entry_type, status, question_status, case_title_snapshot, linked_analysis_id")
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!existing || existing.status !== "ACTIVE") {
    return { ok: false, code: "NOT_FOUND" };
  }

  const update = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) {
    update.title = patch.title ? String(patch.title).trim().slice(0, 200) : null;
  }
  if (patch.content !== undefined) {
    const body = String(patch.content || "").trim();
    if (!body) return { ok: false, code: "CONTENT_REQUIRED" };
    update.content = body.slice(0, 20000);
  }
  if (patch.category !== undefined) {
    update.category = patch.category ? String(patch.category).trim().slice(0, 80) : null;
  }
  if (patch.tags !== undefined) {
    update.tags = normalizeTags(patch.tags);
  }
  // Converte rascunho em anotação organizada.
  if (patch.entryType === "NOTE" && existing.entry_type === "DRAFT") {
    update.entry_type = "NOTE";
  }
  // Fluxo de questão de estudo: só se aplica a STUDY_QUESTION.
  if (existing.entry_type === "STUDY_QUESTION") {
    if (patch.questionStatus && ["OPEN", "STUDYING", "ANSWERED"].includes(patch.questionStatus)) {
      update.question_status = patch.questionStatus;
    }
    if (patch.answerNotes !== undefined) {
      const answer = String(patch.answerNotes || "").trim();
      update.answer_notes = answer ? answer.slice(0, 8000) : null;
      if (answer && !patch.questionStatus) update.question_status = "ANSWERED";
    }
  }

  const { data, error } = await supabaseAdmin
    .from("oraculo_notebook_entries")
    .update(update)
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .select(ENTRY_FIELDS)
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };

  await logOraculoEvent({
    context,
    type: ORACULO_EVENTS.NOTEBOOK_ENTRY_UPDATED,
    surface: "/dashboard/oraculo/caderno",
    refType: "NOTEBOOK_ENTRY",
    refId: id,
    metadata: {},
  });

  if (
    existing.entry_type === "STUDY_QUESTION" &&
    existing.question_status !== "ANSWERED" &&
    update.question_status === "ANSWERED"
  ) {
    await recordNotebookActivity({
      context,
      tipoAtividade: "QUESTAO_ESTUDO_RESPONDIDA",
      titulo: existing.case_title_snapshot
        ? `Questão de estudo: ${existing.case_title_snapshot}`
        : "Questão de estudo respondida",
      codigoCaso: existing.linked_analysis_id,
    });
  }

  return { ok: true, entry: data };
}

export async function archiveNotebookEntry({ context, oraculoId, id }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const { data, error } = await supabaseAdmin
    .from("oraculo_notebook_entries")
    .update({ status: "ARCHIVED", archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("oraculo_id", oraculoId)
    .eq("status", "ACTIVE")
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, code: "SAVE_FAILED" };
  if (!data) return { ok: false, code: "NOT_FOUND" };

  await logOraculoEvent({
    context,
    type: ORACULO_EVENTS.NOTEBOOK_ENTRY_ARCHIVED,
    surface: "/dashboard/oraculo/caderno",
    refType: "NOTEBOOK_ENTRY",
    refId: id,
    metadata: {},
  });

  return { ok: true };
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((t) => String(t || "").trim().toLowerCase().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
}
