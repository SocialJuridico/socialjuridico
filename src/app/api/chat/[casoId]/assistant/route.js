import { generateChatAnalysis } from "@/lib/messages/chatAiServer";
import { chatJson, resolveChatAccess } from "@/lib/messages/chatServer";
import { validateMessageMutationOrigin } from "@/lib/messages/messageServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const result = await generateChatAnalysis(access, request, body);
    if (!result.ok) {
      return chatJson(
        { success: false, message: result.message },
        result.status,
      );
    }

    return chatJson({
      success: true,
      alreadyProcessed: result.alreadyProcessed,
      data: result.analysis,
    });
  } catch (error) {
    console.error("[Chat/Assistente][POST] Erro:", error);
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
