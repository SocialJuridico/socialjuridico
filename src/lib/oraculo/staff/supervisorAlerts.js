import { supabaseAdmin } from "@/lib/supabase";

// Alertas do Anjo Acadêmico para o Supervisor Jurídico. Escopado sempre por
// target_auth_user_id (Supervisor não tem instituição — ver
// oraculo/staff/supervisorContext.js). Auditoria fica só no console: não há
// trilha institucional pra um supervisor sem vínculo com instituição.

const ALERT_FIELDS =
  "id, alert_type, risk_level, oraculo_id, academic_case_id, interview_id, flags, problematic_excerpt, ai_action_taken, status, reviewed_at, review_comment, student_orientation, created_at";

export async function listSupervisorAlerts({ authUserId, status = null, limit = 100 }) {
  if (!supabaseAdmin || !authUserId) return [];
  let query = supabaseAdmin
    .from("oraculo_ai_alerts")
    .select(ALERT_FIELDS)
    .eq("target_auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (status) query = query.eq("status", status);

  const { data: alerts } = await query;
  if (!alerts?.length) return [];

  const oraculoIds = [...new Set(alerts.map((a) => a.oraculo_id))];
  const { data: students } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id, name")
    .in("id", oraculoIds);
  const nameById = new Map((students || []).map((s) => [s.id, s.name]));

  return alerts.map((a) => ({ ...a, studentName: nameById.get(a.oraculo_id) || "Estudante" }));
}

export async function countPendingAlerts({ authUserId }) {
  if (!supabaseAdmin || !authUserId) return 0;
  const { count } = await supabaseAdmin
    .from("oraculo_ai_alerts")
    .select("id", { count: "exact", head: true })
    .eq("target_auth_user_id", authUserId)
    .eq("status", "PENDING");
  return count || 0;
}

export async function getSupervisorAlert({ authUserId, id }) {
  if (!supabaseAdmin || !authUserId) return null;
  const { data: alert } = await supabaseAdmin
    .from("oraculo_ai_alerts")
    .select(ALERT_FIELDS)
    .eq("id", id)
    .eq("target_auth_user_id", authUserId)
    .maybeSingle();
  if (!alert) return null;

  const { data: student } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id, name, email, curso")
    .eq("id", alert.oraculo_id)
    .maybeSingle();

  return { alert, student };
}

const VALID_DECISIONS = ["CONFIRMED", "FALSE_POSITIVE", "ESCALATED"];

/**
 * Registra a decisão do supervisor sobre o alerta. Nunca confia no id do
 * alerta sem validar que foi endereçado a este supervisor.
 */
export async function reviewSupervisorAlert({ authUserId, id, decision, comment, studentOrientation }) {
  if (!supabaseAdmin) return { ok: false, code: "SERVICE_UNAVAILABLE" };
  if (!VALID_DECISIONS.includes(decision)) return { ok: false, code: "INVALID_DECISION" };

  const { data: existing } = await supabaseAdmin
    .from("oraculo_ai_alerts")
    .select("id")
    .eq("id", id)
    .eq("target_auth_user_id", authUserId)
    .maybeSingle();
  if (!existing) return { ok: false, code: "NOT_FOUND" };

  const { data, error } = await supabaseAdmin
    .from("oraculo_ai_alerts")
    .update({
      status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by_auth_user_id: authUserId,
      review_comment: comment ? String(comment).slice(0, 2000) : null,
      student_orientation: studentOrientation ? String(studentOrientation).slice(0, 2000) : null,
    })
    .eq("id", id)
    .select("id")
    .single();
  if (error) return { ok: false, code: "SAVE_FAILED" };

  return { ok: true, id: data.id };
}
