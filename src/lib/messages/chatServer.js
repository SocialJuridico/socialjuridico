import crypto from "node:crypto";

import {
  getRequestIpHash,
  getRequestUserAgent,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";

import {
  conversationQuery,
  messageJson,
  parseNotificationMeta,
  requireMessageUser,
  resolveMessageConversation,
} from "./messageServer";
import { notifyChatMessage } from "./chatNotifications";
import {
  CHAT_PAGE_LIMIT,
  canWriteChatConversation,
  chatAttachmentKind,
  isChatUuid,
  normalizeChatCursor,
  normalizeChatInterestId,
  normalizeChatRequestId,
  normalizeChatText,
  parseChatMetadata,
  parseLegacyMediaContent,
} from "./chatValidation";

export { messageJson as chatJson };

function participantRole(userId, caseItem, interest) {
  if (String(userId) === String(caseItem.cliente_id)) return "CLIENT";
  if (
    String(userId) ===
    String(interest?.lawyer_id || caseItem.advogado_id || "")
  ) {
    return "LAWYER";
  }
  return null;
}

async function loadPartner(db, role, caseItem, interest) {
  if (role === "LAWYER") {
    const { data, error } = await db
      .from("clientes")
      .select("id, name, avatar")
      .eq("id", caseItem.cliente_id)
      .maybeSingle();
    if (error) throw error;
    return data
      ? { id: data.id, name: data.name || "Cliente", avatar: data.avatar || null }
      : null;
  }

  const lawyerId = interest?.lawyer_id || caseItem.advogado_id;
  if (!lawyerId) return null;

  const { data, error } = await db
    .from("advogados")
    .select("id, name, avatar, oab, estado")
    .eq("id", lawyerId)
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        id: data.id,
        name: data.name || "Advogado",
        avatar: data.avatar || null,
        oab: data.oab || null,
        state: data.estado || null,
      }
    : null;
}

async function loadLawyerBalance(db, userId, role) {
  if (role !== "LAWYER") return null;
  const { data, error } = await db
    .from("advogados")
    .select("balance")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.balance || 0);
}

export async function resolveChatAccess(
  request,
  caseId,
  rawInterestId = null,
) {
  const access = await requireMessageUser(request);
  if (!access.ok) return access;

  if (!isChatUuid(caseId)) {
    return {
      ok: false,
      response: messageJson(
        { success: false, message: "Identificador do caso inválido." },
        400,
      ),
    };
  }

  const interestId = normalizeChatInterestId(rawInterestId);
  if (interestId === undefined) {
    return {
      ok: false,
      response: messageJson(
        { success: false, message: "Identificador da negociação inválido." },
        400,
      ),
    };
  }

  const resolved = await resolveMessageConversation(
    access.db,
    access.user.id,
    caseId,
    interestId,
  );

  if (!resolved.ok) {
    return {
      ok: false,
      response: messageJson(
        { success: false, message: resolved.message },
        resolved.status,
      ),
    };
  }

  const role = participantRole(
    access.user.id,
    resolved.caseItem,
    resolved.interest,
  );
  if (!role || role !== access.role) {
    return {
      ok: false,
      response: messageJson(
        { success: false, message: "Perfil sem acesso à conversa." },
        403,
      ),
    };
  }

  const mode = resolved.interest ? "NEGOTIATION" : "CASE";
  const [partner, balance] = await Promise.all([
    loadPartner(access.db, role, resolved.caseItem, resolved.interest),
    loadLawyerBalance(access.db, access.user.id, role),
  ]);
  const canSend = Boolean(
    partner &&
      canWriteChatConversation({
        caseStatus: resolved.caseItem.status,
        interestStatus: resolved.interest?.status,
        mode,
      }),
  );
  const canStartVideo = Boolean(
    role === "LAWYER" &&
      mode === "CASE" &&
      canSend &&
      String(resolved.caseItem.advogado_id) === String(access.user.id),
  );

  return {
    ok: true,
    ...access,
    caseId,
    interestId,
    caseItem: resolved.caseItem,
    interest: resolved.interest,
    role,
    mode,
    partner,
    balance,
    canSend,
    canStartVideo,
  };
}

