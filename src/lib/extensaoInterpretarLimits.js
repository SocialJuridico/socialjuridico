import { getEffectivePlanType } from "@/lib/planUtils";

// Cota gratuita mensal do módulo "Interpretar com Social Jurídico" (extensão).
// Independente do redator_ia — feature nova, contador próprio (uso_interpretar_ia_extensao).
// Zerada a cota grátis, o consumo passa para a carteira de créditos comprados
// (saldo_creditos_ia_extensao), vendida em pacotes na plataforma.
const FREE_QUOTA_BY_PLAN = {
  FREE: 0,
  START: 2,
  PRO: 10,
  ENTERPRISE_START: 10,
  ENTERPRISE_PRO: 10,
  ENTERPRISE_PRO_PLUS: 10,
};

export function getInterpretarFreeQuota(planType) {
  return FREE_QUOTA_BY_PLAN[String(planType || "FREE").toUpperCase()] ?? 0;
}

/** Período mensal corrente no fuso do Brasil, ex.: "2026-07". */
export function currentInterpretarPeriod(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

/**
 * Disponibilidade completa a partir do perfil (linha de advogados ou payload
 * do /api/perfil). Puro — usável no servidor e no cliente. O reset mensal é
 * "preguiçoso": se o período gravado não é o corrente, o uso conta como zero.
 */
export function getInterpretarAvailability(profile = {}) {
  const planType = getEffectivePlanType(profile);
  const limit = getInterpretarFreeQuota(planType);
  const period = currentInterpretarPeriod();
  const used =
    profile.interpretar_ia_periodo === period
      ? Number(profile.uso_interpretar_ia_extensao || 0)
      : 0;
  const remaining = Math.max(limit - used, 0);
  const walletBalance = Number(profile.saldo_creditos_ia_extensao || 0);

  return {
    planType,
    period,
    quota: { used, limit, remaining },
    wallet: { available: walletBalance > 0, balance: walletBalance },
    total: remaining + walletBalance,
  };
}
