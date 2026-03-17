import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return NextResponse.json(
      { message: `Webhook Error: ${err.message}` },
      { status: 400 },
    );
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object;
      await handleCheckoutCompleted(session);
      break;

    case "customer.subscription.deleted":
      const subscription = event.data.object;
      await handleSubscriptionDeleted(subscription);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session) {
  const userId = session.metadata.userId;
  const type = session.metadata.type;

  if (type === "JURIS_PURCHASE") {
    // Definir quantidade de Juris baseada no Price ID
    let jurisAmount = 0;
    const priceId =
      session.line_items?.data[0]?.price?.id || session.metadata.priceId;

    // Mapeamento (deve bater com o .env)
    if (priceId === process.env.NEXT_PUBLIC_PRICE_JURIS_10) jurisAmount = 10;
    else if (priceId === process.env.NEXT_PUBLIC_PRICE_JURIS_20)
      jurisAmount = 20;
    else if (priceId === process.env.NEXT_PUBLIC_PRICE_JURIS_50)
      jurisAmount = 50;

    if (jurisAmount > 0) {
      console.log(
        `💰 Adicionando ${jurisAmount} Juris para o usuário ${userId}`,
      );

      // Buscar saldo atual
      const { data: profile } = await supabaseAdmin
        .from("advogados")
        .select("balance")
        .eq("id", userId)
        .single();

      const newBalance = (profile?.balance || 0) + jurisAmount;

      await supabaseAdmin
        .from("advogados")
        .update({ balance: newBalance })
        .eq("id", userId);

      // Registrar log de transação (opcional, se tiver tabela)
      // await supabaseAdmin.from('transacoes').insert([...]);
    }
  } else if (type === "PRO_SUBSCRIPTION") {
    // ⚠️ SEGURANÇA: Não logar user IDs

    // Buscar saldo atual para somar os 20 Juris de bônus
    const { data: advProfile } = await supabaseAdmin
      .from("advogados")
      .select("balance")
      .eq("id", userId)
      .single();

    const newBalance = (advProfile?.balance || 0) + 20;

    await supabaseAdmin
      .from("advogados")
      .update({
        is_premium: true,
        premium_until: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        balance: newBalance,
      })
      .eq("id", userId);

    console.log(
      `✅ PRO ativado. +20 Juris (novo saldo: ${newBalance}) para ${userId}`,
    );
  }
}

async function handleSubscriptionDeleted(subscription) {
  // Se a assinatura for cancelada no Stripe, removemos o premium aqui
  const customer = await stripe.customers.retrieve(subscription.customer);
  const email = customer.email;

  if (email) {
    await supabaseAdmin
      .from("advogados")
      .update({ is_premium: false })
      .eq("email", email);
  }
}
