import {
  conversationKey,
  conversationStatusPresentation,
  messagePreview,
  summarizeConversations,
} from "@/lib/messages/messagePresentation";
import {
  conversationQuery,
  messageJson,
  parseNotificationMeta,
  requireMessageUser,
  resolveMessageConversation,
  validateMessageMutationOrigin,
} from "@/lib/messages/messageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CONVERSATIONS = 250;
const MAX_MESSAGES_FOR_SUMMARY = 5000;

function buildConversation({
  caseItem,
  client,
  interest,
  messages,
  userId,
}) {
  const mode = interest ? "NEGOTIATION" : "CASE";
  const lastMessage = messages[messages.length - 1] || null;
  const unreadCount = messages.reduce(
    (total, message) =>
      !message.is_read && String(message.sender_id) !== String(userId)
        ? total + 1
        : total,
    0,
  );
  const status = conversationStatusPresentation({
    mode,
    interestStatus: interest?.status || null,
    caseStatus: caseItem.status,
  });

  return {
    id: conversationKey(caseItem.id, interest?.id || null),
    caseId: caseItem.id,
    interestId: interest?.id || null,
    mode,
    interestStatus: interest?.status || null,
    case: {
      title: caseItem.titulo || "Caso sem título",
      area: caseItem.area_atuacao || "Área não informada",
      city: caseItem.cidade || "",
      state: caseItem.estado || "",
      status: caseItem.status || null,
    },
    client: {
      name: client?.name || "Cliente",
      avatar: client?.avatar || null,
    },
    status,
    unreadCount,
    messageCount: messages.length,
    startedAt: interest?.created_at || caseItem.created_at,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          preview: messagePreview(lastMessage.content),
          createdAt: lastMessage.created_at,
          direction:
            String(lastMessage.sender_id) === String(userId) ? "OUT" : "IN",
          isRead: Boolean(lastMessage.is_read),
        }
      : null,
    chatHref: `/chat/${encodeURIComponent(caseItem.id)}${
      interest?.id ? `?interest=${encodeURIComponent(interest.id)}` : ""
    }`,
  };
}

async function loadMessageSummaries(db, caseIds) {
  if (!caseIds.length) return { messages: [], truncated: false };

  const { data, error } = await db
    .from("mensagens")
    .select(
      "id, caso_id, interest_id, sender_id, content, is_read, created_at",
    )
    .in("caso_id", caseIds)
    .order("created_at", { ascending: false })
    .limit(MAX_MESSAGES_FOR_SUMMARY);

  if (error) throw error;

  return {
    messages: [...(data || [])].reverse(),
    truncated: (data || []).length >= MAX_MESSAGES_FOR_SUMMARY,
  };
}

