import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

// GET /api/mensagens?caso_id=xxx  -> busca mensagens de um caso
export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const caso_id = searchParams.get('caso_id');

    if (!caso_id) {
      return NextResponse.json({ success: false, message: "caso_id é obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('mensagens')
      .select('*')
      .eq('caso_id', caso_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });

  } catch (error) {
    console.error("Erro na API GET /api/mensagens:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}

// POST /api/mensagens -> envia uma nova mensagem
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { caso_id, content } = body;

    if (!caso_id || !content?.trim()) {
      return NextResponse.json({ success: false, message: "caso_id e conteúdo são obrigatórios" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('mensagens')
      .insert([{
        caso_id,
        sender_id: user.id,
        content: content.trim(),
        is_read: false,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Erro na API POST /api/mensagens:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
