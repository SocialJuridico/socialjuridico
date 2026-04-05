import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { codigo, tipo, advogado_id } = await req.json();

    if (!codigo || !tipo || !advogado_id) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 1. Buscar o cupom
    const { data: cupom, error: fetchError } = await supabase
      .from('cupons')
      .select('*')
      .eq('codigo', codigo.toUpperCase())
      .eq('ativo', true)
      .maybeSingle();

    if (fetchError || !cupom) {
      return NextResponse.json({ error: 'Cupom inválido ou não encontrado' }, { status: 404 });
    }

    // 2. Verificar o tipo (Pro vs Juris)
    if (cupom.tipo !== tipo) {
      return NextResponse.json({ error: `Este cupom é válido apenas para ${cupom.tipo === 'PLANO_PRO' ? 'Plano Pro' : 'Compra de Juris'}` }, { status: 400 });
    }

    // 3. Verificar validade
    const hoje = new Date();
    const expira = new Date(cupom.expira_em);
    if (expira < hoje) {
      return NextResponse.json({ error: 'Este cupom já expirou' }, { status: 400 });
    }

    // 4. Verificar limite de uso por usuário
    const { count, error: countError } = await supabase
      .from('cupom_usos')
      .select('*', { count: 'exact', head: true })
      .eq('cupom_id', cupom.id)
      .eq('advogado_id', advogado_id);

    if (countError) {
      return NextResponse.json({ error: 'Erro ao verificar uso do cupom' }, { status: 500 });
    }

    if (count >= cupom.limite_por_usuario) {
      return NextResponse.json({ error: `Você já atingiu o limite de uso (${cupom.limite_por_usuario}) para este cupom` }, { status: 400 });
    }

    // Retorna os dados do desconto
    return NextResponse.json({
      success: true,
      cupom_id: cupom.id,
      stripe_coupon_id: cupom.stripe_coupon_id, // ESSENCIAL: Passando o ID do Stripe
      desconto_tipo: cupom.desconto_tipo,
      valor: cupom.valor
    });

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}
