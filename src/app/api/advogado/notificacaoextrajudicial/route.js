import {
  matchesExtrajudicialNotificationFilters,
  normalizeNotificationQuery,
  serializeExtrajudicialNotification,
} from "@/lib/extrajudicialNotificationValidation";
import {
  scopeSmartDocQuery,
  smartDocFailure,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";
import { requireDocumentProtectionAccess } from "@/lib/lawyerDocumentProtection/documentProtectionServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await requireDocumentProtectionAccess(request);
    if (!access.ok) return access.response;

    const filters = normalizeNotificationQuery(new URL(request.url).searchParams);

    let notificationQuery = access.db
      .from("blindagem_notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    notificationQuery = scopeSmartDocQuery(notificationQuery, access.lawyerIds);

    const { data: rows, error } = await notificationQuery;
    if (error) throw error;

    const clientIds = [
      ...new Set((rows || []).map((row) => row.client_id).filter(Boolean)),
    ];
    const clientMap = new Map();

    if (clientIds.length > 0) {
      let clientsQuery = access.db
        .from("crm_clients")
        .select("id, name, email, lawyer_id")
        .in("id", clientIds.slice(0, 1000));
      clientsQuery = scopeSmartDocQuery(clientsQuery, access.lawyerIds);
      const clientsResult = await clientsQuery;
      if (clientsResult.error) throw clientsResult.error;
      for (const client of clientsResult.data || []) {
        clientMap.set(client.id, client);
      }
    }

    let allClientsQuery = access.db
      .from("crm_clients")
      .select("id, name, email, lawyer_id")
      .order("name", { ascending: true })
      .limit(500);
    allClientsQuery = scopeSmartDocQuery(allClientsQuery, access.lawyerIds);
    const allClientsResult = await allClientsQuery;
    if (allClientsResult.error) throw allClientsResult.error;

    const memberMap = new Map(
      (access.members || []).map((member) => [member.id, member]),
    );
    const notifications = (rows || []).map((row) =>
      serializeExtrajudicialNotification(row, { memberMap, clientMap }),
    );

    const metrics = notifications.reduce(
      (accumulator, notification) => {
        accumulator.total += 1;
        if (notification.status === "lido") accumulator.read += 1;
        if (notification.status === "erro_envio") accumulator.errors += 1;
        if (notification.hasLocation) accumulator.located += 1;
        return accumulator;
      },
      { total: 0, read: 0, located: 0, errors: 0 },
    );
    metrics.pending = Math.max(0, metrics.total - metrics.read - metrics.errors);
    metrics.readRate = metrics.total
      ? Math.round((metrics.read / metrics.total) * 100)
      : 0;

    const filtered = notifications.filter((notification) =>
      matchesExtrajudicialNotificationFilters(notification, filters),
    );
    const total = filtered.length;
    const from = (filters.page - 1) * filters.pageSize;

    return smartDocJson({
      success: true,
      data: filtered.slice(from, from + filters.pageSize),
      metrics,
      clients: (allClientsResult.data || []).map((client) => ({
        id: client.id,
        name: client.name,
        email: client.email || "",
      })),
      plan: {
        type: access.planType,
        included: access.planType !== "START",
      },
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      },
    });
  } catch (error) {
    console.error("[Advogado/NotificacaoExtrajudicial][GET] Erro:", error);
    const failure = smartDocFailure(
      error,
      "Não foi possível carregar as notificações extrajudiciais.",
    );
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}
