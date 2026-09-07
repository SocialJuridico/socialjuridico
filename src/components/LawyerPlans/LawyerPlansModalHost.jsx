"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";

import StableTransparentCheckoutModal from "@/components/TransparentCheckout/StableTransparentCheckoutModal";
import RecurringCheckoutModal from "@/components/TransparentCheckout/RecurringCheckoutModal";

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
      if (!selection) return;
      onClose();
      toast.loading("Redirecionando para o Mercado Pago...", { id: "mp-redirect" });
      try {
        const response = await fetch("/api/checkout/mercadopago", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planType: selection.planId,
            billingCycle: selection.billingCycle,
            jurisAmount: 0,
            aiCreditsAmount: 0,
            isPromoEligible: Boolean(selection.isPromoEligible),
            internalCouponId: selection.couponData?.id || null,
          }),
        });
        const data = await response.json().catch(() => null);
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
        toast.dismiss("mp-redirect");
        toast.error(data?.message || "Não foi possível iniciar o pagamento no Mercado Pago.");
      } catch (error) {
        toast.dismiss("mp-redirect");
        toast.error(error?.message || "Erro de conexão ao acessar o gateway de pagamento.");
      }
    },
    [onClose],
  );

  const handlePaymentSuccess = useCallback(
    async (context = null) => {
      await onProfileRefresh?.();

      // O fluxo avulso continua com seu contrato existente. A assinatura
      // recorrente só chama este callback após confirmar a primeira cobrança.
      if (context?.provisional) return;

      setCheckout(null);
    },
    [onProfileRefresh],
  );

  const recurring = checkout && ["MONTHLY", "ANNUAL"].includes(
    String(checkout.billingCycle || "").toUpperCase(),
  );

  const checkoutProps = {
    isOpen: Boolean(checkout),
    onClose: closeCheckout,
    isPro: Boolean(checkout),
    planType: checkout?.planId || null,
    billingCycle: checkout?.billingCycle || null,
    displayAmount: checkout?.amount || null,
    renewalAmount: checkout?.renewalAmount || null,
    isPromoEligible: Boolean(checkout?.isPromoEligible),
    couponData: checkout?.couponData || null,
    profileData,
    onPaymentSuccess: handlePaymentSuccess,
  };

  return (
    <>
      <LawyerPlansModal
        isOpen={isOpen}
        profileData={profileData}
        onClose={onClose}
        onSelectPlan={handleSelectPlan}
      />

      {recurring ? (
        <RecurringCheckoutModal key={checkoutKey} {...checkoutProps} />
      ) : (
        <StableTransparentCheckoutModal key={checkoutKey} {...checkoutProps} />
      )}
    </>
  );
}
