import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const [contratos, procuracoes, provas, notificacoes] = await Promise.all([
      supabaseAdmin.from('blindagem_contratos').select('*').eq('lawyer_id', user.id),
      supabaseAdmin.from('blindagem_procuracoes').select('*').eq('lawyer_id', user.id),
      supabaseAdmin.from('blindagem_provas').select('*').eq('lawyer_id', user.id),
      supabaseAdmin.from('blindagem_notificacoes').select('*').eq('lawyer_id', user.id),
    ]);

    const allDocs = [];

    if (contratos.data) contratos.data.forEach(d => allDocs.push({ ...d, type: 'Contrato' }));
    if (procuracoes.data) procuracoes.data.forEach(d => allDocs.push({ ...d, type: 'Procuração' }));
    if (provas.data) provas.data.forEach(d => allDocs.push({ ...d, type: 'Prova Digital' }));
    if (notificacoes.data) notificacoes.data.forEach(d => allDocs.push({ ...d, type: 'Notificação' }));

    allDocs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return NextResponse.json({ success: true, data: allDocs });
  } catch (error) {
    console.error("Erro GET /api/crm/blindagem:", error);
    return NextResponse.json({ success: false, message: "Erro ao buscar blindagens" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Não autorizado" },
        { status: 401 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type"); // 'contrato', 'procuracao', 'prova', 'notificacao'
    const clientId = formData.get("client_id"); // Opcional

    if (!file || !type) {
      return NextResponse.json(
        { success: false, message: "Arquivo e Tipo são obrigatórios" },
        { status: 400 },
      );
    }

    // Mapear tabelas
    const tableMap = {
      'contrato': 'blindagem_contratos',
      'procuracao': 'blindagem_procuracoes',
      'prova': 'blindagem_provas',
      'notificacao': 'blindagem_notificacoes'
    };

    const tableName = tableMap[type];
    if (!tableName) {
      return NextResponse.json(
        { success: false, message: "Tipo de blindagem inválido" },
        { status: 400 },
      );
    }

    // Verificação de Juris para Plano Start
    const { data: adv } = await supabaseAdmin
      .from("advogados")
      .select("is_premium, plan_type, balance")
      .eq("id", user.id)
      .single();

    const isStart = adv?.plan_type === "START";
    
    if (isStart) {
      if ((adv.balance || 0) < 4) {
        return NextResponse.json({
          success: false,
          message: "Saldo insuficiente. Você precisa de 4 Juris para blindar o documento.",
          error_type: "INSUFFICIENT_JURIS"
        }, { status: 402 });
      }
    }

    // Gerar Hash e Metadados
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash("sha512").update(buffer).digest("hex");
    
    const uploadIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Desconhecido";
    const userAgent = request.headers.get("user-agent") || "Navegador Desconhecido";
    const protocol = `BLD${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Upload para o Storage
    const fileExt = file.name.split(".").pop();
    const filePath = `blindagem/${type}/${crypto.randomUUID()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("crm_documents")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Erro no Storage:", uploadError);
      throw uploadError;
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("crm_documents").getPublicUrl(filePath);

    // Salvar na tabela correspondente
    const docData = {
      id: crypto.randomUUID(),
      client_id: clientId || null,
      lawyer_id: user.id,
      file_name: file.name,
      file_url: publicUrl,
      protocol: protocol,
      hash_sha512: fileHash,
      upload_ip: uploadIp,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    };

    const { data: insertedDoc, error: insertError } = await supabaseAdmin
      .from(tableName)
      .insert([docData])
      .select();

    if (insertError) {
      console.error("Erro no Banco:", insertError);
      // Rollback storage
      await supabaseAdmin.storage.from("crm_documents").remove([filePath]);
      throw insertError;
    }

    // Cobrar Juris se for START
    if (isStart) {
      const newBalance = (adv.balance || 0) - 4;
      await supabaseAdmin
        .from("advogados")
        .update({ balance: newBalance })
        .eq("id", user.id);
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...insertedDoc[0],
        protocol: protocol,
        hash: fileHash,
        date: docData.created_at
      }
    });
  } catch (error) {
    console.error("Erro POST /api/crm/blindagem:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro ao salvar blindagem" },
      { status: 500 },
    );
  }
}
