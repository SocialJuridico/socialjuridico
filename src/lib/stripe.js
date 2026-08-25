import { updateMercadoPagoSubscription } from "@/lib/mercadopago/client";

function legacyProviderError(subscriptionId) {
  const error = new Error(
    `Assinatura legada ${String(subscriptionId || "")} não é gerenciada pelo Mercado Pago.`,
  );
  error.code = "resource_missing";
  return error;
}

// Compatibilidade temporária para o fluxo LGPD antigo, que ainda importa
// `stripe.subscriptions.cancel`. Não há SDK, chave ou chamada Stripe aqui.
// Novas assinaturas são identificadas por `mp_<preapprovalId>`.
export const stripe = {
  subscriptions: {
    async cancel(subscriptionReference) {
      const value = String(subscriptionReference || "").trim();
      if (!value.startsWith("mp_") || value.length <= 3) {
        throw legacyProviderError(value);
      }

      const subscriptionId = value.slice(3);
      await updateMercadoPagoSubscription(subscriptionId, { status: "canceled" });
      return { id: subscriptionId, status: "canceled", provider: "MERCADOPAGO" };
    },
  },
};
