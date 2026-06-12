import {
  isValidUuid,
  json,
  recordCaseAudit,
  requireAdminCaseAccess,
} from "../adminCases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validateMutationOrigin(request) {
  const origin = request.headers.get("origin");

  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        {
          success: false,
          message: "Origem da requisição não autorizada.",
        },
        403,
      );
    }
  } catch {
    return json(
      {
        success: false,
        message: "Origem da requisição inválida.",
      },
      403,
    );
  }

  return null;
}

export async function POST(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireAdminCaseAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caseId || "").trim();

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }

    const { data: caseItem, error: caseError } = await access.db
      .from("casos")
      .select("id")
      .eq("id", caseId)
      .maybeSingle();

    if (caseError) {
      throw new Error(`Falha ao validar caso: ${caseError.message}`);
    }

    if (!caseItem) {
      return json({ success: false, message: "Caso não encontrado." }, 404);
    }

    const { data: logs, error: logsError } = await access.db
      .from("admin_case_audit_logs")
      .select(
        "id, admin_id, action, purpose, justification, metadata, created_at",
      )
      .eq("case_id", caseId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (logsError) {
      throw new Error(`Falha ao consultar auditoria: ${logsError.message}`);
    }

    const auditRecorded = await recordCaseAudit(access.db, request, {
      adminId: access.auth.user.id,
      caseId,
      action: "AUDIT_TRAIL_VIEWED",
      purpose: "GOVERNANCE_REVIEW",
      metadata: { returnedEvents: logs?.length || 0 },
    });

    if (!auditRecorded) {
      return json(
        {
          success: false,
          message:
            "A consulta foi bloqueada porque o acesso à auditoria não pôde ser registrado.",
        },
        503,
      );
    }

    return json({
      success: true,
      data: (logs || []).map((event) => ({
        id: event.id,
        adminId: event.admin_id,
        action: event.action,
        purpose: event.purpose,
        justification: event.justification,
        metadata: event.metadata || {},
        createdAt: event.created_at,
      })),
    });
  } catch (error) {
    console.error("[Admin/Casos/Auditoria][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar a trilha de auditoria.",
      },
      500,
    );
  }
}
