import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * POST /api/checkout/confirm-payment
 * Verificação direta após pagamento transparente.
 * O frontend envia o paymentIntentId, o backend verifica com o Stripe
 * e credita os Juris imediatamente (com proteção contra crédito duplo).
 */
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json({ success: false, message: "PaymentIntent ID é obrigatório" }, { status: 400 });
    }

    // 1. Verificar o PaymentIntent diretamente no Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json({ 
        success: false, 
        message: `Pagamento não confirmado. Status: ${paymentIntent.status}` 
      }, { status: 400 });
    }

    // 2. Verificar que o userId nos metadata bate com o usuário logado
    const metaUserId = paymentIntent.metadata?.userId;
    if (metaUserId !== user.id) {
      return NextResponse.json({ success: false, message: "Pagamento não pertence a este usuário" }, { status: 403 });
    }

    // 3. Verificar se já foi creditado (proteção contra crédito duplo)
    const { data: existingTx } = await supabaseAdmin
      .from("transacoes")
      .select("id")
      .eq("stripe_session_id", paymentIntentId)
      .eq("status", "succeeded")
      .maybeSingle();

    if (existingTx) {
      // Já foi creditado — retornar sucesso sem duplicar
      return NextResponse.json({ success: true, message: "Créditos já aplicados", alreadyCredited: true });
    }

    // 4. Resolver quantidade de Juris pelo priceId
    const priceId = paymentIntent.metadata?.priceId;
    const cupomId = paymentIntent.metadata?.cupomId;
    
    const priceMap = {
      [process.env.PRICE_JURIS_10 || process.env.NEXT_PUBLIC_PRICE_JURIS_10]: 10,
      [process.env.PRICE_JURIS_20 || process.env.NEXT_PUBLIC_PRICE_JURIS_20]: 20,
      [process.env.PRICE_JURIS_50 || process.env.NEXT_PUBLIC_PRICE_JURIS_50]: 50,
    };

    const jurisAmount = priceMap[priceId] || 0;

    if (jurisAmount <= 0) {
      console.error(`❌ [confirm-payment] Não foi possível resolver Juris para priceId: ${priceId}`);
      return NextResponse.json({ success: false, message: "Não foi possível identificar o pacote" }, { status: 400 });
    }

    // 5. Buscar saldo atual e atualizar
    const { data: profile } = await supabaseAdmin
      .from("advogados")
      .select("balance")
      .eq("id", user.id)
      .single();

    const currentBalance = profile?.balance || 0;
    const newBalance = currentBalance + jurisAmount;

    const { error: updateError } = await supabaseAdmin
      .from("advogados")
      .update({ balance: newBalance })
      .eq("id", user.id);

    if (updateError) {
      console.error(`❌ [confirm-payment] Erro ao atualizar saldo:`, updateError);
      return NextResponse.json({ success: false, message: "Erro ao creditar Juris" }, { status: 500 });
    }

    // 6. Registrar transação
    await supabaseAdmin.from('transacoes').insert([{
      advogado_id: user.id,
      tipo: 'JURIS_PURCHASE',
      valor: (paymentIntent.amount || 0) / 100,
      moeda: paymentIntent.currency || 'BRL',
      status: 'succeeded',
      juris_amount: jurisAmount,
      stripe_session_id: paymentIntentId,
      cupom_id: (cupomId && cupomId !== 'null') ? cupomId : null,
      created_at: new Date().toISOString()
    }]);

    // 7. Registrar uso do cupom se existir
    if (cupomId && cupomId !== 'null') {
      await supabaseAdmin.from('cupom_usos').insert([{
        cupom_id: cupomId,
        advogado_id: user.id,
        checkout_session_id: paymentIntentId
      }]);
    }

    console.log(`✅ [confirm-payment] +${jurisAmount} Juris para ${user.id} (${currentBalance} → ${newBalance})`);

    return NextResponse.json({ 
      success: true, 
      jurisAmount, 
      newBalance,
      message: `${jurisAmount} Juris adicionados com sucesso!` 
    });

  } catch (error) {
    console.error("❌ [confirm-payment] Erro:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
