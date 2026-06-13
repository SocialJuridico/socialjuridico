import crypto from "node:crypto";

import {
  novaMensagemClienteTemplate,
  novaMensagemTemplate,
} from "@/lib/emailTemplates";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";

const FROM = "Social Jurídico <contato@socialjuridico.com.br>";

export function chatConversationUrl(role, caseId, interestId = null) {
  if (role === "LAWYER") {
    const params = new URLSearchParams({ caso: caseId });
    if (interestId) params.set("interest", interestId);
    return `/dashboard/advogado/mensagens?${params.toString()}`;
  }

  return `/chat/${encodeURIComponent(caseId)}${
    interestId ? `?interest=${encodeURIComponent(interestId)}` : ""
  }`;
}

function resolveRecipient({ senderId, caseItem, interest }) {
  if (interest) {
    return String(senderId) === String(caseItem.cliente_id)
      ? interest.lawyer_id
      : caseItem.cliente_id;
  }

  return String(senderId) === String(caseItem.cliente_id)
    ? caseItem.advogado_id
    : caseItem.cliente_id;
}

export async function notifyChatMessage({
  db,
  senderId,
  senderRole,
  caseItem,
  interest,
}) {
  const recipientId = resolveRecipient({ senderId, caseItem, interest });
  if (!recipientId || String(recipientId) === String(senderId)) return;

  const recipientRole =
    String(recipientId) === String(caseItem.cliente_id) ? "CLIENT" : "LAWYER";
  const url = chatConversationUrl(
    recipientRole,
    caseItem.id,
    interest?.id || null,
  );
  const title = "Nova mensagem no chat";
  const message = `Você recebeu uma nova mensagem no caso “${caseItem.titulo || "Caso jurídico"}”.`;

  const { error: notificationError } = await db.from("notificacoes").insert([
    {
      id: crypto.randomUUID(),
      user_id: recipientId,
      titulo: title,
      mensagem: message,
      lida: false,
      created_at: new Date().toISOString(),
      tipo: "MENSAGEM",
      meta: JSON.stringify({
        case_id: caseItem.id,
        interest_id: interest?.id || null,
      }),
      link: url,
    },
  ]);

  if (notificationError) throw notificationError;

  await sendPushNotification({
    userIds: [recipientId],
    title: "Nova mensagem! 💬",
    message,
    url,
  }).catch((error) => {
    console.error("[Chat] Push não enviado:", error?.message || error);
  });

  if (!resend) return;

  if (recipientRole === "LAWYER") {
    const { data: lawyer } = await db
      .from("advogados")
      .select("name, email")
      .eq("id", recipientId)
      .maybeSingle();

    if (!lawyer?.email) return;
    await resend.emails
      .send({
        from: FROM,
        to: lawyer.email,
        subject: `💬 Nova mensagem no caso “${caseItem.titulo || "Caso"}”`,
        html: novaMensagemTemplate({
          lawyerName: lawyer.name || "Advogado(a)",
          casoTitulo: caseItem.titulo || "Caso",
        }),
      })
      .catch((error) => {
        console.error("[Chat] E-mail ao advogado não enviado:", error);
      });
    return;
  }

  const [{ data: client }, { data: lawyerSender }] = await Promise.all([
    db
      .from("clientes")
      .select("name, email")
      .eq("id", recipientId)
      .maybeSingle(),
    senderRole === "LAWYER"
      ? db
          .from("advogados")
          .select("name")
          .eq("id", senderId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!client?.email) return;
  await resend.emails
    .send({
      from: FROM,
      to: client.email,
      subject: `💬 Nova mensagem do advogado no caso “${caseItem.titulo || "Caso"}”`,
      html: novaMensagemClienteTemplate({
        clientName: client.name || "Cliente",
        casoTitulo: caseItem.titulo || "Caso",
        lawyerName: lawyerSender?.name || "Seu advogado",
      }),
    })
    .catch((error) => {
      console.error("[Chat] E-mail ao cliente não enviado:", error);
    });
}

export async function pushVideoInvite({ clientId, caseId, caseTitle }) {
  if (!clientId) return;
  await sendPushNotification({
    userIds: [clientId],
    title: "Videochamada disponível 📹",
    message: `O advogado iniciou uma videochamada no caso “${caseTitle || "Caso jurídico"}”.`,
    url: `/chat/${encodeURIComponent(caseId)}`,
  }).catch((error) => {
    console.error("[Chat/Vídeo] Push não enviado:", error?.message || error);
  });
}
