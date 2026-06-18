import crypto from "node:crypto";

import { NextResponse } from "next/server";

import { createSignatureClient } from "@/lib/signatureSupabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function signatureProductJson(payload, status = 200, headers = {}) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      ...headers,
    },
  });
}

export async function requireSignatureProductAccess() {
  const supabase = createSignatureClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authError || !user || !supabaseAdmin) {
    return {
      ok: false,
      response: signatureProductJson({ success: false, message: "Não autorizado." }, 401),
    };
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from("signature_accounts")
    .select("user_id, full_name, email, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!account || account.status !== "ACTIVE") {
    return {
      ok: false,
      response: signatureProductJson(
        { success: false, message: "Conta de assinatura não encontrada ou inativa." },
        403,
      ),
    };
  }

  const { data: membership, error: membershipError } = await supabaseAdmin
    .from("signature_organization_members")
    .select("organization_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) {
    return {
      ok: false,
      response: signatureProductJson({ success: false, message: "Organização não encontrada." }, 403),
    };
  }

  return {
    ok: true,
    db: supabaseAdmin,
    user,
    account,
    membership,
    organizationId: membership.organization_id,
  };
}

export async function generateEnvelopeCode(db) {
  const part = () =>
    Array.from({ length: 4 }, () => CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)]).join("");

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `SJA-${part()}-${part()}`;
    const { count, error } = await db
      .from("signature_envelopes")
      .select("id", { count: "exact", head: true })
      .eq("verification_code", code);
    if (error) throw error;
    if (!count) return code;
  }

  throw new Error("Não foi possível gerar o código do envelope.");
}

export function getSignatureProductRequestEvidence(request) {
  const rawIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  const secret = process.env.SIGNATURE_AUDIT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "local";

  return {
    ipHash: crypto.createHmac("sha256", secret).update(rawIp).digest("hex"),
    userAgent: String(request.headers.get("user-agent") || "").slice(0, 500),
  };
}

export function serializeSignatureEnvelope(envelope) {
  const recipients = envelope.signature_recipients || envelope.recipients || [];
  const documents = envelope.signature_documents || envelope.documents || [];

  return {
    id: envelope.id,
    title: envelope.title,
    documentType: envelope.document_type,
    message: envelope.message || "",
    status: envelope.status,
    verificationCode: envelope.verification_code,
    expiresAt: envelope.expires_at,
    sentAt: envelope.sent_at,
    completedAt: envelope.completed_at,
    createdAt: envelope.created_at,
    updatedAt: envelope.updated_at,
    recipients: recipients.map((recipient) => ({
      id: recipient.id,
      name: recipient.name,
      email: recipient.email,
      role: recipient.role,
      order: recipient.signing_order,
      status: recipient.status,
      completedAt: recipient.completed_at,
    })),
    documents: documents.map((document) => ({
      id: document.id,
      kind: document.document_kind || "ORIGINAL",
      name: document.original_name,
      size: Number(document.size_bytes || 0),
      sha256: document.sha256,
    })),
  };
}

export async function loadSignatureEnvelope(db, organizationId, envelopeId) {
  const { data, error } = await db
    .from("signature_envelopes")
    .select(
      "id, title, document_type, message, status, verification_code, expires_at, sent_at, completed_at, created_at, updated_at, signature_recipients(id, name, email, role, signing_order, status, completed_at), signature_documents(id, document_kind, original_name, size_bytes, sha256)",
    )
    .eq("organization_id", organizationId)
    .eq("id", envelopeId)
    .maybeSingle();
  if (error) throw error;
  return data ? serializeSignatureEnvelope(data) : null;
}
