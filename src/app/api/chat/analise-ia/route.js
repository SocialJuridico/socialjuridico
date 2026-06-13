import crypto from "node:crypto";

import { generateChatAnalysis } from "@/lib/messages/chatAiServer";
import { chatJson, resolveChatAccess } from "@/lib/messages/chatServer";
import { validateMessageMutationOrigin } from "@/lib/messages/messageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const originResponse = validateMessageMutationOrigin(request);
    if (originResponse) return originResponse;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caso_id || body?.caseId || "").trim();
    const interestId =
      String(body?.interest_id || body?.interestId || "").trim() || null;
    const rawMessageId = String(
      body?.mensagem_id || body?.messageId || "",
    ).trim();
    const isGlobal = !rawMessageId || rawMessageId === "global";

    const access = await resolveChatAccess(request, caseId, interestId);
    if (!access.ok) return access.response;

    const result = await generateChatAnalysis(access, request, {
      requestId: body?.requestId || crypto.randomUUID(),
      scope: isGlobal ? "GLOBAL" : "MESSAGE",
      messageId: isGlobal ? null : rawMessageId,
    });

    if (!result.ok) {
      return chatJson(
        { success: false, message: result.message },
        result.status,
      );
    }

    return chatJson({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      data: {
        id: result.analysis.id,
        mensagem_id: result.analysis.targetMessageId,
        analise_texto: result.analysis.text,
        model: result.analysis.model,
        created_at: result.analysis.createdAt,
        cached: result.analysis.cached,
      },
    });
  } catch (error) {
    console.error("[Chat/IA Legada] Erro:", error);
    const missingMigration = ["PGRST202", "PGRST204", "42703"].includes(
      error?.code,
    );
    return chatJson(
      {
        success: false,
        message: missingMigration
          ? "Execute a migração de governança do chat antes de usar a IA."
          : "Não foi possível consultar o assistente agora.",
      },
      missingMigration ? 503 : 500,
    );
  }
}
