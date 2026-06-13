import {
  isUuid,
  normalizeSearch,
  safePublicUrl,
} from "../lawyerOpportunities/opportunityValidation";
import { messagePreview } from "../messages/messagePresentation";
import {
  messageJson,
  requireMessageUser,
} from "../messages/messageServer";
import {
  buildLawyerCaseSummary,
  canOpenLawyerCaseChat,
  canStartLawyerCaseChat,
  getLawyerCaseStatusLabel,
  normalizeLawyerCaseFilters,
  resolveLawyerCaseStatuses,
} from "./lawyerCaseValidation";

const MAX_CASES = 500;
const MAX_MESSAGES = 5000;

function normalizeAttachments(value) {
  const items = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [value];
          } catch {
            return [value];
          }
        })()
      : [];

  return items
    .map((item) => {
      if (typeof item === "string") {
        const url = safePublicUrl(item);
        return url ? { url, name: "Documento anexado" } : null;
      }

      if (!item || typeof item !== "object") return null;
      const url = safePublicUrl(item.url || item.path || item.publicUrl);
      if (!url) return null;

      return {
        url,
        name: normalizeSearch(
          item.name || item.fileName || "Documento anexado",
          120,
        ),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function createMessageSummary() {
  return {
    messageCount: 0,
    unreadCount: 0,
    lastMessage: null,
  };
}

function buildMessagesByCase(messages, lawyerId) {
  const summaries = new Map();

  for (const message of messages || []) {
    const caseId = message.caso_id;
    if (!caseId || message.interest_id) continue;

    const summary = summaries.get(caseId) || createMessageSummary();
    summary.messageCount += 1;

    if (
      !message.is_read &&
      String(message.sender_id || "") !== String(lawyerId)
    ) {
      summary.unreadCount += 1;
    }

    if (
      !summary.lastMessage ||
      new Date(message.created_at || 0).getTime() >
        new Date(summary.lastMessage.createdAt || 0).getTime()
    ) {
      summary.lastMessage = {
        preview: messagePreview(message.content),
        createdAt: message.created_at,
        direction:
          String(message.sender_id || "") === String(lawyerId) ? "OUT" : "IN",
        isRead: Boolean(message.is_read),
      };
    }

    summaries.set(caseId, summary);
  }

  return summaries;
}

function serializeCase(caseItem, client, messageSummary) {
  const serialized = {
    id: caseItem.id,
    title: normalizeSearch(caseItem.titulo || "Caso jurídico", 180),
    description: normalizeSearch(caseItem.descricao || "", 6000),
    practiceArea: normalizeSearch(
      caseItem.area_atuacao || "Direito Geral",
      100,
    ),
    city: normalizeSearch(caseItem.cidade || "", 100),
    state: normalizeSearch(caseItem.estado || "", 2).toUpperCase(),
    status: caseItem.status || "CONTRATADO",
    statusLabel: getLawyerCaseStatusLabel(caseItem.status),
    chatStarted: Boolean(caseItem.chat_started),
    createdAt: caseItem.created_at,
    updatedAt: caseItem.updated_at || null,
    attachments: normalizeAttachments(caseItem.anexos),
    audioUrl: safePublicUrl(caseItem.audio_url),
    videoUrl: safePublicUrl(caseItem.video_url || caseItem.video_link),
    client: {
      name: normalizeSearch(client?.name || "Cliente", 120),
      avatar: safePublicUrl(client?.avatar),
    },
    messageCount: messageSummary?.messageCount || 0,
    unreadCount: messageSummary?.unreadCount || 0,
    lastMessage: messageSummary?.lastMessage || null,
    chatHref: `/chat/${encodeURIComponent(caseItem.id)}`,
  };

  return {
    ...serialized,
    canStartChat: canStartLawyerCaseChat(serialized),
    canOpenChat: canOpenLawyerCaseChat(serialized),
  };
}

function matchesSearch(item, query) {
  if (!query) return true;

  const normalize = (value) =>
    String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const haystack = normalize(
    [
      item.title,
      item.description,
      item.practiceArea,
      item.city,
      item.state,
      item.statusLabel,
      item.client?.name,
    ]
      .filter(Boolean)
      .join(" "),
  );

  return haystack.includes(normalize(query));
}

export async function listLawyerCases(request) {
  try {
    const access = await requireMessageUser(request, { lawyerOnly: true });
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const { q, status, page, limit } = normalizeLawyerCaseFilters(searchParams);
    const statuses = resolveLawyerCaseStatuses(status);

    const { data: cases, error: caseError } = await access.db
      .from("casos")
      .select(
        "id, titulo, descricao, area_atuacao, cidade, estado, status, cliente_id, advogado_id, chat_started, created_at, updated_at, anexos, audio_url, video_url, video_link",
      )
      .eq("advogado_id", access.user.id)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(MAX_CASES);

    if (caseError) throw caseError;

    const caseItems = cases || [];
    const caseIds = caseItems.map((item) => item.id).filter(isUuid);
    const clientIds = [
      ...new Set(caseItems.map((item) => item.cliente_id).filter(isUuid)),
    ];

    const [clientsResult, messagesResult] = await Promise.all([
      clientIds.length
        ? access.db
            .from("clientes")
            .select("id, name, avatar")
            .in("id", clientIds)
        : Promise.resolve({ data: [], error: null }),
      caseIds.length
        ? access.db
            .from("mensagens")
            .select(
              "id, caso_id, interest_id, sender_id, content, is_read, created_at",
            )
            .in("caso_id", caseIds)
            .is("interest_id", null)
            .order("created_at", { ascending: false })
            .limit(MAX_MESSAGES)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (clientsResult.error) throw clientsResult.error;
    if (messagesResult.error) throw messagesResult.error;

    const clientsById = new Map(
      (clientsResult.data || []).map((client) => [client.id, client]),
    );
    const messagesByCase = buildMessagesByCase(
      messagesResult.data || [],
      access.user.id,
    );

    const serialized = caseItems.map((caseItem) =>
      serializeCase(
        caseItem,
        clientsById.get(caseItem.cliente_id),
        messagesByCase.get(caseItem.id),
      ),
    );
    const summary = buildLawyerCaseSummary(serialized);
    const filtered = serialized
      .filter((item) => statuses.includes(item.status))
      .filter((item) => matchesSearch(item, q));

    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, pages);
    const start = (safePage - 1) * limit;

    return messageJson({
      success: true,
      data: filtered.slice(start, start + limit),
      filters: { q, status },
      pagination: {
        page: safePage,
        limit,
        total,
        pages,
      },
      summary,
      limits: {
        cases: MAX_CASES,
        messages: MAX_MESSAGES,
        casesTruncated: caseItems.length >= MAX_CASES,
        messagesTruncated: (messagesResult.data || []).length >= MAX_MESSAGES,
      },
      privacy: {
        clientEmailsReturned: false,
        clientPhonesReturned: false,
        fullMessageBodiesReturnedInList: false,
      },
    });
  } catch (error) {
    console.error("[Advogado/MeusCasos][GET] Erro:", error);
    return messageJson(
      {
        success: false,
        message: "Não foi possível carregar seus casos.",
      },
      500,
    );
  }
}
