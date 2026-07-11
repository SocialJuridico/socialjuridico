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

// Links hospedados InfinitePay com desconto OAB/RS para o PRO recorrente
// (mensal/anual). Só entram em uso quando configurados no ambiente; sem eles o
// PRO recorrente não recebe o desconto automático (limitação dos links fixos).
const PRO_RS_HOSTED = {
  MONTHLY: process.env.NEXT_PUBLIC_INFINITEPAY_PRO_MENSAL_RS_URL || "",
  ANNUAL: process.env.NEXT_PUBLIC_INFINITEPAY_PRO_ANUAL_RS_URL || "",
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
        let rsEligible = isRs && rsRate > 0 && !introEligible && !coupon;
        if (
          rsEligible &&
          plan.id === "PRO" &&
          (billingCycle === "MONTHLY" || billingCycle === "ANNUAL")
        ) {
          rsEligible = Boolean(PRO_RS_HOSTED[billingCycle]);
        }
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
          configured: Boolean(priceInfo?.priceId),
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

      if (planCard.id === "PRO") {
        // Assinaturas recorrentes hospedadas na InfinitePay (mensal-renovação e
        // anual): mantêm o link estático até a migração para a conta PJ, pois o
        // webhook dessas assinaturas ainda não devolve a identificação do
        // assinante. Compra não é atribuída automaticamente nesses casos.
        const hostedSubscriptionUrl =
          billingCycle === "ANNUAL"
            ? (isRs && PRO_RS_HOSTED.ANNUAL) ||
              "https://invoice.infinitepay.io/plans/plataforma-social/nrJhBb2yJQ"
            : billingCycle === "MONTHLY" && !planCard.introEligible
              ? (isRs && PRO_RS_HOSTED.MONTHLY) ||
                "https://invoice.infinitepay.io/plans/plataforma-social/tkDa1iSpch"
              : "";

        if (hostedSubscriptionUrl) {
          window.open(hostedSubscriptionUrl, "_blank", "noopener,noreferrer");
          onClose?.();
          return;
        }

        // Compras únicas (avulso e 1º mês promocional): link gerado pela nossa
        // API com order_nsu = sj_<userId>, para o webhook identificar o advogado
        // e ativar o plano automaticamente.
        setSelectingPlan(planCard.id);
        try {
          const response = await fetch("/api/checkout/infinitepay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planType: "PRO",
              billingCycle,
              isPromoEligible: Boolean(planCard.introEligible),
            }),
          });

          const data = await response.json().catch(() => null);
          if (!response.ok || !data?.success || !data?.url) {
            throw new Error(
              data?.message || "Não foi possível gerar o link de pagamento.",
            );
          }

          window.open(data.url, "_blank", "noopener,noreferrer");
          onClose?.();
        } catch (error) {
          console.error("[LawyerPlans] Falha ao iniciar checkout PRO:", error);
          toast.error(
            error.message || "Não foi possível iniciar o pagamento.",
          );
        } finally {
          setSelectingPlan(null);
        }
        return;
      }

      setSelectingPlan(planCard.id);
      try {
        let checkoutCoupon = coupon;
        if (planCard.introEligible) {
          const promotionCode = planCard.previewCoupon?.code;
          if (!promotionCode) {
            throw new Error("A promoção deste plano está indisponível.");
          }

          checkoutCoupon = await validateCouponCode(promotionCode, true);
        }

        const checkoutPricing = applyCouponToPrice(
          planCard.priceInfo,
          billingCycle,
          checkoutCoupon,
        );

        if (checkoutPricing.total < 0.5) {
          throw new Error(
            "O desconto deixa o valor abaixo do mínimo permitido para cobrança.",
          );
        }

        if (
          planCard.introEligible &&
          Math.abs(checkoutPricing.total - 10.99) > 0.01
        ) {
          throw new Error(
            "A promoção de primeiro mês está com valor divergente. Tente novamente mais tarde.",
          );
        }

        window.localStorage.setItem(
          "sj_selected_price_id",
          planCard.priceInfo.priceId,
        );
        window.localStorage.setItem("sj_selected_plan_type", planCard.id);
        window.localStorage.setItem("sj_selected_billing", billingCycle);
        window.localStorage.removeItem("sj_selected_addon_type");

        await onSelectPlan?.({
          planId: planCard.id,
          billingCycle,
          priceId: planCard.priceInfo.priceId,
          amount: checkoutPricing.total,
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
    [
      billingCycle,
      coupon,
      isRs,
      onSelectPlan,
      onClose,
      profilePending,
      selectingPlan,
    ],
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
