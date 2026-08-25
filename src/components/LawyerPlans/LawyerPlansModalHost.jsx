"use client";

import { useCallback, useMemo, useState } from "react";

import StableTransparentCheckoutModal from "@/components/TransparentCheckout/StableTransparentCheckoutModal";

import LawyerPlansModal from "./LawyerPlansModal";

export default function LawyerPlansModalHost({
  isOpen,
  profileData,
  onClose,
  onProfileRefresh,
}) {
  const [checkout, setCheckout] = useState(null);

  const checkoutKey = useMemo(
    () =>
      checkout
        ? `${checkout.planId}-${checkout.billingCycle}-${checkout.isPromoEligible ? "promo" : "normal"}`
        : "closed-plan-checkout",
    [checkout],
  );

  const closeCheckout = useCallback(() => {
    setCheckout(null);
  }, []);

  const handleSelectPlan = useCallback(
    async (selection) => {
      setCheckout(selection);
      onClose();
    },
    [onClose],
  );

  const handlePaymentSuccess = useCallback(
    async (context = null) => {
      await onProfileRefresh?.();

      // Ao criar uma assinatura o acesso provisório precisa aparecer no painel
      // sem fechar a tela que continua acompanhando a primeira cobrança.
      if (context?.provisional) return;

      setCheckout(null);
    },
    [onProfileRefresh],
  );

  return (
    <>
      <LawyerPlansModal
        isOpen={isOpen}
        profileData={profileData}
        onClose={onClose}
        onSelectPlan={handleSelectPlan}
      />

      <StableTransparentCheckoutModal
        key={checkoutKey}
        isOpen={Boolean(checkout)}
        onClose={closeCheckout}
        isPro={Boolean(checkout)}
        planType={checkout?.planId || null}
        billingCycle={checkout?.billingCycle || null}
        displayAmount={checkout?.amount || null}
        renewalAmount={checkout?.renewalAmount || null}
        isPromoEligible={Boolean(checkout?.isPromoEligible)}
        couponData={checkout?.couponData || null}
        profileData={profileData}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}
