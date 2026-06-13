export const CRM_AI_CAPTURE_LIMITS = Object.freeze({
  FREE: 0,
  START: 10,
  PRO: 200,
});

export const CRM_AI_CAPTURE_JURIS_COST = Object.freeze({
  FREE: 0,
  START: 3,
  PRO: 0,
});

export function getCrmAiCapturePolicy(access, now = new Date()) {
  const planType = String(access?.planType || "FREE").toUpperCase();
  const currentPeriod = now.toISOString().slice(0, 7);
  const storedPeriod = String(access?.profile?.crm_ia_periodo || "").slice(0, 7);
  const used =
    storedPeriod === currentPeriod
      ? Number(access?.profile?.uso_crm_ia || 0)
      : 0;
  const limit = CRM_AI_CAPTURE_LIMITS[planType] || 0;
  const jurisCost = CRM_AI_CAPTURE_JURIS_COST[planType] || 0;
  const balance = Number(access?.profile?.balance || 0);
  const remaining = Math.max(limit - used, 0);

  return {
    planType,
    used,
    limit,
    remaining,
    jurisCost,
    balance,
    monthly: true,
    canUse:
      limit > 0 &&
      remaining > 0 &&
      (jurisCost === 0 || balance >= jurisCost),
    limitReached: limit > 0 && remaining === 0,
    insufficientJuris: jurisCost > 0 && balance < jurisCost,
  };
}
