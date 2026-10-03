import { supabaseAdmin as db } from "@/lib/supabase";
import { checkoutError } from "./hybridPayment";
import { loadHybridCheckout, openHybridCheckout, cancelHybridCheckout } from "./hybridCheckoutServer";
import {
  PROMO_INVEST_TYPE, PROMO_INVEST_MAX_PURCHASES, PROMO_INVEST_MIN_CENTS, PROMO_INVEST_MAX_CENTS,
  parsePromoInvestCents, buildPromoInvestProduct, hasActiveLawyerPlan, promoInvestEnabled,
} from "./promoInvest";

const TABLE = "billing_checkouts";
const uuid = (value) => /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value || "");
const brl = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const ACTIVE_SUBSCRIPTION = new Set(["ACTIVE", "PAST_DUE", "TRIALING", "AUTHORIZED", "PENDING"]);

export { promoInvestEnabled };

async function countPaidPromoPurchases(userId) {
  const { count, error } = await db.from(TABLE).select("id", { count: "exact", head: true })
    .eq("advogado_id", userId).eq("status", "paid").eq("product->>type", PROMO_INVEST_TYPE);
  if (error) throw checkoutError("Não foi possível consultar a promoção.", 503);
  return count || 0;
}

async function openPromoCheckout(userId) {
  const { data, error } = await db.from(TABLE).select("*").eq("advogado_id", userId)
    .in("status", ["creating", "pending"]).eq("product->>type", PROMO_INVEST_TYPE).limit(1);
  if (error) throw checkoutError("Não foi possível consultar a promoção.", 503);
  return data?.[0] || null;
}

// Uma assinatura recorrente ativa não pode ser substituída por um Pix avulso:
// a cobrança automática continuaria correndo em paralelo.
export function promoInvestBlockReason(profile, paidCount) {
  if (profile?.oab_verification_status === "ERROR") return "Acesso restrito devido a pendências na OAB.";
  if (paidCount >= PROMO_INVEST_MAX_PURCHASES) {
    return `Você já aproveitou os ${PROMO_INVEST_MAX_PURCHASES} meses da promoção. A partir de agora o plano PRO segue o valor normal.`;
  }
  if (hasActiveLawyerPlan(profile)) {
    return "Você já tem um plano ativo. A promoção é para quem está sem plano; após o vencimento você poderá usá-la.";
  }
  const status = String(profile?.subscription_status || "").toUpperCase();
  const cycle = String(profile?.plan_billing_cycle || "").toUpperCase();
  if (profile?.stripe_subscription_id && ["MONTHLY", "ANNUAL"].includes(cycle) && ACTIVE_SUBSCRIPTION.has(status)) {
    return "Você tem uma assinatura recorrente ativa. A promoção é exclusiva para pagamentos avulsos via Pix.";
  }
  return null;
}

async function loadProfile(userId) {
  const { data, error } = await db.from("advogados")
    .select("id, email, oab_verification_status, subscription_status, plan_type, plan_billing_cycle, is_premium, premium_expires_at, stripe_subscription_id")
    .eq("id", userId).maybeSingle();
  if (error || !data) throw checkoutError("Perfil não localizado.", 404);
  return data;
}

export async function promoInvestEligibility(user) {
  if (!promoInvestEnabled()) return { enabled: false, eligible: false };
  const profile = await loadProfile(user.id);
  const paidCount = await countPaidPromoPurchases(user.id);
  const reason = promoInvestBlockReason(profile, paidCount);
  const open = await openPromoCheckout(user.id);
  return {
    enabled: true,
    eligible: !reason,
    reason,
    purchasesUsed: paidCount,
    purchasesLeft: Math.max(0, PROMO_INVEST_MAX_PURCHASES - paidCount),
    minCents: PROMO_INVEST_MIN_CENTS,
    maxCents: PROMO_INVEST_MAX_CENTS,
    openCheckout: open ? { id: open.id, amount: open.product.priceInCents } : null,
  };
}

export async function createPromoInvestCheckout(user, body) {
  if (!promoInvestEnabled()) throw checkoutError("A promoção foi encerrada.", 410);
  if (!uuid(body.requestId)) throw checkoutError("Identificador da tentativa inválido.", 400);
  const existing = await loadHybridCheckout(body.requestId, user.id);
  if (existing) return openHybridCheckout(existing);

  const cents = parsePromoInvestCents(body.amount);
  if (!cents) {
    throw checkoutError(`Informe um valor entre ${brl(PROMO_INVEST_MIN_CENTS)} e ${brl(PROMO_INVEST_MAX_CENTS)}.`, 400);
  }

  if (body.replaceCheckoutId) {
    if (!uuid(body.replaceCheckoutId)) throw checkoutError("Tentativa anterior inválida.", 400);
    const previous = await loadHybridCheckout(body.replaceCheckoutId, user.id);
    if (!previous || previous.product?.type !== PROMO_INVEST_TYPE) throw checkoutError("Tentativa anterior não localizada.", 404);
    if (!["expired", "cancelled", "canceled"].includes(previous.status)) await cancelHybridCheckout(previous);
  }

  const profile = await loadProfile(user.id);
  const paidCount = await countPaidPromoPurchases(user.id);
  const reason = promoInvestBlockReason(profile, paidCount);
  if (reason) throw checkoutError(reason, 409);

  const row = {
    id: body.requestId, advogado_id: user.id, method: "pix",
    product: buildPromoInvestProduct(cents, paidCount + 1),
    payer_email: String(profile.email || user.email || "").trim().toLowerCase(),
    previous_subscription_id: null,
  };
  const { data, error } = await db.from(TABLE).insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const concurrent = await loadHybridCheckout(body.requestId, user.id);
      if (concurrent) return openHybridCheckout(concurrent);
      const open = await openPromoCheckout(user.id);
      if (open) {
        throw Object.assign(checkoutError("Você já tem um Pix da promoção em aberto. Encerre-o para gerar outro com o novo valor.", 409),
          { code: "CHECKOUT_OPEN", previousCheckout: { id: open.id, amount: open.product.priceInCents } });
      }
      throw checkoutError("A tentativa foi atualizada. Tente novamente.", 409);
    }
    throw checkoutError("Não foi possível registrar a tentativa de pagamento.", 503);
  }
  return openHybridCheckout(data);
}
