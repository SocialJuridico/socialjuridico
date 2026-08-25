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

function isRecurringCycle(cycle) {
  return ["MONTHLY", "ANNUAL"].includes(String(cycle || "").toUpperCase());
}

function withTotal(pricing, total, billingCycle) {
  return {
    ...pricing,
    total,
    display: billingCycle === "ANNUAL" ? total / 12 : total,
  };
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

    const entries = Object.values(LAWYER_PLANS).map((plan) => {
      if (!isIntroPromotionEligible(plan.id, "MONTHLY", profileData)) {
        return [plan.id, null];
      }
      return [plan.id, getIntroPromotionCoupon(plan.id)];
    });

    if (!cancelled) setPromotionCoupons(Object.fromEntries(entries));

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
        const basePricing = applyCouponToPrice(priceInfo, billingCycle, null);
        const promotionCoupon = promotionCoupons[plan.id] || null;
        const introEligible =
          !profilePending &&
          billingCycle === "MONTHLY" &&
          Boolean(promotionCoupon) &&
          isIntroPromotionEligible(plan.id, billingCycle, profileData);

        const recurringCycle = isRecurringCycle(billingCycle);
        const rsRate = rsRateFor(plan.id);
        const rsSubscriptionEligible = isRs && recurringCycle && rsRate > 0;
        const rsTotal = rsSubscriptionEligible
          ? applyRsDiscountValue(basePricing.total, plan.id)
          : basePricing.total;

        const renewalTotal = recurringCycle
          ? rsSubscriptionEligible
            ? rsTotal
            : basePricing.total
          : null;
        const renewalPricing = renewalTotal === null
          ? null
          : withTotal(basePricing, renewalTotal, billingCycle);

        let pricing = basePricing;
        let previewCoupon = null;
        let couponApplied = false;
        let couponDeferredByPromo = false;
        let rsDiscount = null;
        let rsAppliesOnRenewal = false;

        if (introEligible) {
          previewCoupon = promotionCoupon;
          pricing = applyCouponToPrice(
            priceInfo,
            billingCycle,
            promotionCoupon,
          );
          couponDeferredByPromo = Boolean(coupon);
          rsAppliesOnRenewal = rsSubscriptionEligible;
        } else if (coupon) {
          const couponPricing = applyCouponToPrice(
            priceInfo,
            billingCycle,
            coupon,
          );

          // Cupom e OAB/RS não acumulam. A interface espelha a mesma regra do
          // servidor e mostra sempre a melhor condição na primeira cobrança.
          if (rsSubscriptionEligible && rsTotal <= couponPricing.total) {
            pricing = withTotal(basePricing, rsTotal, billingCycle);
            rsDiscount = {
              rate: rsRate,
              rateLabel: RS_DISCOUNT_LABELS[plan.id],
              originalTotal: basePricing.total,
            };
          } else {
            previewCoupon = coupon;
            pricing = couponPricing;
            couponApplied = true;
            rsAppliesOnRenewal = rsSubscriptionEligible;
          }
        } else if (rsSubscriptionEligible) {
          pricing = withTotal(basePricing, rsTotal, billingCycle);
          rsDiscount = {
            rate: rsRate,
            rateLabel: RS_DISCOUNT_LABELS[plan.id],
            originalTotal: basePricing.total,
          };
        }

        const isCurrent = activePlan === plan.id;
        const isDowngrade = activePlan === "PRO" && plan.id === "START";

        return {
          ...plan,
          billingCycle,
          priceInfo,
          pricing,
          renewalPricing,
          recurringCycle,
          rsDiscount,
          rsAppliesOnRenewal,
          rsSubscriptionEligible,
          previewCoupon,
          couponApplied,
          couponDeferredByPromo,
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

      if (billingCycle === "AVULSO") {
        toast.success("Cupom aplicado com sucesso.");
      } else {
        toast.success(
          "Cupom validado. Em assinaturas, o desconto vale na primeira cobrança e não acumula com promoção/OAB-RS.",
        );
      }
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
        await onSelectPlan?.({
          planId: planCard.id,
          billingCycle,
          amount: planCard.pricing?.total,
          renewalAmount: planCard.renewalPricing?.total ?? null,
          couponData: planCard.couponApplied ? coupon : null,
          juris: planCard.juris,
          isPromoEligible: Boolean(planCard.introEligible),
          rsAppliesOnRenewal: Boolean(planCard.rsAppliesOnRenewal),
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
