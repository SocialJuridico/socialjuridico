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

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ success: false, message: "Arquivo é obrigatório" }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 1. Upload para o Storage (bucket 'avatars')
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type
      });

    if (uploadError) {
      console.error("Erro no Storage (avatars):", uploadError);
      throw uploadError;
    }

    // 2. Pegar URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // 3. Atualizar a tabela do usuário correspondente (perfil)
    // Precisamos saber em qual tabela o usuário está (clientes ou advogados)
    let profileTable = 'clientes';
    const tables = ['clientes', 'advogados', 'admins'];
    for (const table of tables) {
      const { data } = await supabaseAdmin.from(table).select('id').eq('id', user.id).single();
      if (data) {
        profileTable = table;
        break;
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from(profileTable)
      .update({ avatar: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error("Erro ao atualizar avatar no banco:", updateError);
      throw updateError;
    }

    return NextResponse.json({ 
      success: true, 
      message: "Avatar atualizado com sucesso", 
      url: publicUrl 
    });

  } catch (error) {
    console.error("Erro no upload de avatar:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Erro ao fazer upload do avatar" 
    }, { status: 500 });
  }
}
