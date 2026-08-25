import { profileHasPlanHistory } from "@/lib/billing/planEligibility";

const CONFIRMED_PLAN_STATUSES = new Set([
  "succeeded",
  "paid",
  "complete",
  "completed",
  "subscription_active",
  "active",
]);

export async function hasLawyerPlanHistory(db, lawyerId, profile = null) {
  if (profileHasPlanHistory(profile)) return true;
  if (!db || !lawyerId) return false;

  const { data, error } = await db
    .from("transacoes")
    .select("id, status")
    .eq("advogado_id", lawyerId)
    .eq("tipo", "PRO_SUBSCRIPTION")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Falha ao consultar histórico de planos: ${error.message}`);
  }

  return (data || []).some((transaction) =>
    CONFIRMED_PLAN_STATUSES.has(
      String(transaction.status || "")
        .trim()
        .toLowerCase(),
    ),
  );
}

export async function attachLawyerPlanHistory(db, profile) {
  if (!profile || profile.role !== "LAWYER") return profile;

  profile.has_plan_history = await hasLawyerPlanHistory(db, profile.id, profile);
  return profile;
}
