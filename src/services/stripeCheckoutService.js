/**
 * Serviço frontend para integração com Stripe Checkout no SocialJurídico.
 * O navegador envia apenas o identificador interno do cupom. O servidor é
 * responsável por validar regras e resolver o vínculo correto no Stripe.
 */

export async function createJurisCheckout(jurisAmount, couponData = null) {
  try {
    const priceMap = {
      10: process.env.NEXT_PUBLIC_PRICE_JURIS_10,
      20: process.env.NEXT_PUBLIC_PRICE_JURIS_20,
      50: process.env.NEXT_PUBLIC_PRICE_JURIS_50,
    };

    const priceId = priceMap[jurisAmount];
    if (!priceId) {
      throw new Error("Quantidade de Juris inválida ou Price ID não configurado");
    }

    const response = await fetch("/api/checkout/juris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        internalCouponId: couponData?.id || couponData?.cupom_id || null,
        successUrl: `${window.location.origin}/dashboard/advogado?payment=success`,
        cancelUrl: `${window.location.origin}/dashboard/advogado?payment=canceled`,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Não foi possível iniciar o checkout.");
    }

    if (data.url) window.location.href = data.url;
    return data;
  } catch (error) {
    console.error("Erro ao iniciar checkout de Juris:", error);
    throw error;
  }
}

export async function createProSubscription(couponData = null) {
  try {
    const priceId = process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY;

    if (!priceId) {
      throw new Error("Price ID do PRO não configurado");
    }

    const response = await fetch("/api/checkout/pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        internalCouponId: couponData?.id || couponData?.cupom_id || null,
        successUrl: `${window.location.origin}/dashboard/advogado?payment=success`,
        cancelUrl: `${window.location.origin}/dashboard/advogado?payment=canceled`,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Não foi possível iniciar a assinatura.");
    }

    if (data.url) window.location.href = data.url;
    return data;
  } catch (error) {
    console.error("Erro ao iniciar assinatura PRO:", error);
    throw error;
  }
}
