"use client";

import { useCallback, useMemo, useState } from "react";

import TransparentCheckoutModal from "@/components/TransparentCheckout/TransparentCheckoutModal";

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
        ? `${checkout.planId}-${checkout.billingCycle}-${checkout.priceId}`
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

  const handlePaymentSuccess = useCallback(async () => {
    await onProfileRefresh?.();
    setCheckout(null);
  }, [onProfileRefresh]);

  return (
    <>
      <LawyerPlansModal
        isOpen={isOpen}
        profileData={profileData}
        onClose={onClose}
        onSelectPlan={handleSelectPlan}
      />

      <TransparentCheckoutModal
        key={checkoutKey}
        isOpen={Boolean(checkout)}
        onClose={closeCheckout}
        jurisAmount={checkout?.amount || null}
        isPro={Boolean(checkout)}
        couponData={checkout?.couponData || null}
        profileData={profileData}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}
