import { createHmac } from "node:crypto";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export const CONFIRMED_TRANSACTION_STATUSES = [
  "succeeded",
  "paid",
  "complete",
  "completed",
];

export function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function requireAffiliateAdmin() {
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
        { success: false, message: "Serviço de afiliados indisponível." },
        503,
      ),
    };
  }

  return { ok: true, auth, db: supabaseAdmin };
}

export function validateMutationOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  try {
    if (!host || new URL(origin).host !== host) {
      return json(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
  } catch {
    return json(
      { success: false, message: "Origem da requisição inválida." },
      403,
    );
  }

  return null;
}

export function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || ""),
  );
}

export function normalizeText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

export function normalizeEmail(value) {
  return normalizeText(value, 254).toLowerCase();
}

export function maskEmail(value) {
  const email = normalizeEmail(value);
  const [local, domain] = email.split("@");

  if (!local || !domain) return "Não informado";

  const visibleLocal = local.slice(0, Math.min(2, local.length));
  const domainParts = domain.split(".");
  const domainName = domainParts.shift() || "";
  const suffix = domainParts.length ? `.${domainParts.join(".")}` : "";

  return `${visibleLocal}${"*".repeat(
    Math.max(3, local.length - visibleLocal.length),
  )}@${domainName.slice(0, 1)}${"*".repeat(
    Math.max(3, domainName.length - 1),
  )}${suffix}`;
}

export function inferPaymentProvider(reference) {
  const value = String(reference || "").toLowerCase();

  if (value.startsWith("cs_")) return "STRIPE_CHECKOUT";
  if (value.startsWith("pi_")) return "STRIPE_PAYMENT_INTENT";
  if (
    value.startsWith("sj_") ||
    value.startsWith("inf_") ||
    value.startsWith("ip_") ||
    value.startsWith("infinitepay_")
  ) {
    return "INFINITEPAY";
  }
  if (value.startsWith("manual_")) return "MANUAL";
  return "UNKNOWN";
}

export function isGovernanceMigrationMissing(error) {
  const message = String(error?.message || "").toLowerCase();

  return (
    error?.code === "42703" ||
    error?.code === "42P01" ||
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    message.includes("indicado_advogado_id") ||
    message.includes("qualifying_transaction_id") ||
    message.includes("admin_affiliate_audit_logs") ||
    message.includes("credit_affiliate_commission")
  );
}

function hashIp(request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const secret =
    process.env.ADMIN_AUDIT_HASH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "local-audit-secret";

  return createHmac("sha256", secret).update(ip).digest("hex");
}

export async function recordAffiliateAudit(db, request, event) {
  const { error } = await db.from("admin_affiliate_audit_logs").insert([
    {
      id: crypto.randomUUID(),
      admin_id: event.adminId,
      referral_id: event.referralId || null,
      action: event.action,
      purpose: event.purpose,
      justification: event.justification || null,
      metadata: event.metadata || {},
      ip_hash: hashIp(request),
      user_agent: normalizeText(request.headers.get("user-agent"), 500),
      created_at: new Date().toISOString(),
    },
  ]);

  if (!error) return true;

  if (!isGovernanceMigrationMissing(error)) {
    console.error("[Admin/Afiliados] Falha na auditoria:", error);
  }

  return false;
}
