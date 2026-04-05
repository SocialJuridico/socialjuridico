import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  const { data, error } = await supabase
    .from('cupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { codigo, tipo, desconto_tipo, valor, limite_por_usuario, expira_em } = body;

    // 1. Criar o cupom no Stripe primeiro
    // Isso garante que temos um ID válido do Stripe antes de salvar no DB
    const stripeParams = {
      name: codigo.toUpperCase(),
      id: codigo.toUpperCase() + '_' + Date.now(), // ID único para o Stripe
      duration: 'once', // O desconto se aplica uma vez (na primeira fatura ou no pagamento único)
    };

    if (desconto_tipo === 'PERCENTUAL') {
      stripeParams.percent_off = parseFloat(valor);
    } else {
      stripeParams.amount_off = Math.round(parseFloat(valor) * 100); // centavos
      stripeParams.currency = 'brl';
    }

    const stripeCoupon = await stripe.coupons.create(stripeParams);

    // 2. Salvar no nosso banco de dados
    const { data, error } = await supabase
      .from('cupons')
      .insert([{
        codigo: codigo.toUpperCase(),
        tipo,
        desconto_tipo,
        valor,
        limite_por_usuario,
        expira_em,
        stripe_coupon_id: stripeCoupon.id, // Armazenando o ID gerado pelo Stripe
        ativo: true
      }])
      .select();

    if (error) {
      // Rollback no Stripe se falhar no DB
      await stripe.coupons.del(stripeCoupon.id);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Erro ao criar cupom no Stripe:', error);
    return NextResponse.json({ error: 'Erro ao criar cupom no Stripe: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // Buscar o stripe_coupon_id antes de deletar
  const { data: cupom } = await supabase.from('cupons').select('stripe_coupon_id').eq('id', id).single();

  if (cupom?.stripe_coupon_id) {
    try {
      await stripe.coupons.del(cupom.stripe_coupon_id);
    } catch (e) {
      console.warn('Erro ao deletar cupom no stripe (já pode ter sido removido):', e);
    }
  }

  const { error } = await supabase
    .from('cupons')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