export async function GET(request) {
  try {
    const access = await requireMessageUser(request, { lawyerOnly: true });
    if (!access.ok) return access.response;

    const [assignedCasesResult, interestsResult] = await Promise.all([
      access.db
        .from("casos")
        .select(
          "id, titulo, area_atuacao, cidade, estado, status, cliente_id, advogado_id, created_at",
        )
        .eq("advogado_id", access.user.id)
        .order("created_at", { ascending: false })
        .limit(MAX_CONVERSATIONS),
      access.db
        .from("case_interests")
        .select("id, case_id, lawyer_id, status, created_at")
        .eq("lawyer_id", access.user.id)
        .in("status", ["NEGOTIATING", "HIRED"])
        .order("created_at", { ascending: false })
        .limit(MAX_CONVERSATIONS),
    ]);

    if (assignedCasesResult.error) throw assignedCasesResult.error;
    if (interestsResult.error) throw interestsResult.error;

    const assignedCases = assignedCasesResult.data || [];
    const interests = interestsResult.data || [];
    const knownCases = new Map(assignedCases.map((item) => [item.id, item]));
    const missingCaseIds = [
      ...new Set(
        interests
          .map((item) => item.case_id)
          .filter((caseId) => caseId && !knownCases.has(caseId)),
      ),
    ];

    if (missingCaseIds.length) {
      const { data: interestCases, error } = await access.db
        .from("casos")
        .select(
          "id, titulo, area_atuacao, cidade, estado, status, cliente_id, advogado_id, created_at",
        )
        .in("id", missingCaseIds);

      if (error) throw error;
      for (const caseItem of interestCases || []) {
        knownCases.set(caseItem.id, caseItem);
      }
    }

    const caseIds = [...knownCases.keys()];
    const clientIds = [
      ...new Set(
        [...knownCases.values()]
          .map((item) => item.cliente_id)
          .filter(Boolean),
      ),
    ];

    const [clientsResult, messageResult] = await Promise.all([
      clientIds.length
        ? access.db
            .from("clientes")
            .select("id, name, avatar")
            .in("id", clientIds)
        : Promise.resolve({ data: [], error: null }),
      loadMessageSummaries(access.db, caseIds),
    ]);

    if (clientsResult.error) throw clientsResult.error;

    const clientsById = new Map(
      (clientsResult.data || []).map((client) => [client.id, client]),
    );
    const messagesByConversation = new Map();

    for (const message of messageResult.messages) {
      const key = conversationKey(message.caso_id, message.interest_id || null);
      const current = messagesByConversation.get(key) || [];
      current.push(message);
      messagesByConversation.set(key, current);
    }

    const conversations = [];

    for (const caseItem of assignedCases) {
      const key = conversationKey(caseItem.id, null);
      conversations.push(
        buildConversation({
          caseItem,
          client: clientsById.get(caseItem.cliente_id),
          interest: null,
          messages: messagesByConversation.get(key) || [],
          userId: access.user.id,
        }),
      );
    }

    for (const interest of interests) {
      const caseItem = knownCases.get(interest.case_id);
      if (!caseItem) continue;

      const key = conversationKey(caseItem.id, interest.id);
      const messages = messagesByConversation.get(key) || [];
      const hasAssignedCaseConversation =
        String(caseItem.advogado_id || "") === String(access.user.id);

      if (
        interest.status === "HIRED" &&
        hasAssignedCaseConversation &&
        !messages.length
      ) {
        continue;
      }

      conversations.push(
        buildConversation({
          caseItem,
          client: clientsById.get(caseItem.cliente_id),
          interest,
          messages,
          userId: access.user.id,
        }),
      );
    }

    conversations.sort((a, b) => {
      const aDate = new Date(
        a.lastMessage?.createdAt || a.startedAt || 0,
      ).getTime();
      const bDate = new Date(
        b.lastMessage?.createdAt || b.startedAt || 0,
      ).getTime();
      return bDate - aDate;
    });

    const limitedConversations = conversations.slice(0, MAX_CONVERSATIONS);

    return messageJson({
      success: true,
      data: {
        conversations: limitedConversations,
        summary: summarizeConversations(limitedConversations),
        limits: {
          conversations: MAX_CONVERSATIONS,
          summaryMessages: MAX_MESSAGES_FOR_SUMMARY,
          conversationsTruncated: conversations.length > MAX_CONVERSATIONS,
          messagesTruncated: messageResult.truncated,
        },
        privacy: {
          clientEmailsReturned: false,
          clientPhonesReturned: false,
          fullMessageBodiesReturnedInList: false,
        },
      },
    });
  } catch (error) {
    console.error("[Advogado/Mensagens][GET] Erro:", error);
    return messageJson(
      { success: false, message: "Não foi possível carregar suas conversas." },
      500,
    );
  }
}

export async function PATCH(request) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireMessageUser(request, { lawyerOnly: true });
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caseId || "").trim();
    const interestId = String(body?.interestId || "").trim() || null;
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

    if (
      interestId &&
      String(resolved.interest?.lawyer_id || "") !== String(access.user.id)
    ) {
      return messageJson({ success: false, message: "Não autorizado." }, 403);
    }

    if (
      !interestId &&
      String(resolved.caseItem?.advogado_id || "") !== String(access.user.id)
    ) {
      return messageJson({ success: false, message: "Não autorizado." }, 403);
    }

    let updateQuery = access.db
      .from("mensagens")
      .update({ is_read: true })
      .eq("caso_id", caseId)
      .neq("sender_id", access.user.id)
      .eq("is_read", false);

    updateQuery = conversationQuery(updateQuery, interestId);
    const { error: updateError } = await updateQuery;
    if (updateError) throw updateError;

    const { data: notifications, error: notificationError } = await access.db
      .from("notificacoes")
      .select("id, meta")
      .eq("user_id", access.user.id)
      .eq("tipo", "MENSAGEM")
      .eq("lida", false)
      .limit(200);

    if (notificationError) throw notificationError;

    const notificationIds = (notifications || [])
      .filter((notification) => {
        const meta = parseNotificationMeta(notification.meta);
        const sameCase = String(meta.case_id || meta.caso_id || "") === caseId;
        const metaInterest = String(meta.interest_id || "") || null;
        return (
          sameCase &&
          String(metaInterest || "") === String(interestId || "")
        );
      })
      .map((notification) => notification.id);

    if (notificationIds.length) {
      const { error } = await access.db
        .from("notificacoes")
        .update({ lida: true })
        .in("id", notificationIds)
        .eq("user_id", access.user.id);

      if (error) throw error;
    }

    return messageJson({
      success: true,
      data: {
        caseId,
        interestId,
        notificationsUpdated: notificationIds.length,
      },
    });
  } catch (error) {
    console.error("[Advogado/Mensagens][PATCH] Erro:", error);
    return messageJson(
      { success: false, message: "Não foi possível atualizar a conversa." },
      500,
    );
  }
}
