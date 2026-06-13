/**
 * Serviço frontend para integrações de redirecionamento do Stripe Checkout.
 * O checkout transparente é o fluxo principal. Estes métodos são utilizados
 * somente como contingência quando o formulário incorporado não pode abrir.
 */

function getDashboardReturnPath() {
  if (typeof window === "undefined") return "/dashboard/advogado";

  return window.location.pathname.startsWith(
    "/dashboard/advogado/oportunidade",
  )
    ? "/dashboard/advogado/oportunidade"
    : "/dashboard/advogado";
}

function getInternalCouponId(couponData) {
  return couponData?.id || couponData?.cupom_id || null;
}

export async function createJurisCheckout(jurisAmount, couponData = null) {
  try {
    const priceMap = {
      10: process.env.NEXT_PUBLIC_PRICE_JURIS_10,
      20: process.env.NEXT_PUBLIC_PRICE_JURIS_20,
      50: process.env.NEXT_PUBLIC_PRICE_JURIS_50,
    };

    const priceId = priceMap[jurisAmount];
    if (!priceId) {
      throw new Error(
        "Quantidade de Juris inválida ou Price ID não configurado.",
      );
    }

    const returnPath = getDashboardReturnPath();
    const response = await fetch("/api/checkout/juris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        internalCouponId: getInternalCouponId(couponData),
        successUrl: `${window.location.origin}${returnPath}?payment=success`,
        cancelUrl: `${window.location.origin}${returnPath}?payment=canceled`,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Não foi possível iniciar o checkout.");
    }

    if (data.url) window.location.assign(data.url);
    return data;
  } catch (error) {
    console.error("Erro ao iniciar checkout de Juris:", error);
    throw error;
  }
}

export async function createProSubscription(couponData = null) {
  try {
    const selectedPlan = String(
      window.localStorage.getItem("sj_selected_plan_type") || "PRO",
    ).toUpperCase();
    const selectedBilling = String(
      window.localStorage.getItem("sj_selected_billing") || "MONTHLY",
    ).toUpperCase();
    const selectedPriceId =
      window.localStorage.getItem("sj_selected_price_id") ||
      process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY ||
      process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MENSAL;

    if (selectedPlan !== "PRO" || selectedBilling !== "MONTHLY") {
      throw new Error(
        "O checkout alternativo está disponível somente para o plano PRO mensal. Reabra os planos e tente novamente pelo pagamento integrado.",
      );
    }

    if (!selectedPriceId) {
      throw new Error("Price ID do PRO mensal não configurado.");
    }

    const returnPath = getDashboardReturnPath();
    const response = await fetch("/api/checkout/pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId: selectedPriceId,
        internalCouponId: getInternalCouponId(couponData),
        successUrl: `${window.location.origin}${returnPath}?payment=success`,
        cancelUrl: `${window.location.origin}${returnPath}?payment=canceled`,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(data?.message || "Não foi possível iniciar a assinatura.");
    }

    if (data.url) window.location.assign(data.url);
    return data;
  } catch (error) {
    console.error("Erro ao iniciar assinatura PRO:", error);
    throw error;
  }
}
