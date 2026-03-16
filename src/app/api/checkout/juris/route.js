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

    const { priceId, successUrl, cancelUrl } = await request.json();

    if (!priceId) {
      return NextResponse.json({ success: false, message: "Price ID é obrigatório" }, { status: 400 });
    }

    // Criar Sessão de Checkout do Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/advogado?payment_status=success`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard/advogado?payment_status=cancel`,
      metadata: {
        userId: user.id,
        type: 'JURIS_PURCHASE',
        priceId: priceId,
      },
      customer_email: user.email,
    });

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id });

  } catch (error) {
    console.error("Erro ao criar sessão de checkout (Juris):", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
