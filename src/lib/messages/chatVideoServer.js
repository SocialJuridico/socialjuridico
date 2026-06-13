import crypto from "node:crypto";

import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";
import {
  getRequestIpHash,
  getRequestUserAgent,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";

import { pushVideoInvite } from "./chatNotifications";
import { isChatUuid, normalizeChatRequestId } from "./chatValidation";

const JITSI_DOMAIN = "https://meet.jit.si";

function rpcFailure(error, fallback) {
  const missingMigration = ["PGRST202", "42883"].includes(error?.code);
  return {
    status: missingMigration
      ? 503
      : error?.code === "P0002"
        ? 402
        : error?.code === "P0003"
          ? 403
          : 409,
    message: missingMigration
      ? "Execute a migração de governança do chat antes de continuar."
      : error?.message || fallback,
  };
}

function buildRoomName(caseId) {
  const casePrefix = String(caseId || "").replace(/-/g, "").slice(0, 12);
  const random = crypto.randomUUID().replace(/-/g, "");
  return `SocialJuridico-${casePrefix}-${random}`;
}

function buildJoinUrl(roomName) {
  return `${JITSI_DOMAIN}/${encodeURIComponent(roomName)}`;
}

export async function startChatVideoSession(access, request, rawRequestId) {
  if (
    access.role !== "LAWYER" ||
    access.mode !== "CASE" ||
    !access.canStartVideo
  ) {
    return {
      ok: false,
      status: 403,
      message: "Somente o advogado vinculado pode iniciar a videochamada.",
    };
  }

  const requestId = normalizeChatRequestId(rawRequestId);
  if (!requestId) {
    return {
      ok: false,
      status: 400,
      message: "Identificador da videochamada inválido.",
    };
  }

  const roomName = buildRoomName(access.caseId);
  const { data, error } = await access.db.rpc("start_chat_video_session", {
    p_case_id: access.caseId,
    p_lawyer_id: access.user.id,
    p_request_id: requestId,
    p_room_name: roomName,
    p_ip_hash: getRequestIpHash(request),
    p_user_agent: getRequestUserAgent(request),
  });

  if (error) {
    return {
      ok: false,
      ...rpcFailure(error, "Não foi possível iniciar a videochamada."),
    };
  }

  if (!data?.session_id || !data?.room_name) {
    return {
      ok: false,
      status: 500,
      message: "A operação de vídeo não retornou os dados esperados.",
    };
  }

  if (!data.already_processed && Number(data.charged_juris || 0) > 0) {
    await checkAndNotifyLowBalance(
      access.user.id,
      Number(data.previous_balance || 0),
      Number(data.new_balance || 0),
    ).catch((balanceError) => {
      console.error(
        "[Chat/Vídeo] Falha ao verificar saldo baixo:",
        balanceError?.message || balanceError,
      );
    });

    await pushVideoInvite({
      clientId: data.client_id || access.caseItem.cliente_id,
      caseId: access.caseId,
      caseTitle: access.caseItem.titulo,
    });
  }

  return {
    ok: true,
    alreadyProcessed: Boolean(data.already_processed),
    session: {
      id: data.session_id,
      messageId: data.message_id || null,
      provider: "JITSI",
      status: data.status || "CREATED",
      roomName: data.room_name,
      joinUrl: buildJoinUrl(data.room_name),
      chargedJuris: Number(data.charged_juris || 0),
      previousBalance: Number(data.previous_balance || 0),
      newBalance: Number(data.new_balance || 0),
    },
  };
}

export async function joinChatVideoSession(
  access,
  request,
  rawSessionId,
  rawRequestId,
) {
  const sessionId = String(rawSessionId || "").trim();
  const requestId = normalizeChatRequestId(rawRequestId);
  if (!isChatUuid(sessionId) || !requestId) {
    return {
      ok: false,
      status: 400,
      message: "Videochamada ou solicitação inválida.",
    };
  }

  if (access.mode !== "CASE") {
    return {
      ok: false,
      status: 403,
      message: "Videochamadas estão disponíveis somente no atendimento contratado.",
    };
  }

  const { data: session, error: sessionError } = await access.db
    .from("chat_video_sessions")
    .select("id, case_id, lawyer_id, client_id, status")
    .eq("id", sessionId)
    .eq("case_id", access.caseId)
    .maybeSingle();

  if (sessionError) throw sessionError;
  if (!session) {
    return {
      ok: false,
      status: 404,
      message: "Videochamada não encontrada nesta conversa.",
    };
  }

  const isParticipant =
    String(session.lawyer_id) === String(access.user.id) ||
    String(session.client_id) === String(access.user.id);
  if (!isParticipant) {
    return {
      ok: false,
      status: 403,
      message: "Você não participa desta videochamada.",
    };
  }

  const { data, error } = await access.db.rpc("join_chat_video_session", {
    p_session_id: sessionId,
    p_user_id: access.user.id,
    p_request_id: requestId,
    p_ip_hash: getRequestIpHash(request),
    p_user_agent: getRequestUserAgent(request),
  });

  if (error) {
    return {
      ok: false,
      ...rpcFailure(error, "Não foi possível entrar na videochamada."),
    };
  }

  if (!data?.session_id || !data?.room_name) {
    return {
      ok: false,
      status: 500,
      message: "A videochamada não retornou os dados esperados.",
    };
  }

  return {
    ok: true,
    alreadyProcessed: Boolean(data.already_processed),
    session: {
      id: data.session_id,
      provider: "JITSI",
      status: data.status || "ACTIVE",
      roomName: data.room_name,
      joinUrl: buildJoinUrl(data.room_name),
      chargedJuris: 0,
    },
  };
}
