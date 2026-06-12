import {
  isValidUuid,
  json,
  requireAdminCommunicationAccess,
} from "../communication/adminCommunication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MESSAGE_TYPES = ["ADMIN_CHAT", "ADMIN_BROADCAST"];
const QUERY_BATCH_SIZE = 100;
const MAX_ROWS_PER_BATCH = 3000;

function parseMeta(meta) {
  if (!meta) return {};
  if (typeof meta === "object") return meta;

  try {
    return JSON.parse(meta);
  } catch {
    return {};
  }
}

function isSentByAdmin(row, adminId) {
  const meta = parseMeta(row.meta);

  if (meta.deleted_by_admin) return false;

  if (row.tipo === "ADMIN_BROADCAST") {
    return String(meta.sent_by || "") === adminId;
  }

  if (row.tipo === "ADMIN_CHAT") {
    return String(meta.sender_id || "") === adminId;
  }

  return false;
}

async function fetchLawyers(db) {
  const { data, error } = await db
    .from("advogados")
    .select("id, name, email, oab")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Falha ao consultar advogados: ${error.message}`);
  }

  return data || [];
}

async function fetchSentRows(db, lawyerIds) {
  const rows = [];

  for (let index = 0; index < lawyerIds.length; index += QUERY_BATCH_SIZE) {
    const batch = lawyerIds.slice(index, index + QUERY_BATCH_SIZE);
    const { data, error } = await db
      .from("notificacoes")
      .select("id, user_id, titulo, mensagem, created_at, tipo, meta")
      .in("user_id", batch)
      .in("tipo", MESSAGE_TYPES)
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS_PER_BATCH);

    if (error) {
      throw new Error(`Falha ao consultar mensagens: ${error.message}`);
    }

    rows.push(...(data || []));
  }

  return rows;
}

function buildConversations(rows, lawyerMap, adminId) {
  const conversations = new Map();

  for (const row of rows) {
    if (!lawyerMap.has(row.user_id) || !isSentByAdmin(row, adminId)) continue;

    const current = conversations.get(row.user_id) || {
      userId: row.user_id,
      lastMessage: "",
      lastTitle: "Mensagem",
      lastDate: null,
      lastType: null,
      totalMessages: 0,
      chatMessages: 0,
      broadcastMessages: 0,
    };

    current.totalMessages += 1;

    if (row.tipo === "ADMIN_CHAT") current.chatMessages += 1;
    if (row.tipo === "ADMIN_BROADCAST") current.broadcastMessages += 1;

    if (
      !current.lastDate ||
      new Date(row.created_at || 0) > new Date(current.lastDate || 0)
    ) {
      current.lastMessage = row.mensagem || "";
      current.lastTitle = row.titulo || "Mensagem";
      current.lastDate = row.created_at;
      current.lastType = row.tipo || null;
    }

    conversations.set(row.user_id, current);
  }

  return Array.from(conversations.values())
    .map((conversation) => {
      const lawyer = lawyerMap.get(conversation.userId);

      return {
        ...conversation,
        lawyer: {
          id: lawyer.id,
          name: lawyer.name || "Advogado",
          email: lawyer.email || "",
          oab: lawyer.oab || "",
        },
      };
    })
    .sort(
      (a, b) =>
        new Date(b.lastDate || 0).getTime() -
        new Date(a.lastDate || 0).getTime(),
    );
}

async function removeConversation(db, adminId, partnerId) {
  const { data, error } = await db
    .from("notificacoes")
    .select("id, user_id, tipo, meta")
    .or(`user_id.eq.${adminId},user_id.eq.${partnerId}`)
    .in("tipo", MESSAGE_TYPES);

  if (error) {
    throw new Error(`Falha ao consultar a conversa: ${error.message}`);
  }

  const relatedRows = (data || []).filter((row) => {
    const meta = parseMeta(row.meta);

    if (row.tipo === "ADMIN_CHAT") {
      const adminMirror =
        row.user_id === adminId &&
        String(meta.chat_with || "") === partnerId;
      const partnerReceived =
        row.user_id === partnerId &&
        String(meta.sender_id || "") === adminId;
      const receivedFromPartner =
        row.user_id === adminId &&
        String(meta.sender_id || "") === partnerId;

      return adminMirror || partnerReceived || receivedFromPartner;
    }

    if (row.tipo === "ADMIN_BROADCAST") {
      return (
        row.user_id === partnerId &&
        String(meta.sent_by || "") === adminId
      );
    }

    return false;
  });

  await Promise.all(
    relatedRows.map(async (row) => {
      const meta = parseMeta(row.meta);
      const nextMeta = { ...meta, deleted_by_admin: true };

      if (nextMeta.deleted_by_user) {
        const { error: deleteError } = await db
          .from("notificacoes")
          .delete()
          .eq("id", row.id);

        if (deleteError) {
          throw new Error(`Falha ao excluir mensagem: ${deleteError.message}`);
        }

        return;
      }

      const { error: updateError } = await db
        .from("notificacoes")
        .update({ meta: JSON.stringify(nextMeta) })
        .eq("id", row.id);

      if (updateError) {
        throw new Error(`Falha ao ocultar mensagem: ${updateError.message}`);
      }
    }),
  );

  return relatedRows.length;
}

export async function GET() {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const lawyers = await fetchLawyers(access.db);

    if (!lawyers.length) {
      return json({ success: true, data: [] });
    }

    const lawyerMap = new Map(lawyers.map((lawyer) => [lawyer.id, lawyer]));
    const rows = await fetchSentRows(access.db, lawyers.map((lawyer) => lawyer.id));
    const conversations = buildConversations(
      rows,
      lawyerMap,
      access.auth.user.id,
    );

    return json({ success: true, data: conversations });
  } catch (error) {
    console.error("[Admin/Mensagens][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar as mensagens enviadas.",
      },
      500,
    );
  }
}

export async function DELETE(request) {
  try {
    const access = await requireAdminCommunicationAccess();
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const partnerId = String(searchParams.get("partnerId") || "").trim();

    if (!isValidUuid(partnerId)) {
      return json({ success: false, message: "Participante inválido." }, 400);
    }

    const { data: lawyer, error: lawyerError } = await access.db
      .from("advogados")
      .select("id")
      .eq("id", partnerId)
      .maybeSingle();

    if (lawyerError) {
      throw new Error(`Falha ao validar participante: ${lawyerError.message}`);
    }

    if (!lawyer) {
      return json({ success: false, message: "Advogado não encontrado." }, 404);
    }

    const removed = await removeConversation(
      access.db,
      access.auth.user.id,
      partnerId,
    );

    return json({
      success: true,
      message:
        removed > 0
          ? "Conversa removida da visão administrativa."
          : "A conversa já não estava disponível.",
      data: { removed },
    });
  } catch (error) {
    console.error("[Admin/Mensagens][DELETE] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível remover a conversa.",
      },
      500,
    );
  }
}
