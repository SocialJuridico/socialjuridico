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

    // 1. Verificar o Intent diretamente no Stripe
    let intent;
    let isSetup = false;
    
    if (paymentIntentId.startsWith('seti_')) {
      intent = await stripe.setupIntents.retrieve(paymentIntentId);
      isSetup = true;
    } else {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    }

    if (intent.status !== 'succeeded') {
      return NextResponse.json({ 
        success: false, 
        message: `Transação não confirmada. Status: ${intent.status}` 
      }, { status: 400 });
    }

    // 2. Verificar que o userId nos metadata bate com o usuário logado
    const metaUserId = intent.metadata?.userId;
    if (metaUserId !== user.id) {
      return NextResponse.json({ success: false, message: "Transação não pertence a este usuário" }, { status: 403 });
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
    const type = intent.metadata?.type || 'JURIS_PURCHASE';
    const priceId = intent.metadata?.priceId;
    const cupomId = intent.metadata?.cupomId;
    
    // Processamento específico para Plano (START/PRO)
    if (type === 'PRO_SUBSCRIPTION') {
      const { data: profile } = await supabaseAdmin
        .from("advogados")
        .select("balance")
        .eq("id", user.id)
        .single();

      const currentBalance = profile?.balance || 0;
      const planType = intent.metadata?.planType || 'PRO';
      const billingCycle = intent.metadata?.billingCycle || 'MONTHLY';

      const { error: updateError } = await supabaseAdmin
        .from("advogados")
        .update({
          is_premium: true, // Ambos START e PRO são premium
          plan_type: planType,
          plan_billing_cycle: billingCycle,
          premium_expires_at: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
          // Resetar uso no novo ciclo/ativação
          uso_redator_ia: 0,
          uso_triagem: 0,
          uso_agenda: 0,
          // Se for PRO, ganha 20 Juris de bônus (legacy feature maintained)
          balance: planType === 'PRO' ? (currentBalance + 20) : currentBalance,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error(`❌ [confirm-payment] Erro ao ativar plano:`, updateError);
        return NextResponse.json({ success: false, message: "Erro ao ativar plano" }, { status: 500 });
      }

      await supabaseAdmin.from('transacoes').insert([{
        advogado_id: user.id,
        tipo: 'PRO_SUBSCRIPTION',
        valor: isSetup ? 0 : ((intent.amount || 0) / 100),
        moeda: intent.currency || 'BRL',
        status: 'succeeded',
        juris_amount: planType === 'PRO' ? 20 : 0,
        stripe_session_id: paymentIntentId,
        cupom_id: (cupomId && cupomId !== 'null') ? cupomId : null,
        created_at: new Date().toISOString()
      }]);

      if (cupomId && cupomId !== 'null') {
        await supabaseAdmin.from('cupom_usos').insert([{
          cupom_id: cupomId,
          advogado_id: user.id,
          checkout_session_id: paymentIntentId
        }]);
      }

      console.log(`✅ [confirm-payment] Plano ${planType} (${billingCycle}) ativado para ${user.id}`);

      return NextResponse.json({ 
        success: true, 
        isPro: planType === 'PRO',
        planType,
        message: `Plano ${planType} ativado com sucesso!` 
      });
    }

    // Processamento específico para Add-ons (Expansões)
    if (type === 'ADDON_PURCHASE') {
      const addOnType = intent.metadata?.addOnType;
      let field = "";
      let amount = 0;
      let label = "";

      if (addOnType === 'EXTRA_DOCS') { field = 'extra_storage_mb'; amount = 1024; label = "1GB de Armazenamento"; }
      if (addOnType === 'EXTRA_IA') { field = 'extra_redator_ia'; amount = 10; label = "10 gerações de IA"; }
      if (addOnType === 'EXTRA_TRIAGEM') { field = 'extra_triagem'; amount = 5; label = "5 diagnósticos de Triagem"; }

      if (field) {
        const { data: currentAddons } = await supabaseAdmin.from('advogados').select(field).eq('id', user.id).single();
        const newValue = (currentAddons?.[field] || 0) + amount;
        
        await supabaseAdmin.from('advogados').update({ [field]: newValue }).eq('id', user.id);
        
        await supabaseAdmin.from('transacoes').insert([{
          advogado_id: user.id,
          tipo: 'ADDON_PURCHASE',
          valor: (intent.amount || 0) / 100,
          moeda: intent.currency || 'BRL',
          status: 'succeeded',
          stripe_session_id: paymentIntentId,
          created_at: new Date().toISOString()
        }]);

        return NextResponse.json({ success: true, message: `Expansão de ${label} ativada!` });
      }
    }

    // Processamento para compra avulsa de Juris
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
      valor: isSetup ? 0 : ((intent.amount || 0) / 100),
      moeda: intent.currency || 'BRL',
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
    console.error("❌ [confirm-payment] Erro CRITICO:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message,
      stack: error.stack,
      name: error.name
    }, { status: 500 });
  }
}
