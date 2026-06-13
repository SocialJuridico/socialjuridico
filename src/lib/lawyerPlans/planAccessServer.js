const ACTIVE_PLAN_TYPES = new Set(["START", "PRO"]);
const BLOCKED_SUBSCRIPTION_STATUSES = new Set([
  "CANCELED",
  "CANCELLED",
  "UNPAID",
  "BLOCKED",
]);

export function normalizeLawyerPlanType(value) {
  const planType = String(value || "").trim().toUpperCase();
  return ACTIVE_PLAN_TYPES.has(planType) ? planType : null;
}

export function getActiveLawyerPlanFromProfile(profile) {
  const planType = normalizeLawyerPlanType(profile?.plan_type);
  if (!planType) return null;

  const status = String(profile?.subscription_status || "")
    .trim()
    .toUpperCase();
  if (BLOCKED_SUBSCRIPTION_STATUSES.has(status)) return null;

  return planType;
}

export function assertLawyerPlanPurchaseAllowed(profile, requestedPlan) {
  const targetPlan = normalizeLawyerPlanType(requestedPlan);
  if (!targetPlan) {
    const error = new Error("Plano solicitado é inválido.");
    error.status = 400;
    throw error;
  }

  const activePlan = getActiveLawyerPlanFromProfile(profile);
  if (activePlan === targetPlan) {
    const error = new Error("Este plano já está ativo na sua conta.");
    error.status = 409;
    throw error;
  }

  if (activePlan === "PRO" && targetPlan === "START") {
    const error = new Error(
      "A redução de plano deve ser solicitada ao suporte para evitar cobrança duplicada.",
    );
    error.status = 409;
    throw error;
  }

  return {
    activePlan,
    targetPlan,
    isUpgrade: activePlan === "START" && targetPlan === "PRO",
  };
}
