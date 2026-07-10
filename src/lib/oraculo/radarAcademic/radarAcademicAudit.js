import { supabaseAdmin } from "@/lib/supabase";

/**
 * Registra um evento de auditoria do Oráculo (estudante). Nunca lança.
 */
export async function recordOraculoAudit({
  oraculoId,
  academicCaseId = null,
  interviewId = null,
  eventType,
  metadata = {},
}) {
  if (!supabaseAdmin || !eventType) return;
  try {
    await supabaseAdmin.from("oraculo_eventos_auditoria").insert([
      {
        oraculo_id: oraculoId || null,
        academic_case_id: academicCaseId,
        interview_id: interviewId,
        event_type: eventType,
        metadata,
      },
    ]);
  } catch (error) {
    console.error("[RadarAcademic/Audit] Falha ao registrar evento:", error?.message);
  }
}
