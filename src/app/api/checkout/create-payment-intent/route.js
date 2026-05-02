import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

/**
 * POST /api/checkout/create-payment-intent
 * Cria um PaymentIntent para Checkout Transparente (Stripe Elements).
 * Usado para compra avulsa de Juris (modo 'payment').
 * 
 * IMPORTANTE: Este endpoint NÃO substitui o fluxo antigo de redirect.
 * Ambos coexistem. O webhook continua recebendo o evento e creditando Juris.
 */
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { priceId, stripeCouponId, internalCouponId, addOnType } = await request.json();

    if (!priceId) {
      return NextResponse.json({ success: false, message: "Price ID é obrigatório" }, { status: 400 });
    }

    // Buscar informações do preço no Stripe para saber o valor em centavos
    const price = await stripe.prices.retrieve(priceId);

    if (!price || !price.unit_amount) {
      return NextResponse.json({ success: false, message: "Preço não encontrado no Stripe" }, { status: 400 });
    }

    let amountInCents = price.unit_amount;

    // Se tiver cupom do Stripe, buscar o desconto para calcular o valor final
    let couponDiscount = null;
    if (stripeCouponId) {
      try {
        const coupon = await stripe.coupons.retrieve(stripeCouponId);
        if (coupon.valid) {
          if (coupon.percent_off) {
            amountInCents = Math.round(amountInCents * (1 - coupon.percent_off / 100));
            couponDiscount = { type: 'percent', value: coupon.percent_off };
          } else if (coupon.amount_off) {
            amountInCents = Math.max(0, amountInCents - coupon.amount_off);
            couponDiscount = { type: 'fixed', value: coupon.amount_off };
          }
        }
      } catch (couponErr) {
        console.warn('[create-payment-intent] Erro ao buscar cupom:', couponErr.message);
      }
    }

    // Stripe exige valor mínimo de 50 centavos (~R$0.50)
    if (amountInCents < 50) {
      amountInCents = 50;
    }

    // Criar o PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: price.currency || 'brl',
      payment_method_types: ['card'],
      metadata: {
        userId: user.id,
        type: addOnType ? 'ADDON_PURCHASE' : 'JURIS_PURCHASE',
        priceId: priceId,
        addOnType: addOnType || null,
        cupomId: internalCouponId || null,
      },
      receipt_email: user.email,
    });

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: amountInCents,
      currency: price.currency || 'brl',
      couponDiscount,
    });

  } catch (error) {
    console.error("Erro ao criar PaymentIntent:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
