import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@/lib/supabaseServer";

import {
  ACTIVE_MESSAGE_INTEREST_STATUSES,
  isValidMessageUuid,
  normalizeMessageText,
  parseMediaMessage,
  serializeMediaMessage,
} from "./messagePresentation";

export function messageJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function validateMessageMutationOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

  try {
    if (!host || new URL(origin).host !== host) {
      return messageJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return messageJson(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

export async function requireMessageUser(request, options = {}) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return {
      ok: false,
      response: messageJson({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const supabase = createClient();
  const db = supabaseAdmin || supabase;
  const [lawyerResult, clientResult] = await Promise.all([
    db
      .from("advogados")
      .select("id, name, role, avatar, oab_verification_status")
      .eq("id", user.id)
      .maybeSingle(),
    db
      .from("clientes")
      .select("id, name, role, avatar")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (lawyerResult.error) throw lawyerResult.error;
  if (clientResult.error) throw clientResult.error;

  const lawyer = lawyerResult.data || null;
  const client = clientResult.data || null;
  const role = lawyer ? "LAWYER" : client ? "CLIENT" : null;
  const profile = lawyer || client;

  if (!role || !profile) {
    return {
      ok: false,
      response: messageJson(
        { success: false, message: "Perfil de acesso não encontrado." },
        403,
      ),
    };
  }

  if (options.lawyerOnly && role !== "LAWYER") {
    return {
      ok: false,
      response: messageJson(
        { success: false, message: "Apenas advogados utilizam esta rota." },
        403,
      ),
    };
  }

  if (lawyer?.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: messageJson(
        {
          success: false,
          message: "Acesso suspenso por inconsistências na verificação da OAB.",
          blocked: true,
        },
        403,
      ),
    };
  }

  return { ok: true, user, profile, role, db };
}

export async function resolveMessageConversation(
  db,
  userId,
  caseId,
  interestId = null,
) {
  if (!isValidMessageUuid(caseId)) {
    return { ok: false, status: 400, message: "Caso inválido." };
  }

  if (interestId && !isValidMessageUuid(interestId)) {
    return { ok: false, status: 400, message: "Negociação inválida." };
  }

  const { data: caseItem, error: caseError } = await db
    .from("casos")
    .select(
      "id, titulo, area_atuacao, cidade, estado, status, cliente_id, advogado_id, created_at",
    )
    .eq("id", caseId)
    .maybeSingle();

  if (caseError) throw caseError;
  if (!caseItem) {
    return { ok: false, status: 404, message: "Caso não encontrado." };
  }

  let interest = null;

  if (interestId) {
    const { data, error } = await db
      .from("case_interests")
      .select("id, case_id, lawyer_id, status, created_at")
      .eq("id", interestId)
      .maybeSingle();

    if (error) throw error;
    interest = data || null;

    if (!interest || String(interest.case_id) !== String(caseItem.id)) {
      return { ok: false, status: 404, message: "Negociação não encontrada." };
    }

    if (!ACTIVE_MESSAGE_INTEREST_STATUSES.includes(interest.status)) {
      return {
        ok: false,
        status: 403,
        message: "Esta negociação não está disponível para novas mensagens.",
      };
    }

    const isParticipant =
      String(userId) === String(interest.lawyer_id) ||
      String(userId) === String(caseItem.cliente_id);

    if (!isParticipant) {
      return {
        ok: false,
        status: 403,
        message: "Você não possui acesso a esta negociação.",
      };
    }
  } else {
    const isParticipant =
      String(userId) === String(caseItem.cliente_id) ||
      String(userId) === String(caseItem.advogado_id);

    if (!isParticipant) {
      return {
        ok: false,
        status: 403,
        message: "Você não possui acesso a esta conversa.",
      };
    }
  }

  return { ok: true, caseItem, interest };
}

function allowedStorageHosts() {
  const hosts = new Set();
  for (const value of [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]) {
    if (!value) continue;
    try {
      hosts.add(new URL(value).host);
    } catch {
      // configuração inválida é ignorada; o conteúdo continuará bloqueado.
    }
  }
  return hosts;
}

export function normalizeStoredMessageContent(value) {
  const media = parseMediaMessage(String(value || ""));
  if (media) {
    const hosts = allowedStorageHosts();
    const mediaHost = new URL(media.fileUrl).host;

    if (!hosts.has(mediaHost)) {
      return {
        ok: false,
        message: "O anexo informado não pertence a um armazenamento autorizado.",
      };
    }

    return { ok: true, content: serializeMediaMessage(media), media };
  }

  const content = normalizeMessageText(value);
  if (!content) {
    return { ok: false, message: "Digite uma mensagem antes de enviar." };
  }

  return { ok: true, content, media: null };
}

export function conversationQuery(query, interestId = null) {
  return interestId
    ? query.eq("interest_id", interestId)
    : query.is("interest_id", null);
}

export function parseNotificationMeta(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
