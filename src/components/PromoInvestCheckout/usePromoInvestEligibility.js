"use client";

import { useEffect, useState } from "react";

import { hasActiveLawyerPlan } from "@/lib/billing/promoInvest";

// A promoção só aparece para quem está sem plano ativo. `purchasesLeft` indica
// se ainda há compras da promoção; sem elas vale o checkout normal dos planos.
export function usePromoInvestEligibility(profileData, enabled = true) {
  const hasActivePlan = hasActiveLawyerPlan(profileData);
  const shouldFetch = enabled && Boolean(profileData?.id) && !hasActivePlan;
  const [promo, setPromo] = useState(null);

  useEffect(() => {
    if (!shouldFetch) return undefined;
    let alive = true;
    fetch("/api/checkout/quer-investir-quanto", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => { if (alive) setPromo(result); })
      .catch(() => { if (alive) setPromo(null); });
    return () => { alive = false; };
  }, [shouldFetch, profileData?.id]);

  const visible = !hasActivePlan && Boolean(promo?.enabled);
  return {
    visible,
    canUsePromo: visible && promo.purchasesLeft > 0,
    purchasesLeft: promo?.purchasesLeft ?? 0,
  };
}
