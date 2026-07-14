"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  applyCouponToPrice,
  BILLING_CYCLES,
  calculateAnnualSavings,
  getActiveLawyerPlan,
  getIntroPromotionCoupon,
  isIntroPromotionEligible,
  LAWYER_PLANS,
} from "./planCatalog";
import {
  isRsLawyer,
  applyRsDiscountValue,
  rsRateFor,
  RS_DISCOUNT_LABELS,
} from "@/lib/lawyerDiscount";

// Links de assinatura recorrente hospedados na InfinitePay (auto-débito). NÃO
// têm webhook — o administrador dá baixa manual em /dashboard/admin/advogados.
// Usados quando o advogado renova (mensal, já usou a promo de 1º mês) ou compra
// o ciclo anual. Promo de 1º mês e avulso continuam via API (com webhook).
const HOSTED_SUBSCRIPTION = {
  START_MONTHLY: "https://invoice.infinitepay.io/plans/plataforma-social/on4FAZawRE",
  START_ANNUAL: "https://invoice.infinitepay.io/plans/plataforma-social/LFlFfOViE9",
  PRO_MONTHLY: "https://invoice.infinitepay.io/plans/plataforma-social/tkDa1iSpch",
  PRO_ANNUAL: "https://invoice.infinitepay.io/plans/plataforma-social/nrJhBb2yJQ",
};

function normalizeCouponResponse(data, fallbackCode, promotional = false) {
  const code = String(data?.codigo || fallbackCode || "")
    .trim()
    .toUpperCase();
  const id = data?.cupom_id || data?.internal_coupon_id || data?.id || null;

  if (!id) {
    throw new Error("A validação não retornou o identificador interno do cupom.");
  }

  return {
    status: "success",
    id,
    code,
    percent_off:
      data?.desconto_tipo === "PERCENTUAL"
        ? Number(data?.valor || 0)
        : Number(data?.percent_off || 0),
    amount_off:
      data?.desconto_tipo === "FIXO"
        ? Number(data?.valor || 0) * 100
        : Number(data?.amount_off || 0),
    stripe_coupon_id: null,
    promotional,
  };
}

async function validateCouponCode(code, promotional = false) {
  const response = await fetch("/api/checkout/validate-coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      codigo: code,
      tipo: "PLANO_PRO",
    }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    throw new Error(
      data?.message || data?.error || "Cupom inválido ou indisponível.",
    );
  }

  return normalizeCouponResponse(data, code, promotional);
}

function hasExpectedIntroPrice(plan, coupon) {
  const pricing = applyCouponToPrice(plan.prices.MONTHLY, "MONTHLY", coupon);
  const expected = plan.id === "PRO" ? 39.99 : 10.99;
  return Math.abs(pricing.total - expected) <= 0.01;
}

