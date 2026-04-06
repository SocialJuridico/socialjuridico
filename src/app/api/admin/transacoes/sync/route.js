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

    // 1. Listar sessões de checkout do Stripe (últimas 100 finalizadas)
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      status: 'complete',
      expand: ['data.line_items']
    });

    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };

    for (const session of sessions.data) {
      try {
        const userId = session.metadata?.userId;
        const type = session.metadata?.type || 'JURIS_PURCHASE'; // Default se não tiver
        const cupomId = session.metadata?.cupomId || null;
        
        let advogadoId = userId;
        
        // Se não tiver userId no metadata, vamos tentar achar pelo email do cliente do Stripe
        if (!advogadoId && session.customer_details?.email) {
          const { data: adv } = await supabaseAdmin
            .from('advogados')
            .select('id')
            .eq('email', session.customer_details.email)
            .single();
          
          if (adv) advogadoId = adv.id;
        }

        if (!advogadoId) {
          results.skipped++;
          continue; // Não conseguimos vincular a nenhum advogado
        }

        // Tentar inserir na tabela de transações
        // Usamos upsert ou conferimos se já existe pelo stripe_session_id
        const { error: insertError } = await supabaseAdmin
          .from('transacoes')
          .insert([{
            advogado_id: advogadoId,
            tipo: type,
            valor: (session.amount_total || 0) / 100,
            moeda: (session.currency || 'BRL').toUpperCase(),
            status: 'succeeded',
            juris_amount: type === 'PRO_SUBSCRIPTION' ? 20 : 0, // Estimativa se não especificado
            stripe_session_id: session.id,
            cupom_id: cupomId,
            created_at: new Date(session.created * 1000).toISOString()
          }], { onConflict: 'stripe_session_id' });

        if (insertError) {
          // Se for erro de duplicidade, só pulamos
          if (insertError.code === '23505') {
            results.skipped++;
          } else {
            results.errors.push(`Erro na sessão ${session.id}: ${insertError.message}`);
          }
        } else {
          results.imported++;
        }

      } catch (err) {
        results.errors.push(`Erro processando sessão ${session.id}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, ...results });

  } catch (error) {
    console.error("Erro na sincronização de transações:", error);
    return NextResponse.json(
      { success: false, message: "Erro interno no servidor" },
      { status: 500 },
    );
  }
}
