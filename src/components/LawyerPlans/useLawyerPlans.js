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

export function useLawyerPlans({ isOpen, profileData, onSelectPlan }) {
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
      const entries = Object.values(LAWYER_PLANS).map((plan) => {
        if (!isIntroPromotionEligible(plan.id, "MONTHLY", profileData)) {
          return [plan.id, null];
        }
        return [plan.id, getIntroPromotionCoupon(plan.id)];
      });

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
          billingCycle === "MONTHLY" &&
          Boolean(promotionCoupon) &&
          isIntroPromotionEligible(plan.id, billingCycle, profileData);

        // Cupons comerciais continuam de uso único, portanto são aplicados no
        // plano avulso. Recorrência é cobrada pelo Mercado Pago sem transformar
        // um cupom pontual em desconto permanente.
        const userCoupon = billingCycle === "AVULSO" ? coupon : null;
        const previewCoupon = introEligible ? promotionCoupon : userCoupon;
        let pricing = applyCouponToPrice(priceInfo, billingCycle, previewCoupon);

        let rsDiscount = null;
        const rsRate = rsRateFor(plan.id);
        const rsEligible =
          isRs && rsRate > 0 && !introEligible && !userCoupon;

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
      toast.success(
        billingCycle === "AVULSO"
          ? "Cupom aplicado com sucesso."
          : "Cupom validado. Ele será aplicado no ciclo Avulso.",
      );
    } catch (error) {
      setCoupon(null);
      toast.error(error.message || "Não foi possível validar o cupom.");
    } finally {
      setValidatingCoupon(false);
    }
  }, [billingCycle, couponCode, profilePending, validatingCoupon]);

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

      setSelectingPlan(planCard.id);
      try {
        const checkoutCoupon =
          billingCycle === "AVULSO" && !planCard.introEligible ? coupon : null;

        await onSelectPlan?.({
          planId: planCard.id,
          billingCycle,
          amount: planCard.pricing?.total,
          couponData: checkoutCoupon,
          juris: planCard.juris,
          isPromoEligible: Boolean(planCard.introEligible),
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
    [billingCycle, coupon, onSelectPlan, profilePending, selectingPlan],
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
