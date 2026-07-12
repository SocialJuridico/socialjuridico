import { supabaseAdmin } from "@/lib/supabase";

// Persistência da avaliação final (3 eixos) do Atendimento Jurídico
// Simulado. Um registro por interview_id — reprocessar (endSimulatedInterview
// já é idempotente por status COMPLETED) não duplica linha.

function rowFromEvaluation({ interview, evaluation }) {
  const d = evaluation.data;
  return {
    interview_id: interview.id,
    academic_case_id: interview.academic_case_id || null,
    oraculo_id: interview.oraculo_id,
    student_program_link_id: interview.student_program_link_id || null,
    instituicao_id: interview.instituicao_id || null,
    programa_id: interview.programa_id || null,
    specialty_focus_score: d.specialty_focus.score,
    specialty_focus_level: d.specialty_focus.level,
    specialty_focus_feedback: d.specialty_focus.feedback || null,
    first_consultation_transparency_score: d.first_consultation_transparency.score,
    first_consultation_transparency_level: d.first_consultation_transparency.level,
    first_consultation_transparency_feedback: d.first_consultation_transparency.feedback || null,
    ethics_and_knowledge_score: d.ethics_and_knowledge.score,
    ethics_and_knowledge_level: d.ethics_and_knowledge.level,
    ethics_and_knowledge_feedback: d.ethics_and_knowledge.feedback || null,
    overall_score: d.overall_score,
    summary: d.summary || null,
    strengths: d.strengths || [],
    development_points: d.development_points || [],
    critical_flags: d.critical_flags || [],
    model: evaluation.usage?.model || null,
    model_snapshot: evaluation.usage?.model || null,
    prompt_version: evaluation.promptVersion,
    schema_version: evaluation.schemaVersion,
  };
}

/**
 * Salva a avaliação final (upsert por interview_id — idempotente).
 */
export async function saveProfessionalSimulationEvaluation({ interview, evaluation }) {
  if (!supabaseAdmin || !interview || !evaluation?.ok) return null;
  const { data, error } = await supabaseAdmin
    .from("oraculo_professional_simulation_evaluations")
    .upsert([rowFromEvaluation({ interview, evaluation })], { onConflict: "interview_id" })
    .select("*")
    .single();
  if (error) {
    console.error("[ProfessionalSimulationEvaluation] Falha ao salvar:", error.message);
    return null;
  }
  return data;
}

export async function getProfessionalSimulationEvaluation({ interviewId, oraculoId }) {
  if (!supabaseAdmin || !interviewId || !oraculoId) return null;
  const { data } = await supabaseAdmin
    .from("oraculo_professional_simulation_evaluations")
    .select("*")
    .eq("interview_id", interviewId)
    .eq("oraculo_id", oraculoId)
    .maybeSingle();
  return data || null;
}

/**
 * Última avaliação concluída do estudante (para o card "Última avaliação"
 * da home).
 */
export async function getLastProfessionalSimulationEvaluation({ oraculoId }) {
  if (!supabaseAdmin || !oraculoId) return null;
  const { data } = await supabaseAdmin
    .from("oraculo_professional_simulation_evaluations")
    .select("overall_score, created_at")
    .eq("oraculo_id", oraculoId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}
