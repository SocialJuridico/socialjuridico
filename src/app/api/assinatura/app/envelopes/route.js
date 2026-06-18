import crypto from "node:crypto";

import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import {
  generateEnvelopeCode,
  getSignatureProductRequestEvidence,
  requireSignatureProductAccess,
  serializeSignatureEnvelope,
  signatureProductJson,
} from "@/lib/signatureProductServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "signature-documents";
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 128 * 1024;
const DOCUMENT_TYPES = new Set(["CONTRACT", "AGREEMENT", "AUTHORIZATION", "PROPOSAL", "OTHER"]);

function normalizeText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 320);
}

function parseRecipients(value) {
  let parsed;
  try {
    parsed = JSON.parse(String(value || "[]"));
  } catch {
    return null;
  }

  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 20) return null;

  const recipients = parsed.map((item, index) => ({
    name: normalizeText(item?.name, 140),
    email: normalizeEmail(item?.email),
    role: ["SIGNER", "APPROVER", "COPY"].includes(item?.role) ? item.role : "SIGNER",
    signing_order: index + 1,
  }));

  const valid = recipients.every(
    (recipient) =>
      recipient.name.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email),
  );

  const uniqueEmails = new Set(recipients.map((recipient) => recipient.email));
  return valid && uniqueEmails.size === recipients.length ? recipients : null;
}

async function listEnvelopes(access) {
  const { data, error } = await access.db
    .from("signature_envelopes")
    .select(
      "id, title, document_type, message, status, verification_code, expires_at, sent_at, completed_at, created_at, updated_at, signature_recipients(id, name, email, role, signing_order, status, completed_at), signature_documents(id, original_name, size_bytes, sha256)",
    )
    .eq("organization_id", access.organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data || []).map(serializeSignatureEnvelope);
}

export async function GET() {
  try {
    const access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    return signatureProductJson({ success: true, data: await listEnvelopes(access) });
  } catch (error) {
    console.error("[Signature product envelopes][GET]", error);
    const migrationMissing = ["42P01", "PGRST205"].includes(error?.code);
    return signatureProductJson(
      {
        success: false,
        code: migrationMissing ? "MIGRATION_REQUIRED" : "LIST_FAILED",
        message: migrationMissing
          ? "A estrutura de envelopes ainda precisa ser aplicada ao banco."
          : "Não foi possível carregar os documentos.",
      },
      migrationMissing ? 503 : 500,
    );
  }
}

