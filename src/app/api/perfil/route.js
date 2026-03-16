import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const clientToUse = supabaseAdmin || supabase;
    let profile = null;

    // Buscar em todas as tabelas
    const tables = ['clientes', 'advogados', 'admins'];
    for (const table of tables) {
      const { data, error } = await clientToUse
        .from(table)
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data && !error) {
        profile = data;
        break;
      }
    }

    if (!profile) {
       return NextResponse.json({ success: false, message: "Perfil não encontrado no banco de dados." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: profile });

  } catch (error) {
    console.error("Erro na API de Perfil:", error);
    return NextResponse.json({ success: false, message: "Erro interno no servidor" }, { status: 500 });
  }
}

export async function PUT(request) {
    try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return NextResponse.json({ success: false }, { status: 401 });

        const body = await request.json();
        const clientToUse = supabaseAdmin || supabase;

        // Atualiza na tabela clientes por padrão (seguindo a lógica anterior)
        const { error: updateError } = await clientToUse
            .from('clientes')
            .update({
                name: body.name,
                phone: body.phone
            })
            .eq('id', user.id);
        
        if (updateError) throw updateError;

        return NextResponse.json({ success: true, message: "Perfil atualizado" });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
