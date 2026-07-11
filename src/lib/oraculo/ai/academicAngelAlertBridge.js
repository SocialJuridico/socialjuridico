import { supabaseAdmin } from "@/lib/supabase";

// Ponte entre o Conduct Guard (Anjo) e o Dashboard do Supervisor: quando uma
// mensagem é bloqueada por risco HIGH/CRITICAL, cria o alerta persistente.
// Nunca lança: falha aqui não pode quebrar o bloqueio da mensagem em si.

export async function recordConductAlert({ context, interview, conduct }) {
  if (!supabaseAdmin || !context?.oraculoId || !interview) return;
  if (conduct?.riskLevel !== "HIGH" && conduct?.riskLevel !== "CRITICAL") return;

  try {
    // Supervisor Jurídico não tem vínculo institucional — só recebe o
    // alerta se já tiver ativado o serviço na própria conta (advogado_user_id).
    const padrinho = (context.supervisors || []).find(
      (s) => s.tipo === "PADRINHO" && s.advogadoUserId,
    );

    await supabaseAdmin.from("oraculo_ai_alerts").insert([
      {
        alert_type: conduct.flags?.[0] || "OTHER",
        risk_level: conduct.riskLevel,
        oraculo_id: context.oraculoId,
        student_program_link_id: context.studentProgramLinkId || null,
        instituicao_id: context.institutionId || null,
        programa_id: context.programId || null,
        academic_case_id: interview.academic_case_id || null,
        interview_id: interview.id,
        target_auth_user_id: padrinho?.advogadoUserId || null,
        flags: conduct.flags || [],
        problematic_excerpt: conduct.excerpt ? String(conduct.excerpt).slice(0, 1000) : null,
        ai_action_taken: conduct.action || null,
      },
    ]);
  } catch (error) {
    console.error("[AcademicAngelAlertBridge] Falha ao registrar alerta:", error?.message);
  }
}
