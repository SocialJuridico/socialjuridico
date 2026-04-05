/**
 * Serviço frontend para integração com Stripe Checkout no SocialJurídico
 */

export async function createJurisCheckout(jurisAmount, couponData = null) {
  try {
    // Mapear quantidade de Juris para price ID usando as variáveis do .env (via NEXT_PUBLIC)
    const priceMap = {
      10: process.env.NEXT_PUBLIC_PRICE_JURIS_10,
      20: process.env.NEXT_PUBLIC_PRICE_JURIS_20,
      50: process.env.NEXT_PUBLIC_PRICE_JURIS_50,
    };

    const priceId = priceMap[jurisAmount];
    if (!priceId) {
      throw new Error('Quantidade de Juris inválida ou Price ID não configurado');
    }

    const response = await fetch('/api/checkout/juris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        stripeCouponId: couponData?.stripe_coupon_id,
        internalCouponId: couponData?.id,
        successUrl: window.location.origin + '/dashboard/advogado?payment=success',
        cancelUrl: window.location.origin + '/dashboard/advogado?payment=canceled',
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    // Redirecionar para o Stripe Checkout (URL retornada pela API)
    if (data.url) {
      window.location.href = data.url;
    }

    return data;
  } catch (error) {
    console.error('Erro ao iniciar checkout de Juris:', error);
    throw error;
  }
}

export async function createProSubscription(couponData = null) {
  try {
    const priceId = process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY;

    if (!priceId) {
      throw new Error('Price ID do PRO não configurado');
    }

    const response = await fetch('/api/checkout/pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priceId,
        stripeCouponId: couponData?.stripe_coupon_id,
        internalCouponId: couponData?.id,
        successUrl: window.location.origin + '/dashboard/advogado?payment=success',
        cancelUrl: window.location.origin + '/dashboard/advogado?payment=canceled',
      }),
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message);

    if (data.url) {
      window.location.href = data.url;
    }

    return data;
  } catch (error) {
    console.error('Erro ao iniciar assinatura PRO:', error);
    throw error;
  }
}
