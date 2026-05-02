import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { priceId, stripeCouponId, internalCouponId, planType, billingCycle } = await request.json();

    if (!priceId) {
      return NextResponse.json({ success: false, message: "Price ID é obrigatório" }, { status: 400 });
    }

    // 1. Procurar se já existe um customer no Stripe com este email
    let customerId;
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1
    });

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      // Criar novo customer
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });
      customerId = newCustomer.id;
    }

    // 2. Preparar configuração da subscription
    const metadata = {
      userId: user.id,
      type: 'PRO_SUBSCRIPTION',
      priceId: priceId,
      planType: planType || 'PRO',
      billingCycle: billingCycle || 'MONTHLY',
    };
    if (internalCouponId) {
      metadata.cupomId = String(internalCouponId);
    }

    const subscriptionConfig = {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { 
        save_default_payment_method: 'on_subscription',
        payment_method_options: {
          card: {
            request_three_d_secure: 'any',
          },
        },
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: metadata,
    };

    if (stripeCouponId) {
      subscriptionConfig.discounts = [{ coupon: stripeCouponId }];
    }

    // 3. Criar a assinatura no Stripe
    const subscription = await stripe.subscriptions.create(subscriptionConfig);

    // 3.5. Extrair intent
    const invoice = subscription.latest_invoice;
    let paymentIntentId = null;
    let clientSecret = null;

    if (invoice && invoice.payment_intent) {
      // Se tiver payment_intent (fatura > 0)
      const intentObj = typeof invoice.payment_intent === 'string' ?
        await stripe.paymentIntents.retrieve(invoice.payment_intent) :
        invoice.payment_intent;

      paymentIntentId = intentObj.id;
      clientSecret = intentObj.client_secret || null;
    } else if (subscription.pending_setup_intent) {
      // Se for 100% gratuito e o Stripe criar um setup intent para coletar cartão
      const setupIntent = typeof subscription.pending_setup_intent === 'string' ? 
        await stripe.setupIntents.retrieve(subscription.pending_setup_intent) : 
        subscription.pending_setup_intent;
      
      paymentIntentId = setupIntent.id;
      clientSecret = setupIntent.client_secret;
    }

    if (paymentIntentId) {
      // Atualizar o intent (Payment ou Setup) para incluir os metadata
      try {
        if (paymentIntentId.startsWith('seti_')) {
          await stripe.setupIntents.update(paymentIntentId, { metadata });
        } else {
          await stripe.paymentIntents.update(paymentIntentId, { metadata });
        }
      } catch (err) {
        console.warn('[create-subscription-intent] Aviso: Falha ao atualizar metadata no intent', err);
      }
    }

    if (!clientSecret) {
      throw new Error("Não foi possível gerar a chave de pagamento (client_secret nulo).");
    }

    // Buscar informações do preço no Stripe para mostrar o valor no frontend
    const price = await stripe.prices.retrieve(priceId);
    let amountInCents = price.unit_amount;
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
        console.warn('[create-subscription-intent] Erro ao buscar cupom:', couponErr.message);
      }
    }

    // Retornamos o clientSecret do intent encontrado
    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret: clientSecret,
      amount: amountInCents,
      currency: price.currency || 'brl',
      couponDiscount,
    });

  } catch (error) {
    console.error("Erro ao criar SubscriptionIntent:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
