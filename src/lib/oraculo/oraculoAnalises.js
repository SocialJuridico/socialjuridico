import { supabaseAdmin } from "@/lib/supabase";

import { getRadarAcademicCaseForStudent } from "@/lib/oraculo/radarAcademic/radarAcademicCasesRead";

export const ANALYSIS_EDITABLE_FIELDS = [
  "problema_identificado",
  "fatos_relevantes",
  "informacoes_faltantes",
  "questoes_pesquisa",
  "analise_inicial",
  "encaminhamento",
];

const EDITABLE_STATUSES = ["EM_ANDAMENTO", "AJUSTE_SOLICITADO"];

export const ANALYSIS_STATUS_LABELS = {
  EM_ANDAMENTO: "Em andamento",
  ENVIADA_REVISAO: "Aguardando revisão",
  AJUSTE_SOLICITADO: "Correção solicitada",
  APROVADA: "Aprovada",
  CONCLUIDA: "Concluída",
};

function trimField(value) {
  return typeof value === "string" ? value.slice(0, 8000) : null;
}

/**
 * Passos da Mesa de Análise a partir do estado da análise + nº de fontes.
 */
export function computeAnalysisSteps(analysis, sourcesCount = 0) {
  const filled = (v) => Boolean(v && String(v).trim());
  return [
    { key: "COMPREENSAO", label: "Compreensão", done: filled(analysis.problema_identificado) },
    { key: "FATOS", label: "Fatos", done: filled(analysis.fatos_relevantes) },
    {
      key: "PESQUISA",
      label: "Pesquisa",
      done: filled(analysis.questoes_pesquisa) || sourcesCount > 0,
    },
    { key: "ANALISE", label: "Análise", done: filled(analysis.analise_inicial) },
    { key: "ENCAMINHAMENTO", label: "Encaminhamento", done: filled(analysis.encaminhamento) },
    {
      key: "REVISAO",
      label: "Revisão",
      done: ["ENVIADA_REVISAO", "APROVADA", "CONCLUIDA"].includes(analysis.status),
    },
  ];
}

/**
 * Cria (ou retorna) a análise do estudante para um caso de estudo do Radar.
 */
export async function createOrGetRadarAnalysis({ academicCaseId, context }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const dossie = await getRadarAcademicCaseForStudent(academicCaseId);
  if (!dossie) return { ok: false, code: "CASE_NOT_FOUND" };

  const { data: existing } = await supabaseAdmin
    .from("oraculo_analises")
    .select("id")
    .eq("oraculo_id", context.oraculoId)
    .eq("radar_academic_case_id", academicCaseId)
    .maybeSingle();

  if (existing?.id) return { ok: true, analiseId: existing.id, created: false };

  const { data, error } = await supabaseAdmin
    .from("oraculo_analises")
    .insert([
      {
        oraculo_id: context.oraculoId,
        student_program_link_id: context.studentProgramLinkId || null,
        instituicao_id: context.institutionId || null,
        programa_id: context.programId || null,
        source_type: "RADAR_ACADEMIC",
        radar_academic_case_id: academicCaseId,
        titulo: dossie.title,
        area: dossie.legalArea,
        status: "EM_ANDAMENTO",
      },
    ])
    .select("id")
    .single();

  if (error) {
    console.error("[OraculoAnalises] Falha ao criar:", error.message);
    return { ok: false, code: "CREATE_FAILED" };
  }
  return { ok: true, analiseId: data.id, created: true };
}

async function loadSources(analiseId) {
  const { data } = await supabaseAdmin
    .from("oraculo_analise_fontes")
    .select("id, titulo, referencia, nota, created_at")
    .eq("analise_id", analiseId)
    .order("created_at", { ascending: true });
  return data || [];
}

/**
 * Carrega a análise + fontes + o caso de origem (dossiê, se Radar).
 */
export async function getAnalysisForStudent({ analiseId, oraculoId }) {
  if (!supabaseAdmin) return null;
  const { data: analysis } = await supabaseAdmin
    .from("oraculo_analises")
    .select("*")
    .eq("id", analiseId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!analysis) return null;

  const sources = await loadSources(analiseId);
  let caseView = null;
  if (analysis.radar_academic_case_id) {
    caseView = await getRadarAcademicCaseForStudent(analysis.radar_academic_case_id);
  }

  return {
    analysis,
    sources,
    caseView,
    steps: computeAnalysisSteps(analysis, sources.length),
    editable: EDITABLE_STATUSES.includes(analysis.status),
  };
}

/**
 * Atualiza seções da análise (autosave). Só quando editável.
 */
export async function updateAnalysisSection({ analiseId, oraculoId, fields }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const { data: analysis } = await supabaseAdmin
    .from("oraculo_analises")
    .select("status")
    .eq("id", analiseId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!analysis) return { ok: false, code: "NOT_FOUND" };
  if (!EDITABLE_STATUSES.includes(analysis.status)) {
    return { ok: false, code: "NOT_EDITABLE" };
  }

  const updates = {};
  for (const key of ANALYSIS_EDITABLE_FIELDS) {
    if (key in fields) updates[key] = trimField(fields[key]);
  }
  if (!Object.keys(updates).length) {
    return { ok: false, code: "NO_FIELDS" };
  }
  updates.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("oraculo_analises")
    .update(updates)
    .eq("id", analiseId)
    .eq("oraculo_id", oraculoId);
  if (error) return { ok: false, code: "SAVE_FAILED" };
  return { ok: true };
}

