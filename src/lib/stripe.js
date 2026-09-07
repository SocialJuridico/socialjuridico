import { updateMercadoPagoSubscription } from "@/lib/mercadopago/client";
import { stripeClient } from "@/lib/billing/stripeClient";

function legacyProviderError(subscriptionId) {
  const error = new Error(
    `Assinatura legada ${String(subscriptionId || "")} não é gerenciada pelo Mercado Pago.`,
  );
  error.code = "resource_missing";
  return error;
}

// Compatibilidade LGPD: sub_ pertence à Stripe; mp_ identifica o Mercado Pago.
export const stripe = {
  subscriptions: {
    async cancel(subscriptionReference) {
      const value = String(subscriptionReference || "").trim();
      if (value.startsWith("sub_")) return stripeClient().subscriptions.cancel(value);
      if (!value.startsWith("mp_") || value.length <= 3) {
        throw legacyProviderError(value);
      }

      const subscriptionId = value.slice(3);
      await updateMercadoPagoSubscription(subscriptionId, { status: "canceled" });
      return { id: subscriptionId, status: "canceled", provider: "MERCADOPAGO" };
    },
  },
};
