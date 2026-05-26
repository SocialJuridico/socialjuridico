import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/authServerUtils';

export async function POST(request) {
  try {
    const user = await getAuthenticatedUser(request);

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
