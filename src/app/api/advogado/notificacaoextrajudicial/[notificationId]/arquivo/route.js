import {
  scopeSmartDocQuery,
  smartDocFailure,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";
import { requireDocumentProtectionAccess } from "@/lib/lawyerDocumentProtection/documentProtectionServer";
import { extractLegacyStoragePath } from "@/lib/lawyerDocumentProtection/legacyDocumentProtection";
import { isClientUuid } from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  try {
    const access = await requireDocumentProtectionAccess(request);
    if (!access.ok) return access.response;

    const { notificationId } = await context.params;
    if (!isClientUuid(notificationId)) {
      return smartDocJson(
        { success: false, message: "Notificação inválida." },
        400,
      );
    }

    let query = access.db
      .from("blindagem_notificacoes")
      .select("id, lawyer_id, file_name, file_url")
      .eq("id", notificationId);
    query = scopeSmartDocQuery(query, access.lawyerIds);

    const { data: notification, error } = await query.maybeSingle();
    if (error) throw error;
    if (!notification) {
      return smartDocJson(
        { success: false, message: "Notificação não encontrada." },
        404,
      );
    }

    const storagePath = extractLegacyStoragePath(
      notification.file_url,
      "crm_documents",
    );
    if (!storagePath) {
      return smartDocJson(
        {
          success: false,
          message: "Arquivo da notificação indisponível para acesso seguro.",
        },
        404,
      );
    }

    const preview = new URL(request.url).searchParams.get("preview") === "1";
    const options = preview
      ? undefined
      : { download: notification.file_name || "notificacao-extrajudicial.pdf" };

    const { data: signed, error: signedError } = await access.db.storage
      .from("crm_documents")
      .createSignedUrl(storagePath, 120, options);

    if (signedError || !signed?.signedUrl) {
      throw signedError || new Error("Não foi possível assinar o acesso ao arquivo.");
    }

    return Response.redirect(signed.signedUrl, 302);
  } catch (error) {
    console.error(
      "[Advogado/NotificacaoExtrajudicial/Arquivo][GET] Erro:",
      error,
    );
    const failure = smartDocFailure(
      error,
      "Não foi possível acessar o documento da notificação.",
    );
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}
