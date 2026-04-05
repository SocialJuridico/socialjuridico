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

    const { priceId, successUrl, cancelUrl, stripeCouponId, internalCouponId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ success: false, message: "Price ID é obrigatório" }, { status: 400 });
    }

    // Preparar as configurações da sessão do Stripe
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/advogado?payment_status=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/advogado?payment_status=cancel`,
      metadata: {
        userId: user.id,
        type: 'PRO_SUBSCRIPTION',
        priceId: priceId,
        cupomId: internalCouponId || null // Para tracking no webhook depois
      },
      customer_email: user.email,
    };

    // Aplicar desconto se houver um cupom válido (Stripe ID)
    if (stripeCouponId) {
      sessionConfig.discounts = [{ coupon: stripeCouponId }];
    }

    // Criar Sessão de Checkout do Stripe (Modo Assinatura)
    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id });

  } catch (error) {
    console.error("Erro ao criar sessão de checkout (PRO):", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