export function serializeChatContext(access) {
  return {
    conversation: {
      key: `${access.caseId}:${access.interestId || "case"}`,
      mode: access.mode,
      caseId: access.caseId,
      interestId: access.interestId,
      caseTitle: access.caseItem.titulo || "Caso jurídico",
      practiceArea: access.caseItem.area_atuacao || "",
      city: access.caseItem.cidade || "",
      state: access.caseItem.estado || "",
      caseStatus: access.caseItem.status || "ABERTO",
      interestStatus: access.interest?.status || null,
      createdAt: access.caseItem.created_at || null,
      canSend: access.canSend,
      canStartVideo: access.canStartVideo,
    },
    currentUser: {
      id: access.user.id,
      role: access.role,
      name: access.profile?.name || (access.role === "LAWYER" ? "Advogado" : "Cliente"),
      avatar: access.profile?.avatar || null,
      balance: access.balance,
      assistantName:
        access.role === "LAWYER" ? "Assistente Estratégico" : "Anjo Jurídico",
    },
    partner: access.partner,
    navigation: {
      backHref:
        access.role === "LAWYER"
          ? "/dashboard/advogado/meuscasos"
          : "/dashboard/cliente",
    },
    privacy: {
      contactDataReturned: false,
      attachmentsUseSignedUrls: true,
      auditStoresMessageContent: false,
    },
  };
}

export async function auditChatAction(
  access,
  request,
  {
    action,
    requestId = crypto.randomUUID(),
    messageId = null,
    videoSessionId = null,
    previousBalance = null,
    newBalance = null,
    metadata = {},
  },
) {
  const { error } = await access.db.from("chat_audit_logs").insert([
    {
      request_id: requestId,
      user_id: access.user.id,
      user_role: access.role,
      action,
      case_id: access.caseId,
      interest_id: access.interestId,
      message_id: messageId,
      video_session_id: videoSessionId,
      previous_balance: previousBalance,
      new_balance: newBalance,
      metadata,
      ip_hash: getRequestIpHash(request),
      user_agent: getRequestUserAgent(request),
      created_at: new Date().toISOString(),
    },
  ]);

  if (error && error.code !== "23505") throw error;
  return requestId;
}

async function signedAttachment(db, attachment) {
  if (!attachment) return null;
  const { data, error } = await db.storage
    .from(attachment.bucket_name)
    .createSignedUrl(attachment.object_path, 60 * 60);

  return {
    id: attachment.id,
    name: attachment.original_name,
    mimeType: attachment.mime_type,
    size: Number(attachment.size_bytes || 0),
    kind: chatAttachmentKind(attachment.mime_type),
    url: error ? null : data?.signedUrl || null,
    available: !error && Boolean(data?.signedUrl),
  };
}

function legacyVideoInvite(content) {
  const match = String(content || "").match(
    /(https:\/\/(?:meet\.google\.com|meet\.jit\.si)\/[^\s]+)/i,
  );
  if (!match) return null;
  return {
    legacy: true,
    url: match[1],
    provider: match[1].includes("meet.jit.si") ? "JITSI" : "GOOGLE_MEET",
  };
}

