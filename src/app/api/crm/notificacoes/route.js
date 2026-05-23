import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { resend } from "@/lib/resend";

async function getSessionUser(request) {
  if (request) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
      if (user && !error) {
        const { data: adv, error: advError } = await supabaseAdmin
          .from("advogados")
          .select("id, name, cargo, escritorio_id")
          .eq("id", user.id)
          .single();
        
        if (adv && !advError) {
          return {
            id: adv.id,
            name: adv.name,
            cargo: adv.cargo || "advogado",
            escritorio_id: adv.escritorio_id || null,
            isOfficeAdmin: false
          };
        }
      }
    }
  }

  const cookieStore = await cookies();
  const supabase = createClient();
  const db = supabaseAdmin || supabase;
  
  // 1. Verificação via Cookie do Escritório (Administrador / Gestor)
  const sessionCookie = cookieStore.get("sj_escritorio_session");
  if (sessionCookie?.value) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionCookie.value, "base64").toString("utf8"));
      return {
        id: decoded.id,
        name: `${decoded.nome} (Gestor)`,
        cargo: "admin",
        escritorio_id: decoded.id,
        isOfficeAdmin: true
      };
    } catch (e) {
      console.error("Erro ao decodificar cookie de escritorio:", e);
    }
  }

  // 2. Verificação via Supabase Auth (Advogado / Membro Normal)
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (user && !error) {
      const { data: adv, error: advError } = await db
        .from("advogados")
        .select("id, name, cargo, escritorio_id")
        .eq("id", user.id)
        .single();
      
      if (adv && !advError) {
        return {
          id: adv.id,
          name: adv.name,
          cargo: adv.cargo || "advogado",
          escritorio_id: adv.escritorio_id || null,
          isOfficeAdmin: false
        };
      }
    }
  } catch (e) {
    console.error("Erro ao obter usuario autenticado:", e);
  }

  return null;
}

export async function POST(request) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    let file = formData.get("file");
    const draft_text = formData.get("draft_text");
    const destinatario_email = formData.get("destinatario_email");
    const tone = formData.get("tone");
    const case_id = formData.get("case_id");
    const client_id = formData.get("client_id");

    if (!file && !draft_text) {
      return NextResponse.json({ success: false, message: "Arquivo ou Minuta de notificação é obrigatória" }, { status: 400 });
    }

    if (!destinatario_email) {
      return NextResponse.json({ success: false, message: "E-mail do destinatário é obrigatório" }, { status: 400 });
    }

    // Rastreamento e Metadados
    const uploadIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "Desconhecido";
    const userAgent = request.headers.get("user-agent") || "Navegador Desconhecido";
    const protocol = `NTF${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const accessToken = crypto.randomUUID();

    let fileBuffer;
    let fileName;
    let fileHash;
    let fileExt = "pdf";

    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = file.name;
      fileHash = crypto.createHash("sha512").update(fileBuffer).digest("hex");
      fileExt = file.name.split(".").pop();
    } else {
      // Gerar PDF da Notificação no Servidor usando jsPDF
      const { jsPDF } = require("jspdf");
      const docPdf = new jsPDF();
      const pageWidth = docPdf.internal.pageSize.getWidth();
      
      docPdf.setFillColor(0, 200, 118);
      docPdf.rect(0, 0, pageWidth, 15, 'F');
      
      docPdf.setFont("helvetica", "bold");
      docPdf.setFontSize(14);
      docPdf.setTextColor(255, 255, 255);
      docPdf.text("NOTIFICAÇÃO EXTRAJUDICIAL", 15, 10);
      
      docPdf.setFont("helvetica", "normal");
      docPdf.setFontSize(10);
      docPdf.setTextColor(50, 50, 50);
      
      const cleanedDraft = draft_text
        .replace(/\*\*/g, "")
        .replace(/#/g, "")
        .replace(/^---\s*$/gm, "")
        .trim();

      const splitContent = docPdf.splitTextToSize(cleanedDraft, pageWidth - 40);
      docPdf.text(splitContent, 20, 40);
      
      const arrayBuffer = docPdf.output('arraybuffer');
      fileBuffer = Buffer.from(arrayBuffer);
      fileName = `Notificacao_${protocol}.pdf`;
      fileHash = crypto.createHash("sha512").update(fileBuffer).digest("hex");
    }

    // Upload para o Storage
    const filePath = `blindagem/notificacao/${crypto.randomUUID()}.${fileExt}`;
    const mimeTypes = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png'
    };
    const contentType = mimeTypes[fileExt.toLowerCase()] || 'application/octet-stream';

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("crm_documents")
      .upload(filePath, fileBuffer, {
        contentType,
        duplex: 'half'
      });

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
      file_name: fileName,
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

    // Buscar dados do advogado ou escritório para o e-mail
    let senderName = "um advogado parceiro";
    
    const { data: adv } = await supabaseAdmin
      .from("advogados")
      .select("name")
      .eq("id", user.id)
      .maybeSingle();

    if (adv?.name) {
      senderName = `advogado ${adv.name}`;
    } else {
      const { data: office } = await supabaseAdmin
        .from("escritorios")
        .select("nome")
        .eq("id", user.id)
        .maybeSingle();

      if (office?.nome) {
        senderName = office.nome;
      }
    }

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
            <p>Você recebeu uma Notificação Extrajudicial enviada por <strong>${senderName}</strong> através da plataforma Social Jurídico.</p>
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
