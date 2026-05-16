import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET /api/crm/interactions?clientId=... -> busca histórico do cliente
export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, message: "ID do cliente é obrigatório" }, { status: 400 });
    }

    const { data: interactions, error } = await supabaseAdmin
      .from('crm_interactions')
      .select('*')
      .eq('client_id', clientId)
      .eq('lawyer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: interactions || [] });

  } catch (error) {
    console.error("Erro na API GET /api/crm/interactions:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar histórico" }, { status: 500 });
  }
}

// POST /api/crm/interactions -> registra nova interação
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { client_id, content, type } = body;

    if (!client_id || !content) {
      return NextResponse.json({ success: false, message: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const interactionData = {
      id: crypto.randomUUID(),
      lawyer_id: user.id,
      client_id,
      content,
      type: type || 'nota',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('crm_interactions')
      .insert([interactionData])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Erro na API POST /api/crm/interactions:", error);
    return NextResponse.json({ success: false, message: "Erro ao salvar interação" }, { status: 500 });
  }
}
