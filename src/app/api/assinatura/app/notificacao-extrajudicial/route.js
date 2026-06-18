import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import {
  requireSignatureProductAccess,
  signatureProductJson,
} from "@/lib/signatureProductServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLAN_NOTIFICATION_LIMITS = {
  FREE: 0,
  ESSENTIAL: 2,
  PROFESSIONAL: 5,
  BUSINESS: 10,
  UNLIMITED: null, // Unlimited
};

const PLAN_LABELS = {
  FREE: "Gratuito",
  ESSENTIAL: "Essencial",
  PROFESSIONAL: "Profissional",
  BUSINESS: "Negócios",
  UNLIMITED: "Ilimitado",
};

export async function GET(request) {
  try {
    const access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get("pageSize") || "12", 10)));
    const search = (url.searchParams.get("search") || "").trim().toLowerCase();
    const statusFilter = url.searchParams.get("status") || "all";

    // 1. Fetch Plan limits
    const { data: subscription, error: subError } = await access.db
      .from("signature_subscriptions")
      .select("plan_code")
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (subError) throw subError;

    const planCode = subscription?.plan_code || "FREE";
    const limit = PLAN_NOTIFICATION_LIMITS[planCode] ?? 0;

    // 2. Query all notifications for metrics
    const { data: allNotifications, error: allErr } = await access.db
      .from("signature_extrajudicial_notifications")
      .select("status, read_geo")
      .eq("organization_id", access.organizationId);
    if (allErr) throw allErr;

    const metrics = (allNotifications || []).reduce(
      (acc, n) => {
        acc.total += 1;
        if (n.status === "READ") acc.read += 1;
        if (n.status === "ERROR") acc.errors += 1;
        if (n.read_geo) acc.located += 1;
        return acc;
      },
      { total: 0, read: 0, located: 0, errors: 0 }
    );
    metrics.pending = Math.max(0, metrics.total - metrics.read - metrics.errors);
    metrics.readRate = metrics.total ? Math.round((metrics.read / metrics.total) * 100) : 0;

    // 3. Query filtered notifications
    let dbQuery = access.db
      .from("signature_extrajudicial_notifications")
      .select("*")
      .eq("organization_id", access.organizationId)
      .order("created_at", { ascending: false });

    const { data: rows, error: rowsErr } = await dbQuery;
    if (rowsErr) throw rowsErr;

    // Client-side search and status filtering (resilient to complex patterns)
    let filtered = rows || [];
    if (statusFilter !== "all") {
      const matchStatus = statusFilter === "lido" ? "READ" : statusFilter === "erro_envio" ? "ERROR" : "SENT";
      filtered = filtered.filter((n) => n.status === matchStatus);
    }
    if (search) {
      filtered = filtered.filter(
        (n) =>
          n.protocol.toLowerCase().includes(search) ||
          n.recipient_email.toLowerCase().includes(search) ||
          (n.case_id && n.case_id.toLowerCase().includes(search))
      );
    }

    const total = filtered.length;
    const fromIndex = (page - 1) * pageSize;
    const paginatedRows = filtered.slice(fromIndex, fromIndex + pageSize);

    // 4. Fetch frequent recipients from previous envelopes to populate CRM-like autocomplete suggestions
    const { data: envelopes } = await access.db
      .from("signature_envelopes")
      .select("id")
      .eq("organization_id", access.organizationId)
      .limit(300);
    const envelopeIds = (envelopes || []).map((env) => env.id);

    let contacts = [];
    if (envelopeIds.length > 0) {
      const { data: recipients, error: recError } = await access.db
        .from("signature_recipients")
        .select("name, email")
        .in("envelope_id", envelopeIds)
        .limit(1000);
      if (!recError && recipients) {
        const seen = new Set();
        for (const r of recipients) {
          const emailLower = r.email.toLowerCase();
          if (!seen.has(emailLower) && r.name) {
            seen.add(emailLower);
            contacts.push({
              id: emailLower,
              name: r.name,
              email: r.email,
            });
          }
        }
      }
    }

    // Sort contacts by name
    contacts.sort((a, b) => a.name.localeCompare(b.name));

    return signatureProductJson({
      success: true,
      data: paginatedRows.map((n) => ({
        id: n.id,
        recipientEmail: n.recipient_email,
        protocol: n.protocol,
        status: n.status === "READ" ? "lido" : n.status === "ERROR" ? "erro_envio" : "enviado",
        hasReadEvidence: n.status === "READ",
        hasLocation: !!n.read_geo,
        readAt: n.read_at,
        readIp: n.read_ip,
        readUserAgent: n.read_user_agent,
        readGeo: n.read_geo,
        fileName: n.file_name,
        createdAt: n.created_at,
        tone: n.tone,
        caseId: n.case_id,
        trackingUrl: `/assinatura/notificacao/${n.access_token}`,
        documentUrl: `/api/assinatura/notificacao/${n.access_token}/arquivo`,
        hash: n.hash_sha512,
      })),
      metrics,
      clients: contacts, // Returns autocomplete suggestions
      plan: {
        type: planCode,
        included: limit !== 0,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error("[Signature NotificacaoExtrajudicial][GET] Erro:", error);
    return signatureProductJson({ success: false, message: "Erro ao carregar notificações extrajudiciais." }, 500);
  }
}
