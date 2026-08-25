const PAID_PLAN_TYPES = new Set(["START", "PRO"]);

export function profileHasPlanHistory(profile) {
  if (!profile) return false;

  if (profile.has_plan_history === true) return true;
  if (Boolean(profile.promo_start_used) || Boolean(profile.promo_pro_used)) {
    return true;
  }

  return PAID_PLAN_TYPES.has(
    String(profile.plan_type || "")
      .trim()
      .toUpperCase(),
  );
}

export function isFirstPlanPromotionEligible(profile, billingCycle) {
  return (
    String(billingCycle || "").trim().toUpperCase() === "MONTHLY" &&
    !profileHasPlanHistory(profile)
  );
}