async function serializeMessage(
  db,
  message,
  currentUserId,
  attachment,
  videoSession,
) {
  const metadata = parseChatMetadata(message.metadata);
  const own = String(message.sender_id) === String(currentUserId);
  const base = {
    id: message.id,
    senderId: message.sender_id,
    own,
    read: Boolean(message.is_read),
    createdAt: message.created_at,
    deleted: Boolean(message.deleted_at),
  };

  if (message.deleted_at) {
    return { ...base, type: "DELETED", text: "Mensagem removida" };
  }

  if (message.message_type === "ATTACHMENT" && attachment) {
    return {
      ...base,
      type: "ATTACHMENT",
      attachment: await signedAttachment(db, attachment),
    };
  }

  if (message.message_type === "VIDEO_INVITE" && videoSession) {
    return {
      ...base,
      type: "VIDEO_INVITE",
      video: {
        sessionId: videoSession.id,
        provider: videoSession.provider,
        status: videoSession.status,
        costJuris: videoSession.cost_juris,
        canJoin: !["ENDED", "CANCELLED"].includes(videoSession.status),
      },
    };
  }

  const legacyAttachment = parseLegacyMediaContent(message.content);
  if (legacyAttachment) {
    return {
      ...base,
      type: "ATTACHMENT",
      attachment: {
        id: null,
        name: legacyAttachment.name,
        mimeType: legacyAttachment.mimeType,
        kind: legacyAttachment.kind,
        size: null,
        url: legacyAttachment.url,
        available: true,
        legacy: true,
      },
    };
  }

  const legacyVideo = legacyVideoInvite(message.content);
  if (legacyVideo) {
    return {
      ...base,
      type: "LEGACY_VIDEO_INVITE",
      text: normalizeChatText(message.content),
      video: legacyVideo,
    };
  }

  return {
    ...base,
    type: "TEXT",
    text: normalizeChatText(message.content),
    metadata,
  };
}

