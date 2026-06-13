import crypto from "node:crypto";

import { chatJson, resolveChatAccess } from "@/lib/messages/chatServer";
import { startChatVideoSession } from "@/lib/messages/chatVideoServer";
import { validateMessageMutationOrigin } from "@/lib/messages/messageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.casoId || body?.caseId || "").trim();
    const access = await resolveChatAccess(request, caseId, null);
    if (!access.ok) return access.response;

    const result = await startChatVideoSession(
      access,
      request,
      body?.requestId || crypto.randomUUID(),
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
        message: result.alreadyProcessed
          ? "Esta videochamada já havia sido criada."
          : "Videochamada criada. 2 Juris foram debitados.",
        meetLink: result.session.joinUrl,
        sessionId: result.session.id,
        chargedJuris: result.session.chargedJuris,
        newBalance: result.session.newBalance,
      },
      result.alreadyProcessed ? 200 : 201,
    );
  } catch (error) {
    console.error("[Chat/Vídeo Legado] Erro:", error);
    return chatJson(
      { success: false, message: "Não foi possível iniciar a videochamada." },
      500,
    );
  }
}
