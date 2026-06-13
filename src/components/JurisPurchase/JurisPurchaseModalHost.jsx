"use client";

import { useCallback, useMemo, useState } from "react";

import StableTransparentCheckoutModal from "@/components/TransparentCheckout/StableTransparentCheckoutModal";

import JurisPurchaseModal from "./JurisPurchaseModal";

export default function JurisPurchaseModalHost({
  isOpen,
  profileData,
  onClose,
  onProfileRefresh,
}) {
  const [checkout, setCheckout] = useState(null);

  const checkoutKey = useMemo(
    () =>
      checkout
        ? `juris-${checkout.jurisAmount}-${checkout.couponData?.id || "sem-cupom"}`
        : "closed-juris-checkout",
    [checkout],
  );

  const closeCheckout = useCallback(() => {
    setCheckout(null);
  }, []);

  const handleSelectPackage = useCallback(
    async (selection) => {
      setCheckout(selection);
      onClose?.();
    },
    [onClose],
  );

  const handlePaymentSuccess = useCallback(async () => {
    await onProfileRefresh?.();
    setCheckout(null);
  }, [onProfileRefresh]);

  return (
    <>
      <JurisPurchaseModal
        isOpen={isOpen}
        onClose={onClose}
        onSelectPackage={handleSelectPackage}
      />

      <StableTransparentCheckoutModal
        key={checkoutKey}
        isOpen={Boolean(checkout)}
        onClose={closeCheckout}
        jurisAmount={checkout?.jurisAmount || null}
        isPro={false}
        couponData={checkout?.couponData || null}
        profileData={profileData}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}
