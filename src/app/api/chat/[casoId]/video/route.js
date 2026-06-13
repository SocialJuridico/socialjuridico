import { chatJson, resolveChatAccess } from "@/lib/messages/chatServer";
import {
  joinChatVideoSession,
  startChatVideoSession,
} from "@/lib/messages/chatVideoServer";
import { validateMessageMutationOrigin } from "@/lib/messages/messageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const { casoId } = await context.params;
    const body = await request.json().catch(() => null);
    const access = await resolveChatAccess(request, String(casoId || ""), null);
    if (!access.ok) return access.response;

    const result = await startChatVideoSession(
      access,
      request,
      body?.requestId,
    );
    if (!result.ok) {
      return chatJson(
        { success: false, message: result.message },
        result.status,
      );
    }

    return chatJson(
      {
        success: true,
        alreadyProcessed: result.alreadyProcessed,
        data: result.session,
        message: result.alreadyProcessed
          ? "Esta videochamada já havia sido criada."
          : "Videochamada criada. 2 Juris foram debitados.",
      },
      result.alreadyProcessed ? 200 : 201,
    );
  } catch (error) {
    console.error("[Chat/Vídeo][POST] Erro:", error);
    return chatJson(
      { success: false, message: "Não foi possível iniciar a videochamada." },
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
    const access = await resolveChatAccess(request, String(casoId || ""), null);
    if (!access.ok) return access.response;

    const result = await joinChatVideoSession(
      access,
      request,
      body?.sessionId,
      body?.requestId,
    );
    if (!result.ok) {
      return chatJson(
        { success: false, message: result.message },
        result.status,
      );
    }

    return chatJson({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      data: result.session,
      message: "Entrada na videochamada autorizada.",
    });
  } catch (error) {
    console.error("[Chat/Vídeo][PATCH] Erro:", error);
    return chatJson(
      { success: false, message: "Não foi possível entrar na videochamada." },
      500,
    );
  }
}
