import crypto from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase";

export const SOC2_AUDIT_RETENTION_DAYS = 90;

const HASH_PEPPER =
  process.env.SOC2_AUDIT_HASH_PEPPER ||
  process.env.LGPD_HASH_PEPPER ||
  "social-juridico-audit";

function normalizeString(value, maxLength = 512) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function hashAuditValue(value, namespace = "audit") {
  const normalized = normalizeString(value, 2048);
  if (!normalized) return null;
  return sha256(`${namespace}:${HASH_PEPPER}:${normalized.toLowerCase()}`);
}

export function getAuditRequestContext(request) {
  const forwardedFor = request?.headers?.get("x-forwarded-for");
  const ip =
    forwardedFor?.split(",")[0]?.trim() ||
    request?.headers?.get("x-real-ip") ||
    request?.headers?.get("cf-connecting-ip") ||
    null;

  return {
    requestIpHash: hashAuditValue(ip, "ip"),
    userAgent: normalizeString(request?.headers?.get("user-agent"), 512),
  };
}

function buildEventHash(payload) {
  const stablePayload = {
    event_type: payload.event_type,
    actor_id: payload.actor_id,
    target_user_id: payload.target_user_id,
    outcome: payload.outcome,
    status_code: payload.status_code,
    metadata: payload.metadata,
    created_at: payload.created_at,
  };

  return sha256(JSON.stringify(stablePayload));
}

export async function recordSecurityAuditEvent({
  db = supabaseAdmin,
  eventType,
  actorId = null,
  actorType = null,
  actorEmail = null,
  targetUserId = null,
  targetType = null,
  targetEmail = null,
  request = null,
  outcome = "SUCCESS",
  statusCode = null,
  metadata = {},
  required = false,
} = {}) {
  if (!db) {
    const error = new Error("Security audit database client is not available.");
    if (required) throw error;
    console.error("[SecurityAudit] skipped:", error.message);
    return { success: false, error };
  }

  const normalizedEventType = normalizeString(eventType, 120);
  if (!normalizedEventType) {
    const error = new Error("Security audit eventType is required.");
    if (required) throw error;
    console.error("[SecurityAudit] skipped:", error.message);
    return { success: false, error };
  }

  const context = getAuditRequestContext(request);
  const createdAt = new Date().toISOString();
  const payload = {
    event_type: normalizedEventType,
    actor_id: actorId || null,
    actor_type: normalizeString(actorType, 64),
    actor_email_hash: hashAuditValue(actorEmail, "email"),
    target_user_id: targetUserId || null,
    target_type: normalizeString(targetType, 64),
    target_email_hash: hashAuditValue(targetEmail, "email"),
    request_ip_hash: context.requestIpHash,
    user_agent: context.userAgent,
    outcome: normalizeString(outcome, 32) || "SUCCESS",
    status_code: Number.isInteger(statusCode) ? statusCode : null,
    metadata: metadata && typeof metadata === "object" ? metadata : {},
    retention_until: new Date(
      Date.now() + SOC2_AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at: createdAt,
  };

  payload.event_hash = buildEventHash(payload);

  const { error } = await db.from("security_audit_events").insert(payload);
  if (error) {
    if (required) throw error;
    console.error("[SecurityAudit] insert failed:", error.message);
    return { success: false, error };
  }

  return { success: true };
}
