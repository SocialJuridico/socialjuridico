import {
  novaMensagemClienteTemplate,
  novaMensagemTemplate,
} from "@/lib/emailTemplates";
import {
  conversationQuery,
  messageJson,
  normalizeStoredMessageContent,
  parseNotificationMeta,
  requireMessageUser,
  resolveMessageConversation,
  validateMessageMutationOrigin,
} from "@/lib/messages/messageServer";
import { sendPushNotification } from "@/lib/pushNotifications";
import { resend } from "@/lib/resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_THREAD_MESSAGES = 1000;

function conversationUrl(role, caseId, interestId = null) {
  if (role === "LAWYER") {
    const params = new URLSearchParams({ caso: caseId });
    if (interestId) params.set("interest", interestId);
    return `/dashboard/advogado/mensagens?${params.toString()}`;
  }

  return `/chat/${encodeURIComponent(caseId)}${
    interestId ? `?interest=${encodeURIComponent(interestId)}` : ""
  }`;
}

async function notifyRecipient({
  db,
  sender,
  senderRole,
  caseItem,
  interest,
}) {
  const recipientId = interest
    ? String(sender.id) === String(caseItem.cliente_id)
      ? interest.lawyer_id
      : caseItem.cliente_id
    : String(sender.id) === String(caseItem.cliente_id)
      ? caseItem.advogado_id
      : caseItem.cliente_id;

  if (!recipientId || String(recipientId) === String(sender.id)) return;

  const recipientRole =
    String(recipientId) === String(caseItem.cliente_id) ? "CLIENT" : "LAWYER";
  const meta = {
    case_id: caseItem.id,
    interest_id: interest?.id || null,
  };

  const { error: notificationInsertError } = await db
    .from("notificacoes")
    .insert([
      {
        id: crypto.randomUUID(),
        user_id: recipientId,
        titulo: "Nova mensagem no chat",
        mensagem: `Você recebeu uma nova mensagem no caso "${caseItem.titulo || "Caso"}".`,
        lida: false,
        created_at: new Date().toISOString(),
        tipo: "MENSAGEM",
        meta: JSON.stringify(meta),
        link: conversationUrl(recipientRole, caseItem.id, interest?.id || null),
      },
    ]);

  if (notificationInsertError) throw notificationInsertError;

  await sendPushNotification({
    userIds: [recipientId],
    title: "Nova mensagem! 💬",
    message: `Você recebeu uma nova mensagem no caso "${caseItem.titulo || "Caso"}".`,
    url: conversationUrl(recipientRole, caseItem.id, interest?.id || null),
  }).catch((error) => {
    console.error("[Mensagens] Push não enviado:", error?.message || error);
  });

  if (!resend) return;

  if (recipientRole === "LAWYER") {
    const { data: lawyer } = await db
      .from("advogados")
      .select("name, email")
      .eq("id", recipientId)
      .maybeSingle();

    if (lawyer?.email) {
      await resend.emails.send({
        from: "Social Jurídico <contato@socialjuridico.com.br>",
        to: lawyer.email,
        subject: `💬 Nova mensagem no caso "${caseItem.titulo || "Caso"}"`,
        html: novaMensagemTemplate({
          lawyerName: lawyer.name || "Advogado(a)",
          casoTitulo: caseItem.titulo || "Caso",
        }),
      });
    }
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
          .eq("id", sender.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (client?.email) {
    await resend.emails.send({
      from: "Social Jurídico <contato@socialjuridico.com.br>",
      to: client.email,
      subject: `💬 Nova mensagem do advogado no caso "${caseItem.titulo || "Caso"}"`,
      html: novaMensagemClienteTemplate({
        clientName: client.name || "Cliente",
        casoTitulo: caseItem.titulo || "Caso",
        lawyerName: lawyerSender?.name || "Seu advogado",
      }),
    });
  }
}

async function markConversationNotificationsRead(
  db,
  userId,
  caseId,
  interestId = null,
) {
  const { data, error } = await db
    .from("notificacoes")
    .select("id, meta")
    .eq("user_id", userId)
    .eq("tipo", "MENSAGEM")
    .eq("lida", false)
    .limit(200);

  if (error) throw error;

  const ids = (data || [])
    .filter((notification) => {
      const meta = parseNotificationMeta(notification.meta);
      const notificationCaseId = String(meta.case_id || meta.caso_id || "");
      const notificationInterestId = String(meta.interest_id || "") || null;
      return (
        notificationCaseId === String(caseId) &&
        String(notificationInterestId || "") === String(interestId || "")
      );
    })
    .map((notification) => notification.id);

  if (!ids.length) return 0;

  const { error: updateError } = await db
    .from("notificacoes")
    .update({ lida: true })
    .in("id", ids)
    .eq("user_id", userId);

  if (updateError) throw updateError;
  return ids.length;
}

export async function GET(request) {
  try {
    const access = await requireMessageUser(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const caseId = String(searchParams.get("caso_id") || "").trim();
    const interestId =
      String(searchParams.get("interest_id") || "").trim() || null;
    const resolved = await resolveMessageConversation(
      access.db,
      access.user.id,
      caseId,
      interestId,
    );

    if (!resolved.ok) {
      return messageJson(
        { success: false, message: resolved.message },
        resolved.status,
      );
    }

    let query = access.db
      .from("mensagens")
      .select(
        "id, caso_id, interest_id, sender_id, content, is_read, created_at",
      )
      .eq("caso_id", caseId)
      .order("created_at", { ascending: false })
      .limit(MAX_THREAD_MESSAGES);

    query = conversationQuery(query, interestId);
    const { data, error } = await query;
    if (error) throw error;

    const messages = [...(data || [])].reverse();

    return messageJson({
      success: true,
      data: messages,
      meta: {
        limit: MAX_THREAD_MESSAGES,
        truncated: messages.length >= MAX_THREAD_MESSAGES,
      },
    });
  } catch (error) {
    console.error("[Mensagens][GET] Erro:", error);
    return messageJson(
      { success: false, message: "Não foi possível carregar as mensagens." },
      500,
    );
  }
}

export async function POST(request) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireMessageUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caso_id || "").trim();
    const interestId = String(body?.interest_id || "").trim() || null;
    const contentResult = normalizeStoredMessageContent(body?.content);

    if (!contentResult.ok) {
      return messageJson(
        { success: false, message: contentResult.message },
        400,
      );
    }

    const resolved = await resolveMessageConversation(
      access.db,
      access.user.id,
      caseId,
      interestId,
    );

    if (!resolved.ok) {
      return messageJson(
        { success: false, message: resolved.message },
        resolved.status,
      );
    }

    const recipientId = resolved.interest
      ? String(access.user.id) === String(resolved.caseItem.cliente_id)
        ? resolved.interest.lawyer_id
        : resolved.caseItem.cliente_id
      : String(access.user.id) === String(resolved.caseItem.cliente_id)
        ? resolved.caseItem.advogado_id
        : resolved.caseItem.cliente_id;

    if (!recipientId) {
      return messageJson(
        {
          success: false,
          message: "Esta conversa ainda não possui outro participante.",
        },
        409,
      );
    }

    const insertData = {
      caso_id: caseId,
      interest_id: interestId,
      sender_id: access.user.id,
      content: contentResult.content,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await access.db
      .from("mensagens")
      .insert([insertData])
      .select(
        "id, caso_id, interest_id, sender_id, content, is_read, created_at",
      )
      .single();

    if (error) throw error;

    await notifyRecipient({
      db: access.db,
      sender: access.user,
      senderRole: access.role,
      caseItem: resolved.caseItem,
      interest: resolved.interest,
    }).catch((sideEffectError) => {
      console.error(
        "[Mensagens] Mensagem salva; notificação pendente:",
        sideEffectError?.message || sideEffectError,
      );
    });

    return messageJson({ success: true, data }, 201);
  } catch (error) {
    console.error("[Mensagens][POST] Erro:", error);
    return messageJson(
      { success: false, message: "Não foi possível enviar a mensagem." },
      500,
    );
  }
}

export async function PATCH(request) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireMessageUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caso_id || body?.caseId || "").trim();
    const interestId =
      String(body?.interest_id || body?.interestId || "").trim() || null;
    const resolved = await resolveMessageConversation(
      access.db,
      access.user.id,
      caseId,
      interestId,
    );

    if (!resolved.ok) {
      return messageJson(
        { success: false, message: resolved.message },
        resolved.status,
      );
    }

    let query = access.db
      .from("mensagens")
      .update({ is_read: true })
      .eq("caso_id", caseId)
      .neq("sender_id", access.user.id)
      .eq("is_read", false);

    query = conversationQuery(query, interestId);
    const { error } = await query;
    if (error) throw error;

    const notificationsUpdated = await markConversationNotificationsRead(
      access.db,
      access.user.id,
      caseId,
      interestId,
    );

    return messageJson({
      success: true,
      data: { caseId, interestId, notificationsUpdated },
    });
  } catch (error) {
    console.error("[Mensagens][PATCH] Erro:", error);
    return messageJson(
      { success: false, message: "Não foi possível marcar a conversa como lida." },
      500,
    );
  }
}
