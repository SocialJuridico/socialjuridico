import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Casos API: Usuário não autenticado", authError);
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    console.log(`Buscando casos para o usuário ID: ${user.id} (${user.email})`);

    // Usamos supabaseAdmin para garantir que RLS não bloqueie a visualização em dev
    const { data, error } = await supabaseAdmin
      .from('casos')
      .select('*')
      .eq('cliente_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
        console.error("Erro ao buscar casos no Supabase:", error);
        throw error;
    }

    // Se não achou nada, talvez os casos estejam vinculados ao email dele em outro ID?
    // (Apenas para debug em desenvolvimento)
    if (data.length === 0) {
        console.log("Nenhum caso encontrado para este ID. Verificando por email...");
        const { data: profile } = await supabaseAdmin.from('clientes').select('id').eq('email', user.email).single();
        if (profile && profile.id !== user.id) {
             const { data: emailData } = await supabaseAdmin.from('casos').select('*').eq('cliente_id', profile.id);
             if (emailData && emailData.length > 0) {
                  console.log(`Encontrados ${emailData.length} casos vinculados a outro ID deste email. Retornando-os.`);
                  return NextResponse.json({ success: true, data: emailData });
             }
        }
    }

    return NextResponse.json({ success: true, data: data || [] });

  } catch (error) {
    console.error("Erro na API de Casos:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, titulo, descricao, area_atuacao } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "ID do caso é obrigatório" }, { status: 400 });
    }

    console.log(`Atualizando caso ${id} para o usuário ${user.id}`);

    const { data, error } = await supabaseAdmin
      .from('casos')
      .update({
        titulo,
        descricao,
        area_atuacao,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('cliente_id', user.id)   // Garante que o cliente só edite os próprios casos
      .select();

    if (error) {
      console.error("Erro Supabase ao atualizar caso:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, message: "Caso não encontrado ou sem permissão" }, { status: 404 });
    }

    console.log("Caso atualizado:", data[0]);
    return NextResponse.json({ success: true, data: data[0] });

  } catch (error) {
    console.error("Erro na API PUT /api/casos:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