export function useLawyerPlans({ isOpen, profileData, onSelectPlan, onClose }) {
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [promotionCoupons, setPromotionCoupons] = useState({});
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [selectingPlan, setSelectingPlan] = useState(null);
  const profilePending = !profileData;

  useEffect(() => {
    if (!isOpen) return;
    setSelectingPlan(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !profileData) {
      setPromotionCoupons({});
      return undefined;
    }

    let cancelled = false;

    async function loadPromotions() {
      const entries = await Promise.all(
        Object.values(LAWYER_PLANS).map(async (plan) => {
          if (!isIntroPromotionEligible(plan.id, "MONTHLY", profileData)) {
            return [plan.id, null];
          }

          const preview = getIntroPromotionCoupon(plan.id);
          if (!preview?.code) return [plan.id, null];

          if (plan.id === "PRO") {
            return [plan.id, preview];
          }

          try {
            const validated = await validateCouponCode(preview.code, true);
            if (!hasExpectedIntroPrice(plan, validated)) {
              console.warn(
                `[LawyerPlans] Promoção ${preview.code} possui valor divergente.`,
              );
              return [plan.id, null];
            }
            return [plan.id, validated];
          } catch {
            return [plan.id, null];
          }
        }),
      );

      if (!cancelled) setPromotionCoupons(Object.fromEntries(entries));
    }

    void loadPromotions();
    return () => {
      cancelled = true;
    };
  }, [isOpen, profileData]);

  const activePlan = useMemo(
    () => getActiveLawyerPlan(profileData),
    [profileData],
  );

  const isRs = useMemo(() => isRsLawyer(profileData), [profileData]);

  const planCards = useMemo(
    () =>
      Object.values(LAWYER_PLANS).map((plan) => {
        const priceInfo = plan.prices[billingCycle];
        const promotionCoupon = promotionCoupons[plan.id] || null;
        const introEligible =
          !profilePending &&
          !coupon &&
          billingCycle === "MONTHLY" &&
          Boolean(promotionCoupon) &&
          isIntroPromotionEligible(plan.id, billingCycle, profileData);
        const previewCoupon = introEligible ? promotionCoupon : coupon;
        let pricing = applyCouponToPrice(priceInfo, billingCycle, previewCoupon);

        // Desconto de parceria OAB/RS: só quando a cobrança daquele caminho
        // realmente aplica o desconto (não empilha com promo/cupom). PRO
        // recorrente depende do link RS configurado por ambiente.
        let rsDiscount = null;
        const rsRate = rsRateFor(plan.id);
        // Desconto OAB/RS só no AVULSO (cobrado pela nossa API, que aplica o
        // desconto no servidor). Recorrente usa link hospedado com preço cheio,
        // então não exibimos RS nesses ciclos para não enganar o valor.
        const rsEligible =
          isRs &&
          rsRate > 0 &&
          !introEligible &&
          !coupon &&
          billingCycle === "AVULSO";
        if (rsEligible) {
          const rsTotal = applyRsDiscountValue(pricing.total, plan.id);
          pricing = {
            ...pricing,
            total: rsTotal,
            display: billingCycle === "ANNUAL" ? rsTotal / 12 : rsTotal,
          };
          rsDiscount = {
            rate: rsRate,
            rateLabel: RS_DISCOUNT_LABELS[plan.id],
            originalTotal: applyCouponToPrice(priceInfo, billingCycle, previewCoupon)
              .total,
          };
        }

        const isCurrent = activePlan === plan.id;
        const isDowngrade = activePlan === "PRO" && plan.id === "START";

        return {
          ...plan,
          billingCycle,
          priceInfo,
          pricing,
          rsDiscount,
          previewCoupon,
          introEligible,
          annualSavings: calculateAnnualSavings(plan),
          profilePending,
          isCurrent,
          isDowngrade,
          selectable: !profilePending && !isCurrent && !isDowngrade,
          // Preço é derivado no servidor (planType + ciclo) — não depende de priceId.
          configured: true,
        };
      }),
    [
      activePlan,
      billingCycle,
      coupon,
      isRs,
      profileData,
      profilePending,
      promotionCoupons,
    ],
  );

  const clearCoupon = useCallback(() => {
    setCoupon(null);
    setCouponCode("");
  }, []);

  const applyCoupon = useCallback(async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code || validatingCoupon || profilePending) return;

    setValidatingCoupon(true);
    try {
      const validatedCoupon = await validateCouponCode(code);
      setCoupon(validatedCoupon);
      toast.success("Cupom aplicado com sucesso.");
    } catch (error) {
      setCoupon(null);
      toast.error(error.message || "Não foi possível validar o cupom.");
    } finally {
      setValidatingCoupon(false);
    }
  }, [couponCode, profilePending, validatingCoupon]);

  const selectPlan = useCallback(
    async (planCard) => {
      if (profilePending || planCard?.profilePending) {
        toast("Aguarde o carregamento do seu perfil.");
        return;
      }

      if (!planCard?.configured || selectingPlan || !planCard?.selectable) {
        if (!planCard?.configured) {
          toast.error("Este plano ainda não possui um preço configurado.");
        } else if (planCard?.isCurrent) {
          toast("Este já é o seu plano ativo.");
        } else if (planCard?.isDowngrade) {
          toast.error("Para reduzir o plano, entre em contato com o suporte.");
        }
        return;
      }

      // Assinatura recorrente (renovação mensal já sem promo, ou anual): abre o
      // link hospedado da InfinitePay (auto-débito). Sem webhook — o admin dá
      // baixa manual. A promo de 1º mês (mensal) e o avulso seguem pela API.
      const isRecurring =
        billingCycle === "ANNUAL" ||
        (billingCycle === "MONTHLY" && !planCard.introEligible);

      if (isRecurring) {
        const hostedUrl = HOSTED_SUBSCRIPTION[`${planCard.id}_${billingCycle}`];
        if (!hostedUrl) {
          toast.error("Link de assinatura indisponível para este plano.");
          return;
        }
        window.open(hostedUrl, "_blank", "noopener,noreferrer");
        onClose?.();
        return;
      }

      // Promo de 1º mês (mensal) e avulso: link gerado pela nossa API, com
      // transação pendente e order_nsu — o webhook atribui e ativa o plano.
      setSelectingPlan(planCard.id);
      try {
        // Cupom do usuário (não empilha com promo de 1º mês).
        const checkoutCoupon = planCard.introEligible ? null : coupon;

        window.localStorage.setItem("sj_selected_plan_type", planCard.id);
        window.localStorage.setItem("sj_selected_billing", billingCycle);
        window.localStorage.setItem(
          "sj_selected_promo",
          planCard.introEligible ? "1" : "0",
        );
        window.localStorage.removeItem("sj_selected_addon_type");
        window.localStorage.removeItem("sj_selected_price_id");

        await onSelectPlan?.({
          planId: planCard.id,
          billingCycle,
          amount: planCard.pricing?.total,
          couponData: checkoutCoupon,
          juris: planCard.juris,
        });
      } catch (error) {
        console.error("[LawyerPlans] Falha ao selecionar plano:", error);
        toast.error(
          error.message || "Não foi possível preparar o checkout deste plano.",
        );
      } finally {
        setSelectingPlan(null);
      }
    },
    [billingCycle, coupon, onClose, onSelectPlan, profilePending, selectingPlan],
  );

  return {
    billingCycles: BILLING_CYCLES,
    billingCycle,
    setBillingCycle,
    couponCode,
    setCouponCode,
    coupon,
    clearCoupon,
    validatingCoupon,
    applyCoupon,
    planCards,
    selectingPlan,
    selectPlan,
  };
}
