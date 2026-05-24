import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    let user = null;

    // 1. Tentar Bearer Token (para mobile)
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user: tokenUser }, error } = await supabaseAdmin.auth.getUser(token);
      if (tokenUser && !error) {
        user = tokenUser;
      }
    }

    // 2. Fallback para cookies (web)
    if (!user) {
      const supabase = createClient();
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();
      if (!authError && cookieUser) {
        user = cookieUser;
      }
    }

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const casoId = formData.get('casoId');

    if (!file) {
      return NextResponse.json({ success: false, message: "Arquivo é obrigatório" }, { status: 400 });
    }

    const originalName = file.name || 'audio.webm';
    const fileExt = originalName.split('.').pop();
    const fileName = `chat-attachments/${casoId || 'general'}/${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload using supabaseAdmin (bypasses RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('cases')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || 'application/octet-stream'
      });

    if (uploadError) {
      console.error("Erro no Storage (cases chat upload):", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('cases')
      .getPublicUrl(filePath);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      fileName: originalName,
      fileType: file.type || 'application/octet-stream'
    });

  } catch (error) {
    console.error("Erro no upload do anexo do chat:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Erro ao fazer upload do anexo" 
    }, { status: 500 });
  }
}
