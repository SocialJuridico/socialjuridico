import crypto from "node:crypto";

import {
  advogadoContratadoTemplate,
  casoEncerradoTemplate,
  clienteCadastradoCrmTemplate,
  interesseAceitoTemplate,
  interesseRecusadoTemplate,
} from "@/lib/emailTemplates";
import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";

const FROM = "Social Jurídico <contato@socialjuridico.com.br>";

async function loadLawyer(db, lawyerId) {
  const { data, error } = await db
    .from("advogados")
    .select("id, name, email")
    .eq("id", lawyerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Falha ao consultar advogado: ${error.message}`);
  }
  return data || null;
}

async function createNotification(db, payload) {
  const notification = {
    id: crypto.randomUUID(),
    user_id: payload.userId,
    titulo: payload.title,
    mensagem: payload.message,
    lida: false,
    created_at: new Date().toISOString(),
    tipo: payload.type,
    meta: JSON.stringify({ case_id: payload.caseId }),
  };

  const { error } = await db.from("notificacoes").insert([notification]);
  if (error) {
    console.error("[Interesses] Falha ao criar notificação:", error.message);
  }
}

async function sendEmail(payload) {
  if (!process.env.RESEND_API_KEY || !payload.to) return;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
    if (error) console.error("[Interesses] Falha ao enviar e-mail:", error);
  } catch (error) {
    console.error("[Interesses] Exceção no envio de e-mail:", error.message);
  }
}

async function sendPush(payload) {
  try {
    await sendPushNotification({
      userIds: [payload.userId],
      title: payload.title,
      message: payload.message,
      url: payload.url || "/dashboard/advogado",
    });
  } catch (error) {
    console.error("[Interesses] Falha no push:", error.message);
  }
}

async function markFunnelResponse(db, caseId) {
  const { error } = await db
    .from("email_tracking_logs")
    .update({ responded_at: new Date().toISOString() })
    .eq("case_id", caseId)
    .is("responded_at", null);

  if (error && !["42P01", "PGRST205"].includes(error.code)) {
    console.error("[Interesses] Falha no funil:", error.message);
  }
}

async function syncNegotiatingLawyers(db, caseId) {
  const { data: interests, error } = await db
    .from("case_interests")
    .select("lawyer_id")
    .eq("case_id", caseId)
    .eq("status", "NEGOTIATING");

  if (error) {
    console.error("[Interesses] Falha ao consultar negociações:", error.message);
    return;
  }

  const lawyerIds = (interests || []).map((item) => item.lawyer_id);
  if (!lawyerIds.length) {
    await db.from("casos").update({ negotiating_lawyers: [] }).eq("id", caseId);
    return;
  }

  const { data: lawyers, error: lawyerError } = await db
    .from("advogados")
    .select("id, name, avatar")
    .in("id", lawyerIds);

  if (lawyerError) {
    console.error(
      "[Interesses] Falha ao consultar advogados em negociação:",
      lawyerError.message,
    );
    return;
  }

  const cache = (lawyers || []).map((lawyer) => ({
    id: lawyer.id,
    name: lawyer.name,
    avatar: lawyer.avatar,
    initials: String(lawyer.name || "AD").slice(0, 2).toUpperCase(),
  }));

  await db
    .from("casos")
    .update({ negotiating_lawyers: cache })
    .eq("id", caseId);
}

async function syncClientToCrm(db, result, lawyer) {
  const { data: client, error: clientError } = await db
    .from("clientes")
    .select("id, name, email, phone")
    .eq("id", result.client_id)
    .maybeSingle();

  if (clientError || !client) {
    if (clientError) {
      console.error("[Interesses/CRM] Falha ao consultar cliente:", clientError.message);
    }
    return;
  }

  const { data: existing, error: existingError } = await db
    .from("crm_clients")
    .select("id")
    .eq("lawyer_id", result.lawyer_id)
    .eq("email", client.email)
    .maybeSingle();

  if (existingError) {
    console.error("[Interesses/CRM] Falha ao consultar CRM:", existingError.message);
    return;
  }

  let crmClientId = existing?.id;
  if (crmClientId) {
    await db
      .from("crm_clients")
      .update({
        notes: `Cliente vinculado ao caso “${result.case_title}”. Status: ativo.`,
      })
      .eq("id", crmClientId);
  } else {
    crmClientId = crypto.randomUUID();
    const { error: insertError } = await db.from("crm_clients").insert([
      {
        id: crmClientId,
        lawyer_id: result.lawyer_id,
        name: client.name || "Cliente",
        email: client.email,
        phone: client.phone || "",
        status: "Ativo",
        type: "Pessoa Física",
        notes: `Adicionado automaticamente após a contratação no caso “${result.case_title}”.`,
        created_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      console.error("[Interesses/CRM] Falha ao inserir cliente:", insertError.message);
      return;
    }
  }

  await db.from("crm_interactions").insert([
    {
      id: crypto.randomUUID(),
      client_id: crmClientId,
      lawyer_id: result.lawyer_id,
      type: "CONTRATO",
      content: `Cliente contratou o advogado para o caso “${result.case_title}”.`,
      created_at: new Date().toISOString(),
    },
  ]);

  const attachments = Array.isArray(result.case_attachments)
    ? result.case_attachments
    : [];
  const documents = attachments
    .map((attachment) => {
      if (typeof attachment === "string") {
        return {
          id: crypto.randomUUID(),
          client_id: crmClientId,
          file_name: "Documento do caso",
          file_url: attachment,
          created_at: new Date().toISOString(),
        };
      }

      return {
        id: crypto.randomUUID(),
        client_id: crmClientId,
        file_name:
          attachment?.name || attachment?.fileName || "Documento do caso",
        file_url: attachment?.url || attachment?.fileUrl || "",
        created_at: new Date().toISOString(),
      };
    })
    .filter((item) => item.file_url);

  if (documents.length) {
    await db.from("crm_documents").insert(documents);
  }

  await sendEmail({
    to: lawyer?.email,
    subject: `Cliente cadastrado no CRM — ${result.case_title}`,
    html: clienteCadastradoCrmTemplate({
      lawyerName: lawyer?.name || "Advogado(a)",
      clientName: client.name || "Cliente",
      casoTitulo: result.case_title,
    }),
  });
}

export async function runInterestSideEffects(db, result) {
  await markFunnelResponse(db, result.case_id);
  const lawyer = await loadLawyer(db, result.lawyer_id);

  if (result.action === "DECLINE") {
    await createNotification(db, {
      userId: result.lawyer_id,
      caseId: result.case_id,
      type: "RECUSA",
      title: "Proposta não aceita",
      message: `O cliente decidiu não prosseguir no caso “${result.case_title}”.`,
    });
    await sendPush({
      userId: result.lawyer_id,
      title: "Proposta não aceita",
      message: `O cliente atualizou a negociação do caso “${result.case_title}”.`,
    });
    await sendEmail({
      to: lawyer?.email,
      subject: `Atualização sobre o caso “${result.case_title}”`,
      html: interesseRecusadoTemplate({
        lawyerName: lawyer?.name || "Advogado(a)",
        casoTitulo: result.case_title,
      }),
    });
    await syncNegotiatingLawyers(db, result.case_id);
    return;
  }

  if (result.action === "ACCEPT") {
    await createNotification(db, {
      userId: result.lawyer_id,
      caseId: result.case_id,
      type: "NEGOCIACAO",
      title: "Você entrou em negociação",
      message: `O cliente aceitou sua proposta no caso “${result.case_title}”.`,
    });
    await sendPush({
      userId: result.lawyer_id,
      title: "Negociação iniciada",
      message: `O cliente aceitou sua proposta no caso “${result.case_title}”.`,
    });
    await sendEmail({
      to: lawyer?.email,
      subject: `Proposta aceita no caso “${result.case_title}”`,
      html: interesseAceitoTemplate({
        lawyerName: lawyer?.name || "Advogado(a)",
        casoTitulo: result.case_title,
      }),
    });
    await syncNegotiatingLawyers(db, result.case_id);
    return;
  }

  if (result.action !== "HIRE" || result.already_hired) return;

  await checkAndNotifyLowBalance(
    result.lawyer_id,
    Number(result.previous_balance || 0),
    Number(result.new_balance || 0),
  ).catch((error) => {
    console.error("[Interesses] Falha ao verificar saldo baixo:", error.message);
  });

  await createNotification(db, {
    userId: result.lawyer_id,
    caseId: result.case_id,
    type: "CONTRATACAO",
    title: "Você foi contratado",
    message: `O cliente contratou seus serviços no caso “${result.case_title}”.`,
  });
  await sendPush({
    userId: result.lawyer_id,
    title: "Você foi contratado",
    message: `O cliente escolheu você para o caso “${result.case_title}”.`,
  });
  await sendEmail({
    to: lawyer?.email,
    subject: `Você foi contratado no caso “${result.case_title}”`,
    html: advogadoContratadoTemplate({
      lawyerName: lawyer?.name || "Advogado(a)",
      casoTitulo: result.case_title,
    }),
  });

  const declinedIds = Array.isArray(result.declined_lawyer_ids)
    ? [...new Set(result.declined_lawyer_ids.filter(Boolean))]
    : [];

  if (declinedIds.length) {
    const notifications = declinedIds.map((lawyerId) => ({
      id: crypto.randomUUID(),
      user_id: lawyerId,
      titulo: "Caso encerrado para negociação",
      mensagem: `O cliente escolheu outro profissional para o caso “${result.case_title}”.`,
      lida: false,
      created_at: new Date().toISOString(),
      tipo: "CASO_ENCERRADO",
      meta: JSON.stringify({ case_id: result.case_id }),
    }));
    await db.from("notificacoes").insert(notifications);

    const { data: declinedLawyers } = await db
      .from("advogados")
      .select("name, email")
      .in("id", declinedIds);

    const emails = (declinedLawyers || [])
      .filter((item) => item.email)
      .map((item) => ({
        from: FROM,
        to: [item.email],
        subject: `Caso “${result.case_title}” encerrado`,
        html: casoEncerradoTemplate({
          lawyerName: item.name || "Advogado(a)",
          casoTitulo: result.case_title,
        }),
      }));

    if (emails.length && process.env.RESEND_API_KEY) {
      await resend.batch.send(emails).catch((error) => {
        console.error("[Interesses] Falha nos e-mails de encerramento:", error);
      });
    }
  }

  await syncClientToCrm(db, result, lawyer).catch((error) => {
    console.error("[Interesses/CRM] Falha não fatal:", error.message);
  });
}
