import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET /api/crm/agenda -> Lista compromissos do advogado logado
export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('agenda_items')
      .select('*')
      .eq('lawyer_id', user.id)
      .order('date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });

  } catch (error) {
    console.error("Erro GET /api/crm/agenda:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar agenda" }, { status: 500 });
  }
}

// POST /api/crm/agenda -> Cria novo compromisso
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    
    const payload = {
      id: crypto.randomUUID(), // Garantir ID se não houver default no banco
      title: body.title,
      date: body.date,
      description: body.description,
      type: body.type,
      urgency: body.urgency,
      client_id: body.client_id,
      status: body.status || "PENDING",
      lawyer_id: user.id,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('agenda_items')
      .insert([payload])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Erro POST /api/crm/agenda:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Erro ao salvar compromisso",
      details: error
    }, { status: 500 });
  }
}

// PATCH /api/crm/agenda -> Atualiza compromisso existente
export async function PATCH(request) {
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
  
      if (authError || !user) {
        return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
      }
  
      const body = await request.json();
      const { id, ...updateData } = body;

      if (!id) return NextResponse.json({ success: false, message: "ID obrigatório" }, { status: 400 });

      // Mapear campos se necessário e garantir que lawyer_id seja do usuário logado
      const payload = {
        ...updateData,
        lawyer_id: user.id
      };

      const { error } = await supabaseAdmin
        .from('agenda_items')
        .update(payload)
        .eq('id', id)
        .eq('lawyer_id', user.id);
  
      if (error) throw error;
  
      return NextResponse.json({ success: true });
  
    } catch (error) {
      console.error("Erro PATCH /api/crm/agenda:", error);
      return NextResponse.json({ 
        success: false, 
        message: error.message || "Erro ao atualizar agenda",
        details: error
      }, { status: 500 });
    }
}

// DELETE /api/crm/agenda -> Exclui compromisso
export async function DELETE(request) {
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
  
      if (authError || !user) {
        return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
      }
  
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      if (!id) return NextResponse.json({ success: false, message: "ID obrigatório" }, { status: 400 });

      const { error } = await supabaseAdmin
        .from('agenda_items')
        .delete()
        .eq('id', id)
        .eq('lawyer_id', user.id);
  
      if (error) throw error;
  
      return NextResponse.json({ success: true });
  
    } catch (error) {
      console.error("Erro DELETE /api/crm/agenda:", error);
      return NextResponse.json({ 
        success: false, 
        message: error.message || "Erro ao excluir agenda",
        details: error
      }, { status: 500 });
    }
}
