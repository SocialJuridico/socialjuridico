import { getIntentTier } from "@/lib/clientDashboard/caseIntentQuestions";
import {
  calculatePrivacyAttention,
  deriveCaseStage,
  fetchGovernanceMap,
  getLastActivityAt,
  getOperationalAlert,
  json,
  maskEmail,
  requireAdminCaseAccess,
} from "./adminCases";

const QUERY_BATCH_SIZE = 200;

async function fetchCases(db) {
  const modern = await db
    .from("casos")
    .select(
      "id, titulo, area_atuacao, status, cliente_id, advogado_id, created_at, updated_at, anexos, cidade, estado, video_link, video_url, audio_url, intencao_fechamento",
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (!modern.error) return modern.data || [];

  const fallback = await db
    .from("casos")
    .select(
      "id, titulo, area_atuacao, status, cliente_id, advogado_id, created_at, updated_at, anexos, cidade, estado",
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (fallback.error) {
    throw new Error(`Falha ao consultar casos: ${fallback.error.message}`);
  }

  return fallback.data || [];
}

async function fetchChunked(db, table, select, column, ids) {
  const rows = [];

  for (let index = 0; index < ids.length; index += QUERY_BATCH_SIZE) {
    const batch = ids.slice(index, index + QUERY_BATCH_SIZE);
    const { data, error } = await db
      .from(table)
      .select(select)
      .in(column, batch);

    if (error) {
      throw new Error(`Falha ao consultar ${table}: ${error.message}`);
    }

    rows.push(...(data || []));
  }

  return rows;
}

function summarizeInterestStatuses(interests) {
  return interests.reduce(
    (summary, interest) => {
      const status = String(interest.status || "").toUpperCase();
      summary.total += 1;

      if (status === "PENDING") summary.pending += 1;
      else if (status === "NEGOTIATING") summary.negotiating += 1;
      else if (status === "HIRED") summary.hired += 1;
      else if (["DECLINED", "LOST_VACANCY", "CANCELED"].includes(status)) {
        summary.rejected += 1;
      }

      return summary;
    },
    { total: 0, pending: 0, negotiating: 0, hired: 0, rejected: 0 },
  );
}

function calculateSummary(cases) {
  const summary = cases.reduce(
    (current, caseItem) => {
      current.total += 1;
      current.byStage[caseItem.stage] =
        (current.byStage[caseItem.stage] || 0) + 1;
      if (caseItem.alert?.severity === "HIGH") current.critical += 1;
      if (caseItem.alert) current.needsAction += 1;
      if (caseItem.privacyAttention === "RESTRICTED") current.restricted += 1;
      if (caseItem.interestSummary.total > 0) current.withInterest += 1;
      current.byIntentTier[caseItem.intentTier] =
        (current.byIntentTier[caseItem.intentTier] || 0) + 1;
      return current;
    },
    {
      total: 0,
      critical: 0,
      needsAction: 0,
      restricted: 0,
      withInterest: 0,
      byStage: {},
      byIntentTier: {},
    },
  );

  const hired = summary.byStage.HIRED || 0;
  const waitingClient = summary.byStage.WAITING_CLIENT || 0;

  return {
    ...summary,
    hired,
    waitingClient,
    conversionRate: summary.total
      ? Number(((hired / summary.total) * 100).toFixed(1))
      : 0,
    interestRate: summary.total
      ? Number(((summary.withInterest / summary.total) * 100).toFixed(1))
      : 0,
    countAlta: summary.byIntentTier.ALTA || 0,
    countMedia: summary.byIntentTier.MEDIA || 0,
    countOraculo: summary.byIntentTier.ORACULO || 0,
    countLegado: summary.byIntentTier.LEGADO || 0,
  };
}

export async function getAdminCases() {
  try {
    const access = await requireAdminCaseAccess();
    if (!access.ok) return access.response;

    const cases = await fetchCases(access.db);
    const caseIds = cases.map((item) => item.id).filter(Boolean);

    if (!caseIds.length) {
      return json({
        success: true,
        data: {
          cases: [],
          summary: calculateSummary([]),
          governanceAvailable: true,
          privacy: { maskedByDefault: true },
        },
      });
    }

    const clientIds = [
      ...new Set(cases.map((item) => item.cliente_id).filter(Boolean)),
    ];
    const directLawyerIds = [
      ...new Set(cases.map((item) => item.advogado_id).filter(Boolean)),
    ];

    const [interests, clients, governanceResult] = await Promise.all([
      fetchChunked(
        access.db,
        "case_interests",
        "id, case_id, lawyer_id, status, created_at",
        "case_id",
        caseIds,
      ),
      clientIds.length
        ? fetchChunked(
            access.db,
            "clientes",
            "id, name, email",
            "id",
            clientIds,
          )
        : [],
      fetchGovernanceMap(access.db, caseIds),
    ]);

    const allLawyerIds = [
      ...new Set([
        ...directLawyerIds,
        ...interests.map((item) => item.lawyer_id).filter(Boolean),
      ]),
    ];

    const lawyers = allLawyerIds.length
      ? await fetchChunked(
          access.db,
          "advogados",
          "id, name, oab",
          "id",
          allLawyerIds,
        )
      : [];

    const clientMap = new Map(clients.map((item) => [item.id, item]));
    const lawyerMap = new Map(lawyers.map((item) => [item.id, item]));
    const interestsByCase = new Map();

    for (const interest of interests) {
      const current = interestsByCase.get(interest.case_id) || [];
      const lawyer = lawyerMap.get(interest.lawyer_id);

      current.push({
        ...interest,
        lawyer: lawyer
          ? {
              id: interest.lawyer_id,
              name: lawyer.name || "Advogado",
              oab: lawyer.oab || "",
            }
          : {
              id: interest.lawyer_id,
              name: "Advogado não localizado",
              oab: "",
            },
      });
      interestsByCase.set(interest.case_id, current);
    }

    const normalizedCases = cases.map((caseItem) => {
      const caseInterests = interestsByCase.get(caseItem.id) || [];
      const governance = governanceResult.map.get(caseItem.id) || null;
      const interestSummary = summarizeInterestStatuses(caseInterests);
      const stage = deriveCaseStage(caseItem, caseInterests, governance);
      const lastActivityAt = getLastActivityAt(
        caseItem,
        caseInterests,
        governance,
      );
      const client = clientMap.get(caseItem.cliente_id);
      const hiredLawyer = lawyerMap.get(caseItem.advogado_id);
      const attachments = Array.isArray(caseItem.anexos) ? caseItem.anexos : [];

      return {
        id: caseItem.id,
        title: caseItem.titulo || "Caso sem título",
        area: caseItem.area_atuacao || "Não informada",
        city: caseItem.cidade || "",
        state: caseItem.estado || "",
        sourceStatus: caseItem.status || "ABERTO",
        stage,
        intencaoFechamento: Number.isFinite(caseItem.intencao_fechamento)
          ? caseItem.intencao_fechamento
          : null,
        intentTier: getIntentTier(caseItem.intencao_fechamento),
        createdAt: caseItem.created_at,
        updatedAt: caseItem.updated_at,
        lastActivityAt,
        client: {
          id: caseItem.cliente_id,
          name: client?.name || "Cliente não localizado",
          maskedEmail: maskEmail(client?.email),
          hasEmail: Boolean(client?.email),
        },
        hiredLawyer: hiredLawyer
          ? {
              id: hiredLawyer.id,
              name: hiredLawyer.name || "Advogado",
              oab: hiredLawyer.oab || "",
            }
          : null,
        interests: caseInterests,
        interestSummary,
        attachmentCount: attachments.length,
        hasMedia: Boolean(
          caseItem.video_link || caseItem.video_url || caseItem.audio_url,
        ),
        privacyAttention: calculatePrivacyAttention(caseItem, governance),
        governance: governance
          ? {
              operationalStage: governance.operational_stage,
              riskLevel: governance.risk_level,
              assignedAdminId: governance.assigned_admin_id,
              nextActionAt: governance.next_action_at,
              lastClientNotificationAt:
                governance.last_client_notification_at,
              notificationCount: governance.notification_count || 0,
              legalHold: Boolean(governance.legal_hold),
              retentionUntil: governance.retention_until,
              archivedAt: governance.archived_at,
              archiveReason: governance.archive_reason,
            }
          : null,
        alert: getOperationalAlert(
          stage,
          lastActivityAt,
          interestSummary.pending,
        ),
      };
    });

    return json({
      success: true,
      data: {
        cases: normalizedCases,
        summary: calculateSummary(normalizedCases),
        governanceAvailable: governanceResult.available,
        privacy: {
          maskedByDefault: true,
          sensitiveAccessRequiresPurpose: true,
          listContainsDescriptions: false,
          listContainsAttachmentUrls: false,
        },
      },
    });
  } catch (error) {
    console.error("[Admin/Casos][GET] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível carregar os casos administrativos.",
      },
      500,
    );
  }
}
