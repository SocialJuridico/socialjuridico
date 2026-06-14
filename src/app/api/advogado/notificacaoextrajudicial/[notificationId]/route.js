import { serializeExtrajudicialNotification } from "@/lib/extrajudicialNotificationValidation";
import {
  scopeSmartDocQuery,
  smartDocFailure,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";
import { requireDocumentProtectionAccess } from "@/lib/lawyerDocumentProtection/documentProtectionServer";
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
      .select("*")
      .eq("id", notificationId);
    query = scopeSmartDocQuery(query, access.lawyerIds);

    const { data: row, error } = await query.maybeSingle();
    if (error) throw error;
    if (!row) {
      return smartDocJson(
        { success: false, message: "Notificação não encontrada." },
        404,
      );
    }

    const memberMap = new Map(
      (access.members || []).map((member) => [member.id, member]),
    );
    const clientMap = new Map();

    if (row.client_id) {
      let clientQuery = access.db
        .from("crm_clients")
        .select("id, name, email, lawyer_id")
        .eq("id", row.client_id);
      clientQuery = scopeSmartDocQuery(clientQuery, access.lawyerIds);
      const clientResult = await clientQuery.maybeSingle();
      if (clientResult.error) throw clientResult.error;
      if (clientResult.data) clientMap.set(clientResult.data.id, clientResult.data);
    }

    return smartDocJson({
      success: true,
      data: serializeExtrajudicialNotification(row, { memberMap, clientMap }),
    });
  } catch (error) {
    console.error("[Advogado/NotificacaoExtrajudicial/Detalhe][GET] Erro:", error);
    const failure = smartDocFailure(
      error,
      "Não foi possível carregar os detalhes da notificação.",
    );
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}
