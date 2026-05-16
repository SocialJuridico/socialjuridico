import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET /api/crm/finance?clientId=...
export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    let query = supabaseAdmin
      .from('crm_finance')
      .select('*')
      .eq('lawyer_id', user.id);
    
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data: financeRecords, error } = await query.order('due_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: financeRecords || [] });

  } catch (error) {
    console.error("Erro na API GET /api/crm/finance:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar registros financeiros" }, { status: 500 });
  }
}

// POST /api/crm/finance -> novo registro
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { client_id, description, amount, status, due_date } = body;

    if (!client_id || !description || !amount) {
      return NextResponse.json({ success: false, message: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const financeData = {
      id: crypto.randomUUID(),
      lawyer_id: user.id,
      client_id,
      description,
      amount: parseFloat(amount),
      status: status || 'PENDENTE',
      due_date: due_date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      paid_at: status === 'PAGO' ? new Date().toISOString() : null
    };

    const { data, error } = await supabaseAdmin
      .from('crm_finance')
      .insert([financeData])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Erro na API POST /api/crm/finance:", error);
    return NextResponse.json({ success: false, message: "Erro ao salvar registro financeiro" }, { status: 500 });
  }
}

// PUT /api/crm/finance -> atualizar status (pagamento)
export async function PUT(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = body;

    const updateData = {
      status,
      paid_at: status === 'PAGO' ? new Date().toISOString() : null
    };

    const { data, error } = await supabaseAdmin
      .from('crm_finance')
      .update(updateData)
      .eq('id', id)
      .eq('lawyer_id', user.id)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Erro na API PUT /api/crm/finance:", error);
    return NextResponse.json({ success: false, message: "Erro ao atualizar status financeiro" }, { status: 500 });
  }
}
