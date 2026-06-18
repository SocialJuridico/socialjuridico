import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { hasTrustedMutationOrigin } from "@/lib/publicAppOrigin";
import {
  generateEnvelopeCode,
  getSignatureProductRequestEvidence,
  requireSignatureProductAccess,
  loadSignatureEnvelope,
  signatureProductJson,
} from "@/lib/signatureProductServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "signature-documents";

function safePdfText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+$/gm, "");
}

function wrapText(text, maxChars) {
  const paragraphs = text.split(/\r?\n/);
  const allLines = [];

  for (const paragraph of paragraphs) {
    const cleanParagraph = paragraph.trim();
    if (!cleanParagraph) {
      allLines.push("");
      continue;
    }

    const words = cleanParagraph.split(/\s+/).filter(Boolean);
    let current = "";

    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxChars && current) {
        allLines.push(current);
        current = word;
      } else {
        current = next;
      }
    }

    if (current) allLines.push(current);
  }

  return allLines;
}

async function generatePdfFromText(text, title) {
  const pdfDoc = await PDFDocument.create();
  const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let page = pdfDoc.addPage([595.28, 841.89]);
  let y = 780;

  // Title header
  page.drawText(safePdfText(title).toUpperCase(), {
    x: 50,
    y,
    size: 13,
    font: titleFont,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 35;

  const lines = wrapText(safePdfText(text), 85);

  for (const line of lines) {
    if (y < 50) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 780;
    }

    if (line === "") {
      y -= 12; // Empty line spacing
      continue;
    }

    page.drawText(line, {
      x: 50,
      y,
      size: 9.5,
      font: line.startsWith("#") ? titleFont : bodyFont,
      color: rgb(0.15, 0.15, 0.15),
    });

    y -= 14;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function normalizeText(value, maxLength) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase().slice(0, 320);
}

function parseRecipients(value) {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
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

export async function POST(request) {
  if (!hasTrustedMutationOrigin(request, { allowMissingOrigin: false })) {
    return signatureProductJson({ success: false, message: "Origem não autorizada." }, 403);
  }

  let access;
  let envelopeId = null;
  let storagePath = null;

  try {
    access = await requireSignatureProductAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const title = normalizeText(body?.title, 180);
    const message = normalizeText(body?.message, 2000);
    const documentType = ["CONTRACT", "AGREEMENT", "AUTHORIZATION", "PROPOSAL", "OTHER"].includes(body?.documentType)
      ? body.documentType
      : "OTHER";
    const recipients = parseRecipients(body?.recipients);
    const text = String(body?.text || "").trim();

    if (title.length < 3) {
      return signatureProductJson({ success: false, message: "Informe um título para o documento." }, 400);
    }
    if (!recipients) {
      return signatureProductJson({ success: false, message: "Informe destinatários válidos e sem e-mails repetidos." }, 400);
    }
    if (text.length < 10) {
      return signatureProductJson({ success: false, message: "O texto do documento gerado deve ter pelo menos 10 caracteres." }, 400);
    }

    // Generate PDF from text
    const buffer = await generatePdfFromText(text, title);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const safeFileName = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.pdf`;

    const verificationCode = await generateEnvelopeCode(access.db);
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

    const created = await loadSignatureEnvelope(access.db, access.organizationId, envelopeId);
    return signatureProductJson({ success: true, data: created }, 201);
  } catch (error) {
    console.error("[Signature from-text envelope creation]", error);

    if (access?.db && storagePath) {
      try {
        await access.db.storage.from(BUCKET).remove([storagePath]);
      } catch {
        // Compensate deletion
      }
    }
    if (access?.db && envelopeId) {
      try {
        await access.db.from("signature_envelopes").delete().eq("id", envelopeId);
      } catch {
        // Log envelope trace remains audit-trailable
      }
    }

    return signatureProductJson({ success: false, message: "Não foi possível criar o rascunho a partir do texto." }, 500);
  }
}
