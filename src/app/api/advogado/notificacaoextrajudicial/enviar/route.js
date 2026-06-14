import { POST as sendLegacyNotification } from "@/app/api/crm/notificacoes/route";
import { requireDocumentProtectionAccess } from "@/lib/lawyerDocumentProtection/documentProtectionServer";
import { smartDocFailure, smartDocJson } from "@/lib/lawyerSmartDocs/smartDocServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const access = await requireDocumentProtectionAccess(request);
    if (!access.ok) return access.response;

    return sendLegacyNotification(request);
  } catch (error) {
    console.error("[Advogado/NotificacaoExtrajudicial/Enviar][POST] Erro:", error);
    const failure = smartDocFailure(
      error,
      "Não foi possível processar o envio da notificação extrajudicial.",
    );
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}