export async function listChatMessages(access, rawCursor = null) {
  const cursor = normalizeChatCursor(rawCursor);
  if (cursor === undefined) {
    return { ok: false, status: 400, message: "Cursor de paginação inválido." };
  }

  let query = access.db
    .from("mensagens")
    .select(
      "id, caso_id, interest_id, sender_id, content, message_type, metadata, client_request_id, is_read, created_at, deleted_at",
    )
    .eq("caso_id", access.caseId)
    .order("created_at", { ascending: false })
    .limit(CHAT_PAGE_LIMIT + 1);

  query = conversationQuery(query, access.interestId);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data || [];
  const hasMore = rows.length > CHAT_PAGE_LIMIT;
  const pageRows = hasMore ? rows.slice(0, CHAT_PAGE_LIMIT) : rows;
  const messageIds = pageRows.map((item) => item.id).filter(isChatUuid);

  const [attachmentResult, videoResult] = await Promise.all([
    messageIds.length
      ? access.db
          .from("chat_attachments")
          .select(
            "id, message_id, bucket_name, object_path, original_name, mime_type, size_bytes, status",
          )
          .in("message_id", messageIds)
          .eq("status", "ACTIVE")
      : Promise.resolve({ data: [], error: null }),
    messageIds.length
      ? access.db
          .from("chat_video_sessions")
          .select("id, message_id, provider, status, cost_juris")
          .in("message_id", messageIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (attachmentResult.error) throw attachmentResult.error;
  if (videoResult.error) throw videoResult.error;

  const attachmentsByMessage = new Map(
    (attachmentResult.data || []).map((item) => [item.message_id, item]),
  );
  const videosByMessage = new Map(
    (videoResult.data || []).map((item) => [item.message_id, item]),
  );

  const serialized = await Promise.all(
    [...pageRows]
      .reverse()
      .map((message) =>
        serializeMessage(
          access.db,
          message,
          access.user.id,
          attachmentsByMessage.get(message.id),
          videosByMessage.get(message.id),
        ),
      ),
  );

  return {
    ok: true,
    messages: serialized,
    pagination: {
      limit: CHAT_PAGE_LIMIT,
      hasMore,
      nextCursor: hasMore ? pageRows[pageRows.length - 1]?.created_at || null : null,
    },
  };
}

export async function createChatTextMessage(access, request, body) {
  if (!access.canSend) {
    return { ok: false, status: 409, message: "Esta conversa está somente para leitura." };
  }

  const requestId = normalizeChatRequestId(body?.requestId);
  const text = normalizeChatText(body?.text);
  if (!requestId) {
    return { ok: false, status: 400, message: "Identificador da mensagem inválido." };
  }
  if (!text) {
    return { ok: false, status: 400, message: "Digite uma mensagem antes de enviar." };
  }

  const { data: existing, error: existingError } = await access.db
    .from("mensagens")
    .select(
      "id, caso_id, interest_id, sender_id, content, is_read, created_at, deleted_at",
    )
    .eq("client_request_id", requestId)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const sameConversation =
      String(existing.caso_id) === String(access.caseId) &&
      String(existing.interest_id || "") === String(access.interestId || "") &&
      String(existing.sender_id) === String(access.user.id);
    if (!sameConversation) {
      return { ok: false, status: 409, message: "Identificador já utilizado." };
    }
    return {
      ok: true,
      alreadyProcessed: true,
      message: {
        id: existing.id,
        senderId: existing.sender_id,
        own: true,
        read: Boolean(existing.is_read),
        createdAt: existing.created_at,
        deleted: Boolean(existing.deleted_at),
        type: "TEXT",
        text: normalizeChatText(existing.content),
      },
    };
  }

  const { data, error } = await access.db
    .from("mensagens")
    .insert([
      {
        caso_id: access.caseId,
        interest_id: access.interestId,
        sender_id: access.user.id,
        content: text,
        message_type: "TEXT",
        metadata: {},
        client_request_id: requestId,
        is_read: false,
        created_at: new Date().toISOString(),
      },
    ])
    .select("id, sender_id, content, is_read, created_at")
    .single();
  if (error) throw error;

  await auditChatAction(access, request, {
    action: "MESSAGE_SENT",
    requestId,
    messageId: data.id,
    metadata: { message_type: "TEXT", length: text.length },
  });

  await notifyChatMessage({
    db: access.db,
    senderId: access.user.id,
    senderRole: access.role,
    caseItem: access.caseItem,
    interest: access.interest,
  }).catch((notificationError) => {
    console.error("[Chat] Mensagem salva; notificação pendente:", notificationError);
  });

  return {
    ok: true,
    alreadyProcessed: false,
    message: {
      id: data.id,
      senderId: data.sender_id,
      own: true,
      read: Boolean(data.is_read),
      createdAt: data.created_at,
      deleted: false,
      type: "TEXT",
      text: data.content,
    },
  };
}

async function markNotificationsRead(access) {
  const { data, error } = await access.db
    .from("notificacoes")
    .select("id, meta")
    .eq("user_id", access.user.id)
    .eq("tipo", "MENSAGEM")
    .eq("lida", false)
    .limit(200);
  if (error) throw error;

  const ids = (data || [])
    .filter((notification) => {
      const meta = parseNotificationMeta(notification.meta);
      return (
        String(meta.case_id || meta.caso_id || "") === String(access.caseId) &&
        String(meta.interest_id || "") === String(access.interestId || "")
      );
    })
    .map((item) => item.id);

  if (!ids.length) return 0;
  const { error: updateError } = await access.db
    .from("notificacoes")
    .update({ lida: true })
    .in("id", ids)
    .eq("user_id", access.user.id);
  if (updateError) throw updateError;
  return ids.length;
}

export async function markChatMessagesRead(access, request, rawRequestId) {
  const requestId = normalizeChatRequestId(rawRequestId) || crypto.randomUUID();
  let query = access.db
    .from("mensagens")
    .update({ is_read: true })
    .eq("caso_id", access.caseId)
    .neq("sender_id", access.user.id)
    .eq("is_read", false);
  query = conversationQuery(query, access.interestId);
  const { error } = await query;
  if (error) throw error;

  const notificationsUpdated = await markNotificationsRead(access);
  await auditChatAction(access, request, {
    action: "MESSAGES_READ",
    requestId,
    metadata: { notifications_updated: notificationsUpdated },
  });

  return { notificationsUpdated };
}
