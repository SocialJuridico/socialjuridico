import crypto from "node:crypto";

import {
  auditChatAction,
  chatJson,
  createChatTextMessage,
  listChatMessages,
  markChatMessagesRead,
  resolveChatAccess,
  serializeChatContext,
} from "@/lib/messages/chatServer";
import { validateMessageMutationOrigin } from "@/lib/messages/messageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function interestFromUrl(request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("interest");
}

export async function GET(request, context) {
  try {
    const { casoId } = await context.params;
    const { searchParams } = new URL(request.url);
    const access = await resolveChatAccess(
      request,
      String(casoId || ""),
      searchParams.get("interest"),
    );
    if (!access.ok) return access.response;

    const result = await listChatMessages(access, searchParams.get("cursor"));
    if (!result.ok) {
      return chatJson(
        { success: false, message: result.message },
        result.status,
      );
    }

    if (!searchParams.get("cursor")) {
      await auditChatAction(access, request, {
        action: "CONVERSATION_VIEWED",
        requestId: crypto.randomUUID(),
        metadata: { mode: access.mode },
      }).catch((auditError) => {
        console.error("[Chat] Falha não fatal na auditoria de acesso:", auditError);
      });
    }

    return chatJson({
      success: true,
      data: {
        ...serializeChatContext(access),
        messages: result.messages,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    console.error("[Chat][GET] Erro:", error);
    return chatJson(
      { success: false, message: "Não foi possível carregar a conversa." },
      500,
    );
  }
}

export async function POST(request, context) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const { casoId } = await context.params;
    const body = await request.json().catch(() => null);
    const access = await resolveChatAccess(
      request,
      String(casoId || ""),
      body?.interestId,
    );
    if (!access.ok) return access.response;

    const result = await createChatTextMessage(access, request, body);
    if (!result.ok) {
      return chatJson(
        { success: false, message: result.message },
        result.status,
      );
    }

    return chatJson(
      {
        success: true,
        data: result.message,
        alreadyProcessed: result.alreadyProcessed,
      },
      result.alreadyProcessed ? 200 : 201,
    );
  } catch (error) {
    console.error("[Chat][POST] Erro:", error);
    return chatJson(
      { success: false, message: "Não foi possível enviar a mensagem." },
      500,
    );
  }
}

export async function PATCH(request, context) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const { casoId } = await context.params;
    const body = await request.json().catch(() => null);
    const access = await resolveChatAccess(
      request,
      String(casoId || ""),
      body?.interestId ?? interestFromUrl(request),
    );
    if (!access.ok) return access.response;

    const result = await markChatMessagesRead(
      access,
      request,
      body?.requestId,
    );

    return chatJson({ success: true, data: result });
  } catch (error) {
    console.error("[Chat][PATCH] Erro:", error);
    return chatJson(
      { success: false, message: "Não foi possível marcar a conversa como lida." },
      500,
    );
  }
}
