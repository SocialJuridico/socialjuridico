import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

async function ensureAdmin(db, userId) {
  const { data: admin, error } = await db
    .from("admins")
    .select("id, role")
    .eq("id", userId)
    .eq("role", "ADMIN")
    .single();

  if (error || !admin) return false;
  return true;
}

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const isAdmin = await ensureAdmin(supabaseAdmin || supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito a administradores" },
        { status: 403 },
      );
    }

    const { imported, skipped, errors } = await syncStripeTransactions();
    
    if (errors.length > 0) {
      console.warn("⚠️ Sincronização concluída com avisos:", errors);
    }

    return NextResponse.json({ 
      success: true, 
      imported, 
      skipped, 
      errors: errors.slice(0, 10) 
    });
  } catch (error) {
    console.error("Erro na sincronização de transações:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor: " + error.message },
      { status: 500 },
    );
  }
}

async function syncStripeTransactions() {
  const results = { imported: 0, skipped: 0, errors: [] };

  // 1. Sincronizar Checkout Sessions (Fluxo Antigo)
  try {
    const sessions = await stripe.checkout.sessions.list({ limit: 50, status: 'complete' });
    for (const session of sessions.data) {
      const res = await processGenericTransaction(session, 'SESSION');
      if (res.success) results.imported++; else results.skipped++;
    }
  } catch (e) { results.errors.push("Erro ao listar sessões: " + e.message); }

  // 2. Sincronizar Payment Intents (Checkout Transparente)
  try {
    const intents = await stripe.paymentIntents.list({ limit: 50 });
    for (const intent of intents.data.filter(i => i.status === 'succeeded')) {
      const res = await processGenericTransaction(intent, 'INTENT');
      if (res.success) results.imported++; else results.skipped++;
    }
  } catch (e) { results.errors.push("Erro ao listar intents: " + e.message); }

  return results;
}

async function processGenericTransaction(obj, source) {
  try {
    const userId = obj.metadata?.userId;
    const email = obj.customer_email || obj.receipt_email || obj.customer_details?.email;
    
    let finalUserId = userId;
    if (!finalUserId && email) {
      const { data: adv } = await supabaseAdmin.from('advogados').select('id').eq('email', email).maybeSingle();
      if (adv) finalUserId = adv.id;
    }

    if (!finalUserId) return { success: false, reason: 'no_user' };

    const type = obj.metadata?.type || 'JURIS_PURCHASE';
    const amount = (obj.amount_total || obj.amount || 0) / 100;

    const { error } = await supabaseAdmin
      .from('transacoes')
      .insert([{
        advogado_id: finalUserId,
        tipo: type,
        valor: amount,
        moeda: (obj.currency || 'BRL').toUpperCase(),
        status: 'succeeded',
        juris_amount: type === 'PRO_SUBSCRIPTION' ? (obj.metadata?.planType === 'PRO' ? 20 : 0) : 0,
        stripe_session_id: obj.id,
        cupom_id: obj.metadata?.cupomId || null,
        created_at: new Date((obj.created) * 1000).toISOString()
      }]);

    // Ignorar erro de duplicidade (já importado)
    if (error && error.code !== '23505') return { success: false, reason: error.message };
    return { success: true };
  } catch (e) {
    return { success: false, reason: e.message };
  }
}
