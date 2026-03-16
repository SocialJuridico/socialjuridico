import { createClient } from '@/lib/supabaseServer';
import { supabaseAdmin } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET /api/crm/documents?client_id=... (se sem client_id, busca todos do advogado)
export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('client_id');

    let query = supabaseAdmin
      .from('crm_documents')
      .select('*, crm_clients(lawyer_id, name)');

    if (clientId) {
      query = query.eq('client_id', clientId);
    } else {
      // Busca documentos vinculados a clientes do advogado OU documentos avulsos do advogado
      query = query.eq('lawyer_id', user.id);
    }

    const { data: docs, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Formatar para incluir o nome do cliente no nível raiz do objeto
    const formattedDocs = docs.map(d => ({
      ...d,
      client_name: d.crm_clients?.name
    }));

    return NextResponse.json({ success: true, data: formattedDocs || [] });
  } catch (error) {
    console.error("Erro GET /api/crm/documents:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar documentos" }, { status: 500 });
  }
}

// POST /api/crm/documents
export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const clientId = formData.get('client_id'); // Opcional no Smart Docs

    if (!file) {
      return NextResponse.json({ success: false, message: "Arquivo é obrigatório" }, { status: 400 });
    }

    console.log("Iniciando upload. Cliente:", clientId || 'Nenhum (SmartDoc Geral)');
    const fileExt = file.name.split('.').pop();
    const folder = clientId ? clientId : `lawyer_${user.id}`;
    const fileName = `${folder}/${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 1. Upload para o Storage
    console.log("Enviando para storage bucket crm_documents, path:", filePath);
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('crm_documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error("Erro no Storage:", uploadError);
      throw uploadError;
    }

    // 2. Pegar URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('crm_documents')
      .getPublicUrl(filePath);
    
    // 3. AI Processing (Auto-Tagging & Categorization) con OPENAI
    let aiData = { type: 'Outros', tags: ['Documento'] };
    try {
      if (process.env.OPENAI_API_KEY) {
        const aiPrompt = `Analise este arquivo jurídico: "${file.name}". 
        Determine o TIPO (Petição, Contrato, Sentença, Procuração, Outros) e gere 3 tags relevantes. 
        Responda EXCLUSIVAMENTE em formato JSON: {"type": "Tipo", "tags": ["tag1", "tag2", "tag3"]}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: "Você é um assistente jurídico especializado em organização de documentos brasileiros." },
            { role: "user", content: aiPrompt }
          ],
          response_format: { type: "json_object" }
        });

        const text = completion.choices[0].message.content;
        aiData = JSON.parse(text);
      }
    } catch (aiErr) {
      console.error("Erro AI Auto-Tag (OpenAI):", aiErr);
    }

    // 4. Salvar na tabela crm_documents
    const docData = {
      id: crypto.randomUUID(),
      client_id: clientId || null,
      lawyer_id: user.id, // Importante para o Smart Docs geral
      file_name: file.name,
      file_url: publicUrl,
      doc_type: aiData.type,
      tags: aiData.tags,
      created_at: new Date().toISOString()
    };

    console.log("Inserindo no banco dados:", docData);
    const { data: insertedDoc, error: insertError } = await supabaseAdmin
      .from('crm_documents')
      .insert([docData])
      .select();

    if (insertError) {
      console.error("Erro no Banco:", insertError);
      await supabaseAdmin.storage.from('crm_documents').remove([filePath]);
      throw insertError;
    }

    return NextResponse.json({ success: true, data: insertedDoc[0] });

  } catch (error) {
    console.error("Erro POST /api/crm/documents:", error);
    return NextResponse.json({ success: false, message: error.message || "Erro ao salvar documento" }, { status: 500 });
  }
}

// DELETE /api/crm/documents?id=...&path=...
export async function DELETE(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('id');
    const filePath = searchParams.get('path');

    if (!docId || !filePath) {
      return NextResponse.json({ success: false, message: "ID e Path são obrigatórios" }, { status: 400 });
    }

    // 1. Remover do Storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('crm_documents')
      .remove([filePath]);

    if (storageError) throw storageError;

    // 2. Remover da Tabela
    const { error: dbError } = await supabaseAdmin
      .from('crm_documents')
      .delete()
      .eq('id', docId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: "Documento excluído" });

  } catch (error) {
    console.error("Erro DELETE /api/crm/documents:", error);
    return NextResponse.json({ success: false, message: "Erro ao excluir documento" }, { status: 500 });
  }
}

