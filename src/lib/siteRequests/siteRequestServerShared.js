import crypto from "node:crypto";

import {
  getRequestIpHash,
  getRequestUserAgent,
} from "../lawyerOpportunities/opportunityServerUtils";
import { messageJson, requireMessageUser } from "../messages/messageServer";
import {
  buildSiteSalesWhatsAppUrl,
  serializeSiteProject,
} from "./siteRequestValidation";

export const MAX_REQUESTS_PER_DAY = 3;
export const SALES_WHATSAPP =
  process.env.SITE_SALES_WHATSAPP ||
  process.env.NEXT_PUBLIC_SITE_SALES_WHATSAPP ||
  "5551993392983";

export function siteRequestPayloadHash(payload) {
  const canonical = JSON.stringify({
    projectType: payload.projectType,
    officeName: payload.officeName,
    objective: payload.objective,
    desiredFeatures: [...payload.desiredFeatures].sort(),
    domainStatus: payload.domainStatus,
    currentDomain: payload.currentDomain,
    deadline: payload.deadline,
    budgetRange: payload.budgetRange,
    preferredContact: payload.preferredContact,
    contactPhone: payload.contactPhone,
    contactEmail: payload.contactEmail,
    notes: payload.notes,
  });

  return crypto.createHash("sha256").update(canonical).digest("hex");
}

export function serializeSiteRequest(item) {
  return {
    id: item.id,
    project: serializeSiteProject(item.project_type),
    officeName: item.office_name,
    objective: item.objective,
    deadline: item.deadline,
    budgetRange: item.budget_range,
    preferredContact: item.preferred_contact,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function requireLawyerSiteRequestUser(request) {
  return requireMessageUser(request, { lawyerOnly: true });
}

export function siteRequestFailure(error, fallback) {
  if (["PGRST202", "PGRST205", "42883", "42P01"].includes(error?.code)) {
    return {
      status: 503,
      message: "Execute as migrations de solicitações de site antes de continuar.",
    };
  }

  if (error?.code === "P0001") {
    return {
      status: 409,
      message: "Esta solicitação já foi utilizada com outros dados.",
    };
  }

  if (error?.code === "P0002") {
    return {
      status: 429,
      message:
        "Você atingiu o limite de solicitações nas últimas 24 horas. Aguarde o contato comercial ou tente novamente mais tarde.",
    };
  }

  return {
    status: Number(error?.status || 500),
    message: error?.message || fallback,
  };
}

function auditConflict() {
  const error = new Error(
    "Chave de idempotência já utilizada em outra solicitação.",
  );
  error.status = 409;
  return error;
}

async function findAudit(access, requestId, action) {
  const { data, error } = await access.db
    .from("lawyer_site_request_audit_logs")
    .select("site_request_id, action")
    .eq("lawyer_id", access.user.id)
    .eq("request_id", requestId)
    .eq("action", action)
    .maybeSingle();

  if (error) throw error;
  return data;
}

function validateAudit(existing, siteRequestId, action) {
  if (!existing) return false;
  if (
    existing.action !== action ||
    String(existing.site_request_id) !== String(siteRequestId)
  ) {
    throw auditConflict();
  }
  return true;
}

export async function recordSiteRequestAudit(
  access,
  request,
  { requestId, siteRequestId, action, metadata = {} },
) {
  const existing = await findAudit(access, requestId, action);
  if (validateAudit(existing, siteRequestId, action)) return true;

  const { error } = await access.db
    .from("lawyer_site_request_audit_logs")
    .insert([
      {
        request_id: requestId,
        site_request_id: siteRequestId,
        lawyer_id: access.user.id,
        action,
        metadata,
        ip_hash: getRequestIpHash(request),
        user_agent: getRequestUserAgent(request),
        created_at: new Date().toISOString(),
      },
    ]);

  if (!error) return false;
  if (error.code !== "23505") throw error;

  const racedAudit = await findAudit(access, requestId, action);
  validateAudit(racedAudit, siteRequestId, action);
  return true;
}

export function siteRequestContactAvailable(item) {
  return Boolean(buildSiteSalesWhatsAppUrl(SALES_WHATSAPP, item));
}

export function siteRequestJson(payload, status = 200) {
  return messageJson(payload, status);
}
