import {
  clientFailure,
  clientJson,
  requireLawyerClientAccess,
  scopeClientQuery,
} from "@/lib/lawyerClients/clientServer";
import { serializeProcessListItem } from "@/lib/lawyerProcesses/processServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      30,
      Math.max(1, Number.parseInt(searchParams.get("pageSize") || "12", 10) || 12),
    );
    const search = String(searchParams.get("search") || "").replace(/[^\d]/g, "").slice(0, 20);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = access.db
      .from("lawyer_processes")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    query = scopeClientQuery(query, access.lawyerIds);
    if (search) query = query.ilike("numero_cnj", `%${search}%`);

    const { data, error, count } = await query;
    if (error) throw error;

    const clientIds = [...new Set((data || []).map((item) => item.client_id).filter(Boolean))];
    const clientMap = new Map();

    if (clientIds.length) {
      const { data: clients, error: clientsError } = await access.db
        .from("crm_clients")
        .select("id, name")
        .in("id", clientIds);
      if (clientsError) throw clientsError;
      for (const client of clients || []) clientMap.set(client.id, client);
    }

    return clientJson({
      success: true,
      data: (data || []).map((item) => serializeProcessListItem(item, clientMap)),
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    });
  } catch (error) {
    console.error("[Advogado/Processos][GET] Erro:", error);
    const failure = clientFailure(error, "Não foi possível carregar os processos.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
