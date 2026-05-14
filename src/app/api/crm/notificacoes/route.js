import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { resend } from "@/lib/resend";

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const destinatario_email = formData.get("destinatario_email");
    const tone = formData.get("tone");
    const case_id = formData.get("case_id");
    const client_id = formData.get("client_id");

    if (!file || !destinatario_email) {
      return NextResponse.json({ success: false, message: "Arquivo e E-mail do destinatário são obrigatórios" }, { status: 400 });
    }

    // Gerar Hash e Metadados
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = crypto.createHash("sha512").update(buffer).digest("hex");
    
    const uploadIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Desconhecido";
    const userAgent = request.headers.get("user-agent") || "Navegador Desconhecido";
    const protocol = `NTF${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const accessToken = crypto.randomUUID();

    // Upload para o Storage
    const fileExt = file.name.split(".").pop();
    const filePath = `blindagem/notificacao/${crypto.randomUUID()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("crm_documents")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Erro no Storage:", uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = supabaseAdmin.storage.from("crm_documents").getPublicUrl(filePath);

    // Salvar na tabela blindagem_notificacoes
    const docData = {
      id: crypto.randomUUID(),
      client_id: client_id || null,
      lawyer_id: user.id,
      file_name: file.name,
      file_url: publicUrl,
      protocol: protocol,
      hash_sha512: fileHash,
      upload_ip: uploadIp,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
      status: 'enviado',
      destinatario_email: destinatario_email,
      access_token: accessToken,
      tone: tone,
      case_id: case_id || null
    };

    const { data: insertedDoc, error: insertError } = await supabaseAdmin
      .from('blindagem_notificacoes')
      .insert([docData])
      .select();

    if (insertError) {
      console.error("Erro no Banco:", insertError);
      // Rollback storage
      await supabaseAdmin.storage.from("crm_documents").remove([filePath]);
      throw insertError;
    }

    // Buscar dados do advogado para o e-mail
    const { data: adv } = await supabaseAdmin
      .from("advogados")
      .select("nome")
      .eq("id", user.id)
      .single();

    // Enviar E-mail via Resend
    const viewLink = `https://socialjuridico.com.br/notificacao/${accessToken}`;
    
    try {
      await resend.emails.send({
        from: 'Social Jurídico <contato@socialjuridico.com.br>',
        to: destinatario_email,
        subject: `[NOTIFICAÇÃO EXTRAJUDICIAL] Você recebeu um documento importante`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #d32f2f;">Notificação Extrajudicial</h2>
            <p>Olá,</p>
            <p>Você recebeu uma Notificação Extrajudicial enviada pelo advogado <strong>${adv?.nome || 'um advogado parceiro'}</strong> através da plataforma Social Jurídico.</p>
            <p>Este documento possui validade jurídica e o seu acesso está sendo rastreado para fins de comprovação de entrega.</p>
            <p style="margin: 30px 0;">
              <a href="${viewLink}" style="background: #0070f3; color: #fff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Visualizar Notificação</a>
            </p>
            <p style="font-size: 0.8rem; color: #999;">Se o botão não funcionar, copie e cole o link abaixo no seu navegador:<br>${viewLink}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8rem; color: #999;">Protocolo do documento: ${protocol}</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Erro ao enviar e-mail:", emailError);
      // Não vamos falhar a requisição inteira se o e-mail falhar, mas avisamos no log
      // Idealmente atualizaríamos o status para 'erro_envio'
      await supabaseAdmin
        .from('blindagem_notificacoes')
        .update({ status: 'erro_envio' })
        .eq('id', docData.id);
        
      return NextResponse.json({ 
        success: true, 
        message: "Documento gerado, mas houve um erro ao enviar o e-mail.",
        data: insertedDoc[0]
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Notificação enviada com sucesso!",
      data: {
        ...insertedDoc[0],
        protocol: protocol,
        hash: fileHash,
        date: docData.created_at
      }
    });
  } catch (error) {
    console.error("Erro POST /api/crm/notificacoes:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro ao processar notificação" },
      { status: 500 },
    );
  }
}
