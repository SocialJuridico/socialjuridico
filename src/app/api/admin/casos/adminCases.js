import { createHmac } from "node:crypto";
import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const CASE_STAGES = new Set([
  "NEW",
  "MATCHING",
  "WAITING_CLIENT",
  "NEGOTIATING",
  "HIRED",
  "CLOSED",
  "ARCHIVED",
]);

export const CASE_RISK_LEVELS = new Set([
  "STANDARD",
  "ELEVATED",
  "RESTRICTED",
]);

export const SENSITIVE_ACCESS_PURPOSES = new Set([
  "SUPPORT",
  "FRAUD_PREVENTION",
  "LEGAL_REQUEST",
  "DATA_SUBJECT_REQUEST",
  "INCIDENT_RESPONSE",
  "OTHER",
]);

const SENSITIVE_AREA_TERMS = [
  "famil",
  "criminal",
  "violência",
  "violencia",
  "saúde",
  "saude",
  "médic",
  "medic",
  "sexual",
  "previdenci",
  "trabalh",
];

const RISK_WEIGHT = {
  STANDARD: 1,
  ELEVATED: 2,
  RESTRICTED: 3,
};

const GOVERNANCE_QUERY_BATCH_SIZE = 200;

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireAdminCaseAccess() {
  const auth = await getAuthenticatedAdmin();

  if (!auth.ok) {
    return {
      ok: false,
      response: json({ success: false, message: auth.message }, auth.status),
    };
  }

  if (!supabaseAdmin) {
    return {
      ok: false,
      response: json(
        {
          success: false,
          message: "Serviço administrativo indisponível no servidor.",
        },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function maskEmail(value) {
  const email = String(value || "").trim();
  const [local, domain] = email.split("@");

  if (!local || !domain) return "Não informado";

  const localVisible = local.slice(0, Math.min(2, local.length));
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() || "";
  const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";
  const domainVisible = domainName.slice(0, 1);

  return `${localVisible}${"*".repeat(
    Math.max(3, local.length - localVisible.length),
  )}@${domainVisible}${"*".repeat(
    Math.max(3, domainName.length - 1),
  )}${suffix}`;
}

export function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function isMissingGovernanceError(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    error?.code === "42P01" ||
    error?.code === "PGRST205" ||
    message.includes("admin_case_governance") ||
    message.includes("admin_case_audit_logs")
  );
}

export async function fetchGovernanceMap(db, caseIds) {
  if (!caseIds.length) {
    return { available: true, map: new Map() };
  }

  const rows = [];

  for (
    let index = 0;
    index < caseIds.length;
    index += GOVERNANCE_QUERY_BATCH_SIZE
  ) {
    const batch = caseIds.slice(index, index + GOVERNANCE_QUERY_BATCH_SIZE);
    const { data, error } = await db
      .from("admin_case_governance")
      .select(
        "case_id, operational_stage, risk_level, assigned_admin_id, next_action_at, last_client_notification_at, notification_count, legal_hold, retention_until, archived_at, archived_by, archive_reason, updated_at",
      )
      .in("case_id", batch);

    if (error) {
      if (isMissingGovernanceError(error)) {
        return { available: false, map: new Map() };
      }
      throw new Error(`Falha ao carregar governança dos casos: ${error.message}`);
    }

    rows.push(...(data || []));
  }

  return {
    available: true,
    map: new Map(rows.map((item) => [item.case_id, item])),
  };
}

function hashRequestIp(request) {
  const forwarded = request?.headers?.get("x-forwarded-for") || "";
  const ip =
    forwarded.split(",")[0]?.trim() ||
    request?.headers?.get("x-real-ip") ||
    "";

  if (!ip) return null;

  const secret =
    process.env.ADMIN_AUDIT_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) return null;

  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function recordCaseAudit(
  db,
  request,
  {
    adminId,
    caseId = null,
    action,
    purpose,
    justification = null,
    metadata = {},
  },
) {
  const row = {
    id: crypto.randomUUID(),
    admin_id: adminId,
    case_id: caseId,
    action: normalizeText(action, 80),
    purpose: normalizeText(purpose, 80),
    justification: justification ? normalizeText(justification, 1000) : null,
    metadata,
    ip_hash: hashRequestIp(request),
    user_agent:
      normalizeText(request?.headers?.get("user-agent"), 300) || null,
    created_at: new Date().toISOString(),
  };

  const { error } = await db.from("admin_case_audit_logs").insert([row]);

  if (error) {
    if (isMissingGovernanceError(error)) {
      console.warn(
        "[Admin/Casos/Auditoria] Tabela de auditoria ainda não instalada.",
        { action: row.action, caseId: row.case_id },
      );
    } else {
      console.error("[Admin/Casos/Auditoria] Falha ao registrar evento:", error);
    }

    return false;
  }

  return true;
}

function deriveSourceStage(caseItem, interests) {
  const status = String(caseItem?.status || "").toUpperCase();
  const interestStatuses = interests.map((item) =>
    String(item.status || "").toUpperCase(),
  );

  if (
    ["CONTRATADO", "EM_ANDAMENTO"].includes(status) ||
    interestStatuses.includes("HIRED")
  ) {
    return "HIRED";
  }

  if (["FECHADO", "ENCERRADO"].includes(status)) return "CLOSED";
  if (["CANCELADO", "ARQUIVADO"].includes(status)) return "ARCHIVED";

  if (
    status === "NEGOCIANDO" ||
    interestStatuses.includes("NEGOTIATING")
  ) {
    return "NEGOTIATING";
  }

  if (interestStatuses.includes("PENDING")) return "WAITING_CLIENT";
  if (interests.length > 0) return "MATCHING";
  return "NEW";
}

export function deriveCaseStage(caseItem, interests, governance) {
  if (governance?.archived_at) return "ARCHIVED";

  const sourceStage = deriveSourceStage(caseItem, interests);

  if (["HIRED", "CLOSED", "ARCHIVED"].includes(sourceStage)) {
    return sourceStage;
  }

  const governedStage = String(
    governance?.operational_stage || "",
  ).toUpperCase();

  if (
    governedStage &&
    governedStage !== "NEW" &&
    CASE_STAGES.has(governedStage)
  ) {
    return governedStage;
  }

  return sourceStage;
}

function deriveAutomaticRisk(caseItem) {
  const attachments = Array.isArray(caseItem?.anexos) ? caseItem.anexos : [];
  const hasMedia = Boolean(
    caseItem?.video_link || caseItem?.video_url || caseItem?.audio_url,
  );
  const area = String(
    caseItem?.area_atuacao || caseItem?.area || "",
  ).toLowerCase();
  const areaNeedsAttention = SENSITIVE_AREA_TERMS.some((term) =>
    area.includes(term),
  );

  if (attachments.length > 0 || hasMedia) return "RESTRICTED";
  if (areaNeedsAttention) return "ELEVATED";
  return "STANDARD";
}

export function calculatePrivacyAttention(caseItem, governance) {
  const automaticRisk = deriveAutomaticRisk(caseItem);
  const governedRisk = String(governance?.risk_level || "").toUpperCase();

  if (!CASE_RISK_LEVELS.has(governedRisk)) return automaticRisk;

  return RISK_WEIGHT[governedRisk] >= RISK_WEIGHT[automaticRisk]
    ? governedRisk
    : automaticRisk;
}

export function getLastActivityAt(caseItem, interests, governance) {
  const timestamps = [
    caseItem?.updated_at,
    caseItem?.created_at,
    governance?.updated_at,
    governance?.last_client_notification_at,
    ...interests.map((item) => item.created_at),
  ]
    .map((value) => new Date(value || 0).getTime())
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

export function getOperationalAlert(stage, lastActivityAt, pendingInterests) {
  const lastActivity = new Date(lastActivityAt || 0).getTime();
  const ageHours = lastActivity
    ? Math.floor((Date.now() - lastActivity) / 3_600_000)
    : null;

  if (stage === "NEW" && ageHours !== null && ageHours >= 24) {
    return {
      severity: "HIGH",
      code: "NO_INTERESTS_24H",
      label: "Sem interesse há mais de 24h",
      recommendedAction: "Revisar distribuição e divulgação do caso.",
    };
  }

  if (
    stage === "WAITING_CLIENT" &&
    pendingInterests > 0 &&
    ageHours !== null &&
    ageHours >= 48
  ) {
    return {
      severity: "HIGH",
      code: "CLIENT_NOT_RESPONDING_48H",
      label: "Cliente sem resposta há mais de 48h",
      recommendedAction: "Reengajar o cliente com comunicação controlada.",
    };
  }

  if (stage === "NEGOTIATING" && ageHours !== null && ageHours >= 168) {
    return {
      severity: "MEDIUM",
      code: "NEGOTIATION_STALE_7D",
      label: "Negociação sem atividade há mais de 7 dias",
      recommendedAction: "Verificar se a negociação continua ativa.",
    };
  }

  if (stage === "ARCHIVED") {
    return {
      severity: "INFO",
      code: "ARCHIVED",
      label: "Caso arquivado",
      recommendedAction: "Revisar retenção e eventual eliminação formal.",
    };
  }

  return null;
}

export async function upsertGovernance(db, caseId, values) {
  const payload = {
    case_id: caseId,
    ...values,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await db
    .from("admin_case_governance")
    .upsert(payload, { onConflict: "case_id" })
    .select()
    .single();

  if (error) {
    if (isMissingGovernanceError(error)) {
      const migrationError = new Error(
        "O módulo de governança precisa da migração admin_case_governance.",
      );
      migrationError.code = "GOVERNANCE_MIGRATION_REQUIRED";
      throw migrationError;
    }
    throw new Error(`Falha ao atualizar governança: ${error.message}`);
  }

  return data;
}