export async function POST(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem não autorizada." }, 403);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return signatureProductJson({ success: false, message: "O arquivo excede 15 MB." }, 413);
  }

  let access;
  let envelopeId = null;
  let storagePath = null;

  try {
    access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    const formData = await request.formData();
    const title = normalizeText(formData.get("title"), 180);
    const message = normalizeText(formData.get("message"), 2000);
    const requestedType = String(formData.get("documentType") || "OTHER").toUpperCase();
    const documentType = DOCUMENT_TYPES.has(requestedType) ? requestedType : "OTHER";
    const recipients = parseRecipients(formData.get("recipients"));
    const file = formData.get("file");

    if (title.length < 3) {
      return signatureProductJson({ success: false, message: "Informe um título para o documento." }, 400);
    }
    if (!recipients) {
      return signatureProductJson({ success: false, message: "Informe destinatários válidos e sem e-mails repetidos." }, 400);
    }
    if (!(file instanceof File) || file.size < 5 || file.size > MAX_FILE_BYTES) {
      return signatureProductJson({ success: false, message: "Selecione um PDF de até 15 MB." }, 400);
    }

    const safeFileName = normalizeText(file.name, 180);
    if (!safeFileName.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
      return signatureProductJson({ success: false, message: "Somente arquivos PDF são aceitos." }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return signatureProductJson({ success: false, message: "O conteúdo enviado não é um PDF válido." }, 400);
    }

    const verificationCode = await generateEnvelopeCode(access.db);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const { data: envelope, error: envelopeError } = await access.db
      .from("signature_envelopes")
      .insert({
        organization_id: access.organizationId,
        created_by: access.user.id,
        title,
        document_type: documentType,
        message: message || null,
        status: "DRAFT",
        verification_code: verificationCode,
      })
      .select("id")
      .single();

    if (envelopeError) throw envelopeError;
    envelopeId = envelope.id;
    storagePath = `${access.organizationId}/drafts/${envelopeId}/${crypto.randomUUID()}.pdf`;

    const { error: uploadError } = await access.db.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: "application/pdf",
      cacheControl: "0",
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { error: documentError } = await access.db.from("signature_documents").insert({
      envelope_id: envelopeId,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      original_name: safeFileName,
      mime_type: "application/pdf",
      size_bytes: buffer.length,
      sha256,
    });
    if (documentError) throw documentError;

    const { error: recipientError } = await access.db.from("signature_recipients").insert(
      recipients.map((recipient) => ({ ...recipient, envelope_id: envelopeId })),
    );
    if (recipientError) throw recipientError;

    const evidence = getSignatureProductRequestEvidence(request);
    const { error: evidenceError } = await access.db.from("signature_evidence_events").insert([
      {
        organization_id: access.organizationId,
        envelope_id: envelopeId,
        actor_user_id: access.user.id,
        event_type: "DRAFT_CREATED",
        ip_hash: evidence.ipHash,
        user_agent: evidence.userAgent,
        payload: { title, document_type: documentType, recipients: recipients.length },
      },
      {
        organization_id: access.organizationId,
        envelope_id: envelopeId,
        actor_user_id: access.user.id,
        event_type: "DOCUMENT_UPLOADED",
        ip_hash: evidence.ipHash,
        user_agent: evidence.userAgent,
        payload: { file_name: safeFileName, size_bytes: buffer.length, sha256 },
      },
    ]);
    if (evidenceError) throw evidenceError;

    const items = await listEnvelopes(access);
    const created = items.find((item) => item.id === envelopeId);
    return signatureProductJson({ success: true, data: created }, 201);
  } catch (error) {
    console.error("[Signature product envelopes][POST]", error);

    if (access?.db && storagePath) {
      try {
        await access.db.storage.from(BUCKET).remove([storagePath]);
      } catch {
        // A limpeza do upload e apenas compensatoria.
      }
    }
    if (access?.db && envelopeId) {
      try {
        await access.db.from("signature_envelopes").delete().eq("id", envelopeId);
      } catch {
        // O envelope incompleto permanece auditavel para correcao manual.
      }
    }

    return signatureProductJson(
      { success: false, message: "Não foi possível salvar o rascunho." },
      500,
    );
  }
}

export async function DELETE(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem não autorizada." }, 403);
  }

  try {
    const access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    const id = new URL(request.url).searchParams.get("id");
    if (!/^[0-9a-f-]{36}$/i.test(String(id || ""))) {
      return signatureProductJson({ success: false, message: "Rascunho inválido." }, 400);
    }

    const { data: envelope, error } = await access.db
      .from("signature_envelopes")
      .select("id, status, signature_documents(storage_path)")
      .eq("id", id)
      .eq("organization_id", access.organizationId)
      .maybeSingle();
    if (error) throw error;
    if (!envelope) return signatureProductJson({ success: false, message: "Rascunho não encontrado." }, 404);
    if (envelope.status !== "DRAFT") {
      return signatureProductJson({ success: false, message: "Apenas rascunhos podem ser excluídos." }, 409);
    }

    const paths = (envelope.signature_documents || []).map((item) => item.storage_path).filter(Boolean);
    const { error: deleteError } = await access.db
      .from("signature_envelopes")
      .delete()
      .eq("id", id)
      .eq("organization_id", access.organizationId);
    if (deleteError) throw deleteError;

    if (paths.length) {
      const { error: storageError } = await access.db.storage.from(BUCKET).remove(paths);
      if (storageError) {
        console.warn(
          "[Signature product envelopes][DELETE] Arquivo órfão:",
          storageError.message,
        );
      }
    }

    return signatureProductJson({ success: true });
  } catch (error) {
    console.error("[Signature product envelopes][DELETE]", error);
    return signatureProductJson({ success: false, message: "Não foi possível excluir o rascunho." }, 500);
  }
}
