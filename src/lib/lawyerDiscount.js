// Desconto de parceria OAB/RS.
//
// Advogados com OAB do Rio Grande do Sul (RS) recebem desconto automático nos
// planos: 10% no START, 15% no PRO. A elegibilidade é resolvida SEMPRE no
// servidor a partir do perfil gravado (advogados.estado / advogados.oab), nunca
// a partir do frontend.

export const RS_DISCOUNT_RATES = { START: 0.1, PRO: 0.15 };

// Rótulos para exibição (marketing/UI).
export const RS_DISCOUNT_LABELS = { START: "10%", PRO: "15%" };

/**
 * Advogado é do RS? Considera o UF do cadastro (advogados.estado) e, por
 * redundância, o prefixo da OAB normalizada ("RS 12345").
 */
export function isRsLawyer(profile) {
  if (!profile) return false;
  const estado = String(profile.estado || "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
  if (estado === "RS") return true;
  const oab = String(profile.oab || "").trim().toUpperCase();
  return /^RS\b/.test(oab);
}

export function rsRateFor(planType) {
  return RS_DISCOUNT_RATES[String(planType || "").toUpperCase()] || 0;
}

/**
 * Aplica o desconto RS a um valor em CENTAVOS (usado na cobrança/webhook).
 * Retorna o valor original quando não há desconto para o plano.
 */
export function applyRsDiscountCents(baseCents, planType) {
  const rate = rsRateFor(planType);
  if (!rate) return baseCents;
  return Math.round(Number(baseCents || 0) * (1 - rate));
}

/**
 * Aplica o desconto RS a um valor em REAIS (usado na exibição).
 */
export function applyRsDiscountValue(baseValue, planType) {
  const rate = rsRateFor(planType);
  if (!rate) return Number(baseValue || 0);
  return Math.round(Number(baseValue || 0) * (1 - rate) * 100) / 100;
}
