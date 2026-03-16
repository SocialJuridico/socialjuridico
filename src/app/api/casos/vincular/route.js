
import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { casoId } = await request.json();

    if (!casoId) {
      return NextResponse.json({ success: false, message: "ID do caso é obrigatório" }, { status: 400 });
    }

    // 1. Verificar se o usuário é um advogado
    const role = user.user_metadata?.role;
    if (role !== 'LAWYER') {
      return NextResponse.json({ success: false, message: "Apenas advogados podem assumir casos" }, { status: 403 });
    }

    // 2. Verificar se o caso ainda está disponível
    const { data: caso, error: fetchError } = await supabaseAdmin
      .from('casos')
      .select('id, status, advogado_id')
      .eq('id', casoId)
      .single();

    if (fetchError || !caso) {
      return NextResponse.json({ success: false, message: "Caso não encontrado" }, { status: 404 });
    }

    if (caso.advogado_id) {
      return NextResponse.json({ success: false, message: "Este caso já possui um advogado vinculado" }, { status: 400 });
    }

    // 3. Vincular o advogado ao caso
    const { error: updateError } = await supabaseAdmin
      .from('casos')
      .update({
        advogado_id: user.id,
        status: 'EM_ANDAMENTO',
        updated_at: new Date().toISOString()
      })
      .eq('id', casoId);

    if (updateError) throw updateError;

    // 4. Criar notificação para o cliente
    const { data: casoFull } = await supabaseAdmin.from('casos').select('cliente_id, titulo').eq('id', casoId).single();
    if (casoFull) {
        await supabaseAdmin.from('notificacoes').insert([{
            user_id: casoFull.cliente_id,
            titulo: 'Advogado vinculado!',
            mensagem: `O advogado assumiu o seu caso: ${casoFull.titulo}. Você já pode iniciar uma conversa.`,
            lida: false,
            created_at: new Date().toISOString()
        }]);
    }

    return NextResponse.json({ success: true, message: "Caso vinculado com sucesso" });

  } catch (error) {
    console.error("Erro ao vincular caso:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}
