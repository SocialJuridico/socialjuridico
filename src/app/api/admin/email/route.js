import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { getRoleFromDatabase } from "@/lib/securityUtils";
import { NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { comunicadoAdminTemplate } from "@/lib/emailTemplates";

export async function POST(request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, message: "Não autorizado" }, { status: 401 });
    }

    const db = supabaseAdmin || supabase;
    const role = await getRoleFromDatabase(db, user.id);
    if (role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Apenas administradores podem enviar emails." }, { status: 403 });
    }

    const { targetMode, targetId, title, message } = await request.json();

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ success: false, message: "Título e mensagem são obrigatórios." }, { status: 400 });
    }

    let recipients = []; // Array de { name, email }

    switch (targetMode) {
      case "EMAIL_TODOS_ADVOGADOS": {
        const { data, error } = await db.from("advogados").select("name, email").not("email", "is", null);
        if (error) throw error;
        recipients = (data || []).filter(r => r.email);
        break;
      }
      case "EMAIL_TODOS_CLIENTES": {
        const { data, error } = await db.from("clientes").select("name, email").not("email", "is", null);
        if (error) throw error;
        recipients = (data || []).filter(r => r.email);
        break;
      }
      case "EMAIL_TODOS_ANUNCIANTES": {
        const { data, error } = await db.from("anunciantes").select("nome, email").not("email", "is", null);
        if (error) throw error;
        recipients = (data || []).map(r => ({ name: r.nome, email: r.email })).filter(r => r.email);
        break;
      }
      case "EMAIL_ADVOGADO_ESPECIFICO": {
        if (!targetId) {
          return NextResponse.json({ success: false, message: "Selecione um advogado." }, { status: 400 });
        }
        const { data, error } = await db.from("advogados").select("name, email").eq("id", targetId).single();
        if (error || !data?.email) {
          return NextResponse.json({ success: false, message: "Advogado não encontrado ou sem email." }, { status: 404 });
        }
        recipients = [data];
        break;
      }
      case "EMAIL_CLIENTE_ESPECIFICO": {
        if (!targetId) {
          return NextResponse.json({ success: false, message: "Selecione um cliente." }, { status: 400 });
        }
        const { data, error } = await db.from("clientes").select("name, email").eq("id", targetId).single();
        if (error || !data?.email) {
          return NextResponse.json({ success: false, message: "Cliente não encontrado ou sem email." }, { status: 404 });
        }
        recipients = [data];
        break;
      }
      case "EMAIL_ANUNCIANTE_ESPECIFICO": {
        if (!targetId) {
          return NextResponse.json({ success: false, message: "Selecione um anunciante." }, { status: 400 });
        }
        const { data, error } = await db.from("anunciantes").select("nome, email").eq("id", targetId).single();
        if (error || !data?.email) {
          return NextResponse.json({ success: false, message: "Anunciante não encontrado ou sem email." }, { status: 404 });
        }
        recipients = [{ name: data.nome, email: data.email }];
        break;
      }
      default:
        return NextResponse.json({ success: false, message: "Modo de envio inválido." }, { status: 400 });
    }

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, message: "Nenhum destinatário encontrado com email válido." }, { status: 404 });
    }

    // Deduplicar emails
    const seenEmails = new Set();
    const uniqueRecipients = recipients.filter(r => {
      const email = r.email?.trim().toLowerCase();
      if (!email || seenEmails.has(email)) return false;
      seenEmails.add(email);
      return true;
    });

    console.log(`📧 [Admin Email] Enviando "${title}" para ${uniqueRecipients.length} destinatário(s) (modo: ${targetMode})...`);

    // Enviar via Batch API (lotes de 100)
    const BATCH_SIZE = 100;
    const DELAY_BETWEEN_BATCHES_MS = 1500;
    let totalEnviados = 0;

    for (let i = 0; i < uniqueRecipients.length; i += BATCH_SIZE) {
      const batch = uniqueRecipients.slice(i, i + BATCH_SIZE);

      const emailPayloads = batch.map(r => ({
        from: 'Social Jurídico <contato@socialjuridico.com.br>',
        to: [r.email.trim()],
        subject: `⚖️ ${title.trim()}`,
        html: comunicadoAdminTemplate({
          recipientName: r.name || 'Usuário',
          titulo: title.trim(),
          mensagem: message.trim(),
        }),
      }));

      try {
        const { error: batchError } = await resend.batch.send(emailPayloads);
        if (batchError) {
          console.error(`⚠️ Erro no lote:`, batchError);
        } else {
          totalEnviados += batch.length;
        }
      } catch (batchErr) {
        console.error(`❌ Falha no lote:`, batchErr.message);
      }

      // Delay entre lotes
      if (i + BATCH_SIZE < uniqueRecipients.length) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    console.log(`✅ [Admin Email] ${totalEnviados}/${uniqueRecipients.length} emails enviados`);

    return NextResponse.json({
      success: true,
      message: `Email enviado com sucesso para ${totalEnviados} destinatário(s)!`,
      data: { totalDestinatarios: uniqueRecipients.length, enviados: totalEnviados },
    });

  } catch (error) {
    console.error("Erro na API POST /api/admin/email:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Erro interno no servidor ao enviar emails." },
      { status: 500 }
    );
  }
}
