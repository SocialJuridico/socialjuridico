import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getUserPlanLimits } from "@/lib/planUtils";

// GET /api/crm -> lista clientes do advogado logado
export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { data: clients, error } = await supabaseAdmin
      .from('crm_clients')
      .select('*')
      .eq('lawyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: clients || [] });

  } catch (error) {
    console.error("Erro na API GET /api/crm:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar clientes" }, { status: 500 });
  }
}

// POST /api/crm -> cadastra novo cliente
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Verificação de Limites do Plano
    const planLimits = await getUserPlanLimits(supabaseAdmin || supabase, user.id);
    if (!planLimits) {
      return NextResponse.json({ success: false, message: "Erro ao ler limites do plano." }, { status: 400 });
    }

    // Contar quantos clientes o advogado já tem
    const { count: currentClients } = await supabaseAdmin
      .from('crm_clients')
      .select('*', { count: 'exact', head: true })
      .eq('lawyer_id', user.id);

    if ((currentClients || 0) >= planLimits.maxCrmClients) {
      return NextResponse.json({ 
        success: false, 
        message: "LIMIT_REACHED", 
        error_type: "QUOTA_EXCEEDED" 
      }, { status: 403 });
    }
    
    // Mapeamento dos campos do frontend para o banco
    const clientData = {
      id: crypto.randomUUID(), // Gera o ID explicitamente para evitar erro de not-null se o DB não tiver default
      lawyer_id: user.id,
      name: body.nome_completo,
      type: body.tipo || 'Pessoa Física',
      cpf_cnpj: body.cpf_cnpj,
      rg: body.rg_ie,
      civil_status: body.estado_civil,
      profession: body.profissao,
      phone: body.telefone,
      address: body.endereco_completo,
      email: body.email,
      notes: body.notas_internas,
      status: 'Ativo',
      risk_score: Math.floor(Math.random() * 100), // Simulação de score inicial
      created_at: new Date().toISOString()
    };

    if (!clientData.name) {
      return NextResponse.json({ success: false, message: "Nome completo é obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('crm_clients')
      .insert([clientData])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Erro na API POST /api/crm:", error);
    return NextResponse.json({ success: false, message: "Erro ao salvar cliente" }, { status: 500 });
  }
}