/**
 * Envia a análise para revisão do ORIENTADOR (acadêmico). Opcionalmente dá
 * ciência ao supervisor (conduta). Revisão nunca vai só ao supervisor.
 */
export async function submitAnalysisForReview({
  analiseId,
  oraculoId,
  cienciaSupervisor = false,
}) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };

  const { data: analysis } = await supabaseAdmin
    .from("oraculo_analises")
    .select("status, problema_identificado, analise_inicial")
    .eq("id", analiseId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!analysis) return { ok: false, code: "NOT_FOUND" };
  if (!EDITABLE_STATUSES.includes(analysis.status)) {
    return { ok: false, code: "NOT_EDITABLE" };
  }
  if (!String(analysis.problema_identificado || "").trim() || !String(analysis.analise_inicial || "").trim()) {
    return { ok: false, code: "INCOMPLETE" };
  }

  const { error } = await supabaseAdmin
    .from("oraculo_analises")
    .update({
      status: "ENVIADA_REVISAO",
      revisao_ciencia_supervisor: Boolean(cienciaSupervisor),
      enviado_revisao_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", analiseId)
    .eq("oraculo_id", oraculoId);
  if (error) return { ok: false, code: "SAVE_FAILED" };
  return { ok: true };
}

const ENCAMINHAMENTO_DESTINOS = ["ORIENTADOR", "SUPERVISOR", "AMBOS"];

/**
 * Cria um encaminhamento (dúvida/pedido) com destino escolhido pelo aluno:
 * ORIENTADOR, SUPERVISOR ou AMBOS.
 */
export async function createEncaminhamento({
  oraculoId,
  context,
  destino,
  assunto,
  mensagem,
  analiseId = null,
}) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  const dest = String(destino || "").toUpperCase();
  if (!ENCAMINHAMENTO_DESTINOS.includes(dest)) {
    return { ok: false, code: "INVALID_DESTINO" };
  }
  const texto = String(mensagem || "").trim();
  if (!texto) return { ok: false, code: "EMPTY" };

  const { data, error } = await supabaseAdmin
    .from("oraculo_encaminhamentos")
    .insert([
      {
        oraculo_id: oraculoId,
        analise_id: analiseId,
        instituicao_id: context?.institutionId || null,
        programa_id: context?.programId || null,
        destino: dest,
        assunto: assunto ? String(assunto).slice(0, 200) : null,
        mensagem: texto.slice(0, 4000),
        status: "ABERTO",
      },
    ])
    .select("id, destino, assunto, mensagem, status, created_at")
    .single();

  if (error) return { ok: false, code: "SAVE_FAILED" };
  return { ok: true, encaminhamento: data };
}

/**
 * Lista encaminhamentos do estudante (opcionalmente de uma análise).
 */
export async function listEncaminhamentos({ oraculoId, analiseId = null }) {
  if (!supabaseAdmin) return [];
  let query = supabaseAdmin
    .from("oraculo_encaminhamentos")
    .select("id, analise_id, destino, assunto, mensagem, status, created_at")
    .eq("oraculo_id", oraculoId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (analiseId) query = query.eq("analise_id", analiseId);
  const { data } = await query;
  return data || [];
}

/**
 * Adiciona uma fonte à análise.
 */
export async function addAnalysisSource({ analiseId, oraculoId, titulo, referencia, nota }) {
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

  const { data, error } = await supabaseAdmin
    .from("oraculo_analise_fontes")
    .insert([
      {
        analise_id: analiseId,
        titulo: String(titulo || "").slice(0, 240),
        referencia: referencia ? String(referencia).slice(0, 240) : null,
        nota: nota ? String(nota).slice(0, 1000) : null,
      },
    ])
    .select("id, titulo, referencia, nota, created_at")
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };
  return { ok: true, source: data };
}

/**
 * Remove uma fonte da análise.
 */
export async function removeAnalysisSource({ analiseId, oraculoId, sourceId }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  // Garante que a análise pertence ao estudante.
  const { data: analysis } = await supabaseAdmin
    .from("oraculo_analises")
    .select("id")
    .eq("id", analiseId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  if (!analysis) return { ok: false, code: "NOT_FOUND" };

  const { error } = await supabaseAdmin
    .from("oraculo_analise_fontes")
    .delete()
    .eq("id", sourceId)
    .eq("analise_id", analiseId);
  if (error) return { ok: false, code: "DELETE_FAILED" };
  return { ok: true };
}

/**
 * Lista as análises do estudante (para /analises), com contagem de fontes.
 */
export async function listStudentAnalyses({ oraculoId }) {
  if (!supabaseAdmin) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_analises")
    .select("id, titulo, area, source_type, status, updated_at, created_at")
    .eq("oraculo_id", oraculoId)
    .order("updated_at", { ascending: false })
    .limit(200);
  return data || [];
}
