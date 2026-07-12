import { supabaseAdmin } from "@/lib/supabase";

// Relatório de Conduta Profissional — obrigatório em todo Atendimento
// Jurídico Simulado encerrado. Deriva do resultado do Final Evaluator já
// gerado (não faz uma segunda chamada à IA sobre a mesma conversa) e fica
// disponível para o Supervisor Jurídico e o Professor Orientador vinculados
// ao aluno (quando existirem).

const REPORT_TYPE = "RADAR_SIMULATED_PROFESSIONAL_CONDUCT_REPORT";

const REPORT_FIELDS =
  "id, report_type, oraculo_id, academic_case_id, interview_id, summary, professional_expertise_summary, transparency_summary, ethics_summary, strengths, improvement_points, attention_points, specialty_focus_score, transparency_score, ethics_knowledge_score, overall_score, status, viewed_by_supervisor_at, viewed_by_orientador_at, generated_at, created_at";

function rowFromEvaluation({ interview, evaluationRow, context }) {
  const supervisorAuthUserId =
    (context?.supervisors || []).find((s) => s.tipo === "PADRINHO" && s.advogadoUserId)
      ?.advogadoUserId || null;
  const orientadorAuthUserId = context?.orientator?.authUserId || null;

  return {
    report_type: REPORT_TYPE,
    interview_id: interview.id,
    academic_case_id: interview.academic_case_id || null,
    oraculo_id: interview.oraculo_id,
    student_program_link_id: interview.student_program_link_id || null,
    instituicao_id: interview.instituicao_id || null,
    programa_id: interview.programa_id || null,
    supervisor_auth_user_id: supervisorAuthUserId,
    orientador_auth_user_id: orientadorAuthUserId,
    summary: evaluationRow.summary || null,
    professional_expertise_summary: evaluationRow.specialty_focus_feedback || null,
    transparency_summary: evaluationRow.first_consultation_transparency_feedback || null,
    ethics_summary: evaluationRow.ethics_and_knowledge_feedback || null,
    strengths: evaluationRow.strengths || [],
    improvement_points: evaluationRow.development_points || [],
    attention_points: evaluationRow.critical_flags || [],
    specialty_focus_score: evaluationRow.specialty_focus_score,
    transparency_score: evaluationRow.first_consultation_transparency_score,
    ethics_knowledge_score: evaluationRow.ethics_and_knowledge_score,
    overall_score: evaluationRow.overall_score,
    status: "GENERATED",
    model: evaluationRow.model,
    model_snapshot: evaluationRow.model_snapshot,
    prompt_version: evaluationRow.prompt_version,
    schema_version: evaluationRow.schema_version,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Gera (ou reprocessa, idempotente por interview_id+report_type) o
 * Relatório de Conduta Profissional do atendimento. Nunca lança.
 */
export async function generateAndSaveRadarConductReport({ interview, evaluationRow, context }) {
  if (!supabaseAdmin || !interview || !evaluationRow) return null;
  const { data, error } = await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .upsert([rowFromEvaluation({ interview, evaluationRow, context })], {
      onConflict: "interview_id,report_type",
    })
    .select("*")
    .single();
  if (error) {
    console.error("[ProfessionalConductReport] Falha ao salvar:", error.message);
    return null;
  }
  return data;
}

async function withStudentNames(reports) {
  if (!reports?.length) return [];
  const oraculoIds = [...new Set(reports.map((r) => r.oraculo_id))];
  const { data: students } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id, name")
    .in("id", oraculoIds);
  const nameById = new Map((students || []).map((s) => [s.id, s.name]));
  return reports.map((r) => ({ ...r, studentName: nameById.get(r.oraculo_id) || "Estudante" }));
}

export async function countUnviewedConductReportsForSupervisor({ authUserId }) {
  if (!supabaseAdmin || !authUserId) return 0;
  const { count } = await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .select("id", { count: "exact", head: true })
    .eq("supervisor_auth_user_id", authUserId)
    .is("viewed_by_supervisor_at", null);
  return count || 0;
}

export async function countUnviewedConductReportsForOrientador({ authUserId }) {
  if (!supabaseAdmin || !authUserId) return 0;
  const { count } = await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .select("id", { count: "exact", head: true })
    .eq("orientador_auth_user_id", authUserId)
    .is("viewed_by_orientador_at", null);
  return count || 0;
}

export async function listSupervisorConductReports({ authUserId, limit = 100 }) {
  if (!supabaseAdmin || !authUserId) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .select(REPORT_FIELDS)
    .eq("supervisor_auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return withStudentNames(data || []);
}

export async function getSupervisorConductReport({ authUserId, id }) {
  if (!supabaseAdmin || !authUserId) return null;
  const { data } = await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .select(REPORT_FIELDS)
    .eq("id", id)
    .eq("supervisor_auth_user_id", authUserId)
    .maybeSingle();
  if (!data) return null;
  const [report] = await withStudentNames([data]);
  return report;
}

export async function markConductReportViewedBySupervisor({ authUserId, id }) {
  if (!supabaseAdmin || !authUserId) return;
  await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .update({ viewed_by_supervisor_at: new Date().toISOString() })
    .eq("id", id)
    .eq("supervisor_auth_user_id", authUserId)
    .is("viewed_by_supervisor_at", null);
}

export async function listOrientadorConductReports({ authUserId, limit = 100 }) {
  if (!supabaseAdmin || !authUserId) return [];
  const { data } = await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .select(REPORT_FIELDS)
    .eq("orientador_auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return withStudentNames(data || []);
}

export async function getOrientadorConductReport({ authUserId, id }) {
  if (!supabaseAdmin || !authUserId) return null;
  const { data } = await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .select(REPORT_FIELDS)
    .eq("id", id)
    .eq("orientador_auth_user_id", authUserId)
    .maybeSingle();
  if (!data) return null;
  const [report] = await withStudentNames([data]);
  return report;
}

export async function markConductReportViewedByOrientador({ authUserId, id }) {
  if (!supabaseAdmin || !authUserId) return;
  await supabaseAdmin
    .from("oraculo_professional_conduct_reports")
    .update({ viewed_by_orientador_at: new Date().toISOString() })
    .eq("id", id)
    .eq("orientador_auth_user_id", authUserId)
    .is("viewed_by_orientador_at", null);
}
