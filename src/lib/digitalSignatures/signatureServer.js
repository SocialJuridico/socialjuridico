import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/authServerUtils";
import {
  DEFAULT_PUBLIC_APP_ORIGIN,
  hasTrustedMutationOrigin,
  resolveStaticPublicAppOrigin,
} from "@/lib/publicAppOrigin";
import { resend } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase";
import {
  getRequestIpHash,
  getRequestUserAgent,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";

import {
  isValidSignatureUuid,
  normalizeSignatureRole,
  normalizeSignatureText,
  parseSignatureMetadata,
  sanitizeSignatureMetadata,
} from "./signatureValidation";

const VERIFICATION_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const AUDIT_TABLE = "digital_signature_audit_logs";
const STORAGE_BUCKET = "crm_documents";

export function signatureJson(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

export function hasValidSignatureMutationOrigin(request) {
  return hasTrustedMutationOrigin(request);
}

function readPermissions(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export async function requireDigitalSignatureAccess(request, options = {}) {
  const user = await getAuthenticatedUser(request);
  if (!user || !supabaseAdmin) {
    return {
      ok: false,
      response: signatureJson(
        { success: false, message: "Não autorizado." },
        401,
      ),
    };
  }

  const { data: profile, error } = await supabaseAdmin
    .from("advogados")
    .select(
      "id, name, role, cargo, permissoes, is_premium, plan_type, escritorio_id, oab_verification_status",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!profile) {
    return {
      ok: false,
      response: signatureJson(
        { success: false, message: "Acesso exclusivo para advogados." },
        403,
      ),
    };
  }

  if (profile.oab_verification_status === "ERROR") {
    return {
      ok: false,
      response: signatureJson(
        {
          success: false,
          blocked: true,
          message: "Acesso suspenso por inconsistências na verificação da OAB.",
        },
        403,
      ),
    };
  }

  const planType = String(profile.plan_type || "FREE").toUpperCase();
  const hasPremium =
    profile.is_premium === true || planType === "START" || planType === "PRO";
  if (options.requirePremium !== false && !hasPremium) {
    return {
      ok: false,
      response: signatureJson(
        {
          success: false,
          upgradeRequired: true,
          message: "A assinatura digital está disponível nos planos START e PRO.",
        },
        403,
      ),
    };
  }

  const permissions = readPermissions(profile.permissoes);
  if (
    profile.cargo === "estagiario" &&
    !Boolean(permissions.ferr_assinatura)
  ) {
    return {
      ok: false,
      response: signatureJson(
        {
          success: false,
          permissionDenied: true,
          message: "A assinatura digital foi bloqueada pelo gestor do escritório.",
        },
        403,
      ),
    };
  }

  let lawyerIds = [profile.id];
  if (profile.escritorio_id) {
    const { data: members, error: membersError } = await supabaseAdmin
      .from("advogados")
      .select("id")
      .eq("escritorio_id", profile.escritorio_id);
    if (membersError) throw membersError;
    lawyerIds = [...new Set((members || []).map((member) => member.id).filter(Boolean))];
    if (!lawyerIds.includes(profile.id)) lawyerIds.push(profile.id);
  }

  return {
    ok: true,
    db: supabaseAdmin,
    user,
    profile: { ...profile, email: user.email || "" },
    lawyerIds,
    planType,
    hasPremium,
  };
}

export function applySignatureScope(query, lawyerIds) {
  if (lawyerIds.length === 1) return query.eq("lawyer_id", lawyerIds[0]);
  return query.in("lawyer_id", lawyerIds);
}

export async function getScopedSignature(access, signatureId, fields = "*") {
  if (!isValidSignatureUuid(signatureId)) return null;
  let query = access.db
    .from("assinaturas_digitais")
    .select(fields)
    .eq("id", signatureId);
  query = applySignatureScope(query, access.lawyerIds);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data || null;
}

export function generateSignatureVerificationCode() {
  const part = () =>
    Array.from({ length: 4 }, () =>
      VERIFICATION_CHARS.charAt(crypto.randomInt(0, VERIFICATION_CHARS.length)),
    ).join("");
  return `SJ-${part()}-${part()}`;
}

export function signatureOtpHash(signatureId, role, otp) {
  const secret =
    process.env.SIGNATURE_OTP_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Segredo de OTP da assinatura digital não configurado.");
  }
  return crypto
    .createHmac("sha256", secret)
    .update(`${signatureId}:${role}:${otp}`)
    .digest("hex");
}

export function verifySignatureOtp(signatureId, role, otp, party = {}) {
  const supplied = normalizeSignatureText(otp, 6);
  if (!/^\d{6}$/.test(supplied)) return false;

  if (party.otp_hash) {
    const expected = Buffer.from(String(party.otp_hash), "hex");
    const received = Buffer.from(signatureOtpHash(signatureId, role, supplied), "hex");
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  }

  return typeof party.otp === "string" && party.otp === supplied;
}

export function trustedSignatureSiteUrl() {
  const production = String(process.env.NODE_ENV || "").toLowerCase() === "production";
  if (production) {
    return resolveStaticPublicAppOrigin({
      ...process.env,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.SITE_URL,
    });
  }

  for (const value of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SITE_URL,
  ]) {
    if (!value) continue;
    try {
      return new URL(value).origin;
    } catch {
      // Tenta a próxima configuração.
    }
  }
  return DEFAULT_PUBLIC_APP_ORIGIN;
}

export function signatureStoragePrefix(lawyerId) {
  return `signatures/originals/${lawyerId}/`;
}

export function isOwnedSignatureUploadPath(path, lawyerId) {
  const normalized = normalizeSignatureText(path, 500);
  return (
    normalized.startsWith(signatureStoragePrefix(lawyerId)) &&
    normalized.toLowerCase().endsWith(".pdf") &&
    !normalized.includes("..")
  );
}

export async function readSignatureStorageFile(path) {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .download(path);
  if (error || !data) throw error || new Error("Arquivo enviado não encontrado.");
  return Buffer.from(await data.arrayBuffer());
}

export function getSignaturePublicStorageUrl(path) {
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function serializeDashboardSignature(item) {
  return {
    id: item.id,
    document_name: item.document_name,
    document_type: item.document_type,
    verification_code: item.verification_code,
    status: item.status,
    original_hash: item.original_hash || null,
    signed_hash: item.signed_hash || null,
    metadata: sanitizeSignatureMetadata(item.metadata),
    created_at: item.created_at,
    updated_at: item.updated_at || item.created_at,
    download_url:
      item.status === "signed"
        ? `/api/advogado/assinaturas/${item.id}/arquivo`
        : null,
  };
}

export function serializePublicSigningSignature(item, role) {
  const normalizedRole = normalizeSignatureRole(role);
  const metadata = sanitizeSignatureMetadata(item.metadata, { maskSensitive: true });
  const currentParty = normalizedRole ? metadata[normalizedRole] : null;

  return {
    id: item.id,
    document_name: item.document_name,
    document_type: item.document_type,
    verification_code: item.verification_code,
    status: item.status,
    created_at: item.created_at,
    metadata: normalizedRole ? { [normalizedRole]: currentParty } : {},
    document_url: `/api/crm/assinatura/proxy-pdf?id=${item.id}`,
  };
}

export function serializePublicValidationSignature(item) {
  return {
    id: item.id,
    document_name: item.document_name,
    document_type: item.document_type,
    verification_code: item.verification_code,
    status: item.status,
    original_hash: item.original_hash || null,
    signed_hash: item.signed_hash || null,
    metadata: sanitizeSignatureMetadata(item.metadata, { maskSensitive: true }),
    created_at: item.created_at,
    document_url:
      item.status === "signed"
        ? `/api/crm/assinatura/proxy-pdf?id=${item.id}`
        : null,
  };
}

export async function recordSignatureAudit(
  access,
  request,
  { requestId, signatureId = null, action, metadata = {} },
) {
  try {
    const { error } = await access.db.from(AUDIT_TABLE).insert([
      {
        request_id: isValidSignatureUuid(requestId) ? requestId : crypto.randomUUID(),
        signature_id: signatureId,
        lawyer_id: access.user.id,
        action,
        metadata,
        ip_hash: getRequestIpHash(request),
        user_agent: getRequestUserAgent(request),
        created_at: new Date().toISOString(),
      },
    ]);
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    if (["42P01", "PGRST205"].includes(error?.code)) {
      console.warn("[Assinatura/Auditoria] Migration ainda não aplicada.");
      return;
    }
    throw error;
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return map[char];
  });
}

export async function sendSignatureInvitation({ signature, role }) {
  const normalizedRole = normalizeSignatureRole(role);
  const metadata = parseSignatureMetadata(signature.metadata);
  const party = normalizedRole ? metadata[normalizedRole] : null;
  if (!party?.email) throw new Error("E-mail do signatário não encontrado.");
  if (party.signed) throw new Error("Este signatário já concluiu a assinatura.");

  const signLink = `${trustedSignatureSiteUrl()}/assinatura/${signature.id}?role=${normalizedRole}`;
  const safeName = escapeHtml(party.name);
  const safeDocument = escapeHtml(signature.document_name);
  const safeLink = escapeHtml(signLink);

  await resend.emails.send({
    from: "Social Jurídico <contato@socialjuridico.com.br>",
    to: party.email,
    subject: `[Social Jurídico] Assinatura eletrônica pendente: ${signature.document_name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px;color:#1f2937;border:1px solid #eadcbf;border-radius:16px;background:#fff">
        <h1 style="margin:0 0 22px;color:#9a722c;font-size:24px">Social Jurídico</h1>
        <p>Olá, <strong>${safeName}</strong>.</p>
        <p>Você recebeu uma solicitação para revisar e assinar eletronicamente o documento <strong>${safeDocument}</strong>.</p>
        <p style="margin:28px 0;text-align:center"><a href="${safeLink}" style="display:inline-block;padding:14px 24px;border-radius:9px;background:#b58a3b;color:#fff;text-decoration:none;font-weight:700">Revisar e assinar documento</a></p>
        <p style="font-size:13px;color:#6b7280">Na página segura, um código temporário será enviado ao e-mail deste destinatário para confirmar a manifestação de vontade.</p>
        <p style="font-size:12px;color:#9ca3af;word-break:break-all">${safeLink}</p>
      </div>
    `,
  });

  return signLink;
}

export function signatureServerFailure(error, fallback) {
  if (["42703", "42P01", "PGRST204", "PGRST205"].includes(error?.code)) {
    return {
      status: 503,
      message: "A migration da assinatura digital precisa ser aplicada antes de continuar.",
    };
  }
  if (error?.code === "23505") {
    return { status: 409, message: "Esta operação já foi registrada." };
  }
  const status = Number(error?.status || 500);
  return {
    status,
    message: status >= 500 ? fallback : error?.message || fallback,
  };
}

export async function recordPublicSignatureAudit(
  request,
  signature,
  action,
  metadata = {},
) {
  if (!signature?.lawyer_id) return;
  try {
    const { error } = await supabaseAdmin.from(AUDIT_TABLE).insert([
      {
        request_id: crypto.randomUUID(),
        signature_id: signature.id,
        lawyer_id: signature.lawyer_id,
        action,
        metadata,
        ip_hash: getRequestIpHash(request),
        user_agent: getRequestUserAgent(request),
        created_at: new Date().toISOString(),
      },
    ]);
    if (error && error.code !== "23505") throw error;
  } catch (error) {
    if (!["42P01", "PGRST205"].includes(error?.code)) throw error;
  }
}

export async function sendSignatureOtp({ signature, role, otpCode }) {
  const normalizedRole = normalizeSignatureRole(role);
  const metadata = parseSignatureMetadata(signature.metadata);
  const party = normalizedRole ? metadata[normalizedRole] : null;
  if (!party?.email) throw new Error("E-mail do signatário não encontrado.");

  const safeName = escapeHtml(party.name);
  const safeDocument = escapeHtml(signature.document_name);
  const safeOtp = escapeHtml(otpCode);

  await resend.emails.send({
    from: "Social Jurídico <contato@socialjuridico.com.br>",
    to: party.email,
    subject: `[Social Jurídico] Código de assinatura: ${otpCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:32px;color:#1f2937;border:1px solid #eadcbf;border-radius:16px;background:#fff">
        <h1 style="margin:0 0 22px;color:#9a722c;font-size:24px">Social Jurídico</h1>
        <p>Olá, <strong>${safeName}</strong>.</p>
        <p>Use o código abaixo para confirmar a assinatura eletrônica do documento <strong>${safeDocument}</strong>.</p>
        <div style="margin:28px 0;padding:24px;text-align:center;border-radius:12px;background:#fbf7ef;border:1px solid #eadcbf">
          <div style="font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#7c6840">Código temporário</div>
          <div style="margin-top:10px;font-family:monospace;font-size:42px;letter-spacing:7px;font-weight:800;color:#a77b2d">${safeOtp}</div>
          <div style="margin-top:10px;font-size:13px;color:#6b7280">Válido por 10 minutos e para uma única utilização.</div>
        </div>
        <p style="font-size:13px;color:#6b7280">Não compartilhe este código. O Social Jurídico nunca solicitará o código por telefone ou mensagem.</p>
      </div>
    `,
  });
}
