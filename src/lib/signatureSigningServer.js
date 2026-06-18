import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const BUCKET = "signature-documents";
const MAX_FINAL_FILE_BYTES = 20 * 1024 * 1024;

function signingSecret() {
  return process.env.SIGNATURE_TOKEN_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "local-signature-secret";
}

export function generateSignatureAccessToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function normalizeSignatureAccessToken(value) {
  const token = String(value || "").trim();
  return /^[A-Za-z0-9_-]{40,100}$/.test(token) ? token : "";
}

export function hashSignatureAccessToken(value) {
  return crypto.createHmac("sha256", signingSecret()).update(String(value || "")).digest("hex");
}

export function generateSignatureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashSignatureOtp(recipientId, code) {
  return crypto
    .createHmac("sha256", signingSecret())
    .update(`${recipientId}:${String(code || "")}`)
    .digest("hex");
}

export function verifySignatureOtpHash(recipientId, code, expectedHash) {
  const supplied = Buffer.from(hashSignatureOtp(recipientId, code), "hex");
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  return supplied.length === expected.length && supplied.length > 0 && crypto.timingSafeEqual(supplied, expected);
}

export async function loadPublicSignatureContext(db, rawToken) {
  const token = normalizeSignatureAccessToken(rawToken);
  if (!token) return null;
  const tokenHash = hashSignatureAccessToken(token);

  const { data: recipient, error: recipientError } = await db
    .from("signature_recipients")
    .select(
      "id, envelope_id, name, email, role, signing_order, status, invited_at, viewed_at, completed_at, identity_confirmed_at, access_token_hash",
    )
    .eq("access_token_hash", tokenHash)
    .maybeSingle();
  if (recipientError) throw recipientError;
  if (!recipient) return null;

  const { data: envelope, error: envelopeError } = await db
    .from("signature_envelopes")
    .select(
      "id, organization_id, created_by, title, document_type, message, status, verification_code, expires_at, sent_at, completed_at, created_at",
    )
    .eq("id", recipient.envelope_id)
    .maybeSingle();
  if (envelopeError) throw envelopeError;
  if (!envelope) return null;

  const [{ data: organization, error: organizationError }, { data: documents, error: documentError }] =
    await Promise.all([
      db
        .from("signature_organizations")
        .select("id, name")
        .eq("id", envelope.organization_id)
        .maybeSingle(),
      db
        .from("signature_documents")
        .select("id, document_kind, storage_bucket, storage_path, original_name, size_bytes, sha256, created_at")
        .eq("envelope_id", envelope.id)
        .order("created_at", { ascending: true }),
    ]);
  if (organizationError) throw organizationError;
  if (documentError) throw documentError;

  return {
    token,
    tokenHash,
    recipient,
    envelope,
    organization,
    documents: documents || [],
  };
}

export function serializePublicSignatureContext(context) {
  const original = context.documents.find((document) => document.document_kind === "ORIGINAL");
  const final = context.documents.find((document) => document.document_kind === "FINAL");
  const expiresAt = context.envelope.expires_at;
  const expired = Boolean(expiresAt && Date.now() > Date.parse(expiresAt));

  return {
    recipient: {
      name: context.recipient.name,
      emailMasked: maskEmail(context.recipient.email),
      role: context.recipient.role,
      status: context.recipient.status,
      viewedAt: context.recipient.viewed_at,
      completedAt: context.recipient.completed_at,
    },
    envelope: {
      title: context.envelope.title,
      documentType: context.envelope.document_type,
      message: context.envelope.message || "",
      status: context.envelope.status,
      verificationCode: context.envelope.verification_code,
      expiresAt,
      sentAt: context.envelope.sent_at,
      completedAt: context.envelope.completed_at,
      expired,
    },
    organization: { name: context.organization?.name || "Organização" },
    document: original
      ? { name: original.original_name, size: Number(original.size_bytes || 0), sha256: original.sha256 }
      : null,
    finalAvailable: Boolean(final),
  };
}

export async function markPublicSignatureViewed(db, context, evidence) {
  const firstView = !context.recipient.viewed_at;
  if (["INVITED", "PENDING"].includes(context.recipient.status)) {
    const { error } = await db
      .from("signature_recipients")
      .update({ status: "VIEWED", viewed_at: new Date().toISOString() })
      .eq("id", context.recipient.id)
      .in("status", ["INVITED", "PENDING"]);
    if (error) throw error;
  } else if (!context.recipient.viewed_at) {
    await db
      .from("signature_recipients")
      .update({ viewed_at: new Date().toISOString() })
      .eq("id", context.recipient.id);
  }

  if (!firstView) return;

  await db.from("signature_evidence_events").insert({
    organization_id: context.envelope.organization_id,
    envelope_id: context.envelope.id,
    recipient_id: context.recipient.id,
    event_type: "DOCUMENT_VIEWED",
    ip_hash: evidence.ipHash,
    user_agent: evidence.userAgent,
    payload: { role: context.recipient.role },
  });
}

function maskEmail(value) {
  const [local = "", domain = ""] = String(value || "").split("@");
  if (!domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

function pdfSafeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrapText(text, font, size, maxWidth) {
  const words = pdfSafeText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function ensureFinalSignatureDocument(db, envelopeId) {
  const { data: existing, error: existingError } = await db
    .from("signature_documents")
    .select("id, storage_bucket, storage_path, original_name, size_bytes, sha256, document_kind")
    .eq("envelope_id", envelopeId)
    .eq("document_kind", "FINAL")
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing;

  const { data: envelope, error: envelopeError } = await db
    .from("signature_envelopes")
    .select("id, organization_id, title, status, verification_code, sent_at, completed_at")
    .eq("id", envelopeId)
    .eq("status", "COMPLETED")
    .maybeSingle();
  if (envelopeError) throw envelopeError;
  if (!envelope) throw new Error("Envelope concluído não encontrado.");

  // Get current document to append certificate to (either IN_PROGRESS, or original)
  const { data: documents, error: docError } = await db
    .from("signature_documents")
    .select("id, document_kind, storage_bucket, storage_path, original_name, size_bytes, sha256")
    .eq("envelope_id", envelopeId)
    .in("document_kind", ["ORIGINAL", "IN_PROGRESS"])
    .order("created_at", { ascending: false });
  if (docError) throw docError;

  const currentDoc = documents.find(d => d.document_kind === "IN_PROGRESS") || documents.find(d => d.document_kind === "ORIGINAL");
  if (!currentDoc) throw new Error("Documento base não encontrado.");

  const { data: source, error: downloadError } = await db.storage
    .from(currentDoc.storage_bucket || BUCKET)
    .download(currentDoc.storage_path);
  if (downloadError) throw downloadError;

  const sourceBuffer = Buffer.from(await source.arrayBuffer());
  const pdfDoc = await PDFDocument.load(sourceBuffer, { ignoreEncryption: false, updateMetadata: false });

  // Generate certificate
  const certBuffer = await generateCertificatePdf(db, envelopeId);
  const certDoc = await PDFDocument.load(certBuffer);
  const copiedPages = await pdfDoc.copyPages(certDoc, certDoc.getPageIndices());
  for (const page of copiedPages) {
    pdfDoc.addPage(page);
  }

  const finalBytes = Buffer.from(await pdfDoc.save({ useObjectStreams: true }));
  if (finalBytes.length > MAX_FINAL_FILE_BYTES) throw new Error("Documento final excede 20 MB.");
  const finalHash = crypto.createHash("sha256").update(finalBytes).digest("hex");
  const finalName = `${String(currentDoc.original_name || "documento").replace(/\.pdf$/i, "")}-assinado.pdf`;
  const storagePath = `${envelope.organization_id}/completed/${envelope.id}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, finalBytes, {
    contentType: "application/pdf",
    cacheControl: "0",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: created, error: insertError } = await db
    .from("signature_documents")
    .insert({
      envelope_id: envelope.id,
      document_kind: "FINAL",
      storage_bucket: BUCKET,
      storage_path: storagePath,
      original_name: finalName,
      mime_type: "application/pdf",
      size_bytes: finalBytes.length,
      sha256: finalHash,
      page_count: pdfDoc.getPageCount(),
    })
    .select("id, storage_bucket, storage_path, original_name, size_bytes, sha256, document_kind")
    .single();

  if (insertError) {
    await db.storage.from(BUCKET).remove([storagePath]);
    if (insertError.code === "23505") {
      const { data: concurrent, error: concurrentError } = await db
        .from("signature_documents")
        .select("id, storage_bucket, storage_path, original_name, size_bytes, sha256, document_kind")
        .eq("envelope_id", envelope.id)
        .eq("document_kind", "FINAL")
        .single();
      if (concurrentError) throw concurrentError;
      return concurrent;
    }
    throw insertError;
  }

  // Clean up all IN_PROGRESS documents
  const inProgressDocs = documents.filter(d => d.document_kind === "IN_PROGRESS");
  if (inProgressDocs.length > 0) {
    const pathsToDelete = inProgressDocs.map(d => d.storage_path);
    const idsToDelete = inProgressDocs.map(d => d.id);
    await db.from("signature_documents").delete().in("id", idsToDelete);
    await db.storage.from(BUCKET).remove(pathsToDelete).catch(() => null);
  }

  await db.from("signature_evidence_events").insert({
    organization_id: envelope.organization_id,
    envelope_id: envelope.id,
    event_type: "FINAL_DOCUMENT_GENERATED",
    payload: { original_sha256: currentDoc.sha256, final_sha256: finalHash, page_count: pdfDoc.getPageCount() },
  });

  return created;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export async function drawSignatureStamp(pdfDoc, recipient, stampX, stampY, stampPage, verificationCode) {
  const pages = pdfDoc.getPages();
  const index = clamp(stampPage - 1, 0, pages.length - 1);
  const page = pages[index];
  const { width, height } = page.getSize();

  const STAMP_WIDTH = 240;
  const STAMP_HEIGHT = 65;

  let px = Number(stampX);
  let py = Number(stampY);

  let resolvedX = px >= 0 && px <= 1 ? px * width : px;
  let resolvedY = py >= 0 && py <= 1 ? (1 - py) * height - STAMP_HEIGHT : py;

  resolvedX = clamp(resolvedX, 10, Math.max(10, width - STAMP_WIDTH - 10));
  resolvedY = clamp(resolvedY, 10, Math.max(10, height - STAMP_HEIGHT - 10));

  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: resolvedX,
    y: resolvedY,
    width: STAMP_WIDTH,
    height: STAMP_HEIGHT,
    color: rgb(1, 1, 1),
    borderColor: rgb(0.83, 0.69, 0.22),
    borderWidth: 1.5,
  });

  page.drawRectangle({
    x: resolvedX + 3,
    y: resolvedY + 3,
    width: STAMP_WIDTH - 6,
    height: STAMP_HEIGHT - 6,
    borderColor: rgb(0.92, 0.86, 0.72),
    borderWidth: 0.5,
  });

  // Try loading and embedding the custom Logo.png
  let logoEmbedded = false;
  let logoImage = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "Logo.png");
    const logoBytes = await fs.readFile(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
    logoEmbedded = true;
  } catch (err) {
    console.error("Failed to embed Logo.png in signature stamp:", err);
  }

  if (logoEmbedded && logoImage) {
    page.drawImage(logoImage, {
      x: resolvedX + 8,
      y: resolvedY + 13.5,
      width: 38,
      height: 38,
    });
  } else {
    page.drawRectangle({
      x: resolvedX + 10,
      y: resolvedY + 15.5,
      width: 34,
      height: 34,
      color: rgb(0.83, 0.69, 0.22),
    });

    page.drawText("SJ", {
      x: resolvedX + 18,
      y: resolvedY + 25.5,
      size: 14,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
  }

  const signedAt = recipient.completed_at || new Date().toISOString();
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
    hour12: false,
  }).format(new Date(signedAt));

  const textX = resolvedX + 52;
  const startY = resolvedY + 52;

  page.drawText("Documento assinado digitalmente", {
    x: textX,
    y: startY,
    size: 6.5,
    font: boldFont,
    color: rgb(0.4, 0.4, 0.4),
  });

  const nameText = pdfSafeText(recipient.name || recipient.signed_name || "Signatario").toUpperCase().substring(0, 32);
  page.drawText(nameText, {
    x: textX,
    y: startY - 10,
    size: 7.5,
    font: boldFont,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`Data: ${formattedDate}-0300`, {
    x: textX,
    y: startY - 20,
    size: 6.5,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText("Verifique em socialjuridico.com.br/validar", {
    x: textX,
    y: startY - 30,
    size: 5.8,
    font: regularFont,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`Codigo: ${verificationCode}`, {
    x: textX,
    y: startY - 40,
    size: 6.5,
    font: boldFont,
    color: rgb(0.83, 0.69, 0.22),
  });
}

export async function generateCertificatePdf(db, envelopeId) {
  const { data: envelope, error: envelopeError } = await db
    .from("signature_envelopes")
    .select("id, organization_id, title, document_type, status, verification_code, sent_at, completed_at, created_at")
    .eq("id", envelopeId)
    .single();
  if (envelopeError) throw envelopeError;

  const { data: original, error: originalError } = await db
    .from("signature_documents")
    .select("id, original_name, size_bytes, sha256")
    .eq("envelope_id", envelopeId)
    .eq("document_kind", "ORIGINAL")
    .single();
  if (originalError) throw originalError;

  const { data: recipients, error: recipientError } = await db
    .from("signature_recipients")
    .select("id, name, email, role, status, completed_at, signature_method, signed_name, signed_ip_hash, signed_user_agent")
    .eq("envelope_id", envelopeId)
    .order("signing_order", { ascending: true });
  if (recipientError) throw recipientError;

  const pdfDoc = await PDFDocument.create();
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Try loading and embedding the custom Logo.png for the certificate sidebar
  let logoEmbedded = false;
  let logoImage = null;
  try {
    const logoPath = path.join(process.cwd(), "public", "Logo.png");
    const logoBytes = await fs.readFile(logoPath);
    logoImage = await pdfDoc.embedPng(logoBytes);
    logoEmbedded = true;
  } catch (err) {
    console.error("Failed to embed Logo.png in certificate:", err);
  }

  const pageSize = [595.28, 841.89];
  let page = pdfDoc.addPage(pageSize);

  const darkNavy = rgb(0.08, 0.1, 0.15);
  const gold = rgb(0.77, 0.63, 0.35);
  const lightGold = rgb(0.96, 0.93, 0.85);
  const white = rgb(1, 1, 1);
  const darkGray = rgb(0.2, 0.2, 0.2);
  const lightGray = rgb(0.95, 0.95, 0.95);
  const textMuted = rgb(0.45, 0.45, 0.45);
  const green = rgb(0.0, 0.75, 0.35);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: 150,
    height: 841.89,
    color: darkNavy,
  });

  page.drawRectangle({
    x: 150,
    y: 0,
    width: 4,
    height: 841.89,
    color: gold,
  });

  page.drawText("SOCIAL JURIDICO", {
    x: 30,
    y: 770,
    size: 10,
    font: bold,
    color: gold,
  });
  page.drawText("ASSINATURAS", {
    x: 30,
    y: 755,
    size: 8,
    font: regular,
    color: white,
  });

  if (logoEmbedded && logoImage) {
    page.drawImage(logoImage, {
      x: 30,
      y: 690,
      width: 38,
      height: 38,
    });
  } else {
    page.drawRectangle({
      x: 30,
      y: 700,
      width: 25,
      height: 25,
      color: gold,
    });
    page.drawText("SJ", {
      x: 37,
      y: 708,
      size: 10,
      font: bold,
      color: darkNavy,
    });
  }

  const sidebarLines = [
    "VALIDADE JURIDICA",
    "MP 2.200-2/2001",
    "LEI 14.063/2020",
    "INTEGRIDADE",
    "GARANTIDA POR HASH",
    "E EVIDENCIAS",
  ];
  let sidebarY = 250;
  for (const line of sidebarLines) {
    page.drawText(line, {
      x: 30,
      y: sidebarY,
      size: 7,
      font: bold,
      color: rgb(0.4, 0.5, 0.6),
    });
    sidebarY -= 15;
  }

  page.drawText("CERTIFICADO DE EVIDENCIAS", {
    x: 180,
    y: 770,
    size: 20,
    font: bold,
    color: darkNavy,
  });
  page.drawText("Este documento serve como comprovante legal das assinaturas e assinantes.", {
    x: 180,
    y: 752,
    size: 8,
    font: regular,
    color: textMuted,
  });

  let y = 720;

  const drawDetailsBox = (titleText, items, startY, heightBox) => {
    page.drawRectangle({
      x: 180,
      y: startY - heightBox,
      width: 365,
      height: heightBox,
      color: lightGray,
    });
    page.drawRectangle({
      x: 180,
      y: startY,
      width: 365,
      height: 2,
      color: gold,
    });
    page.drawText(titleText.toUpperCase(), {
      x: 195,
      y: startY - 14,
      size: 9,
      font: bold,
      color: darkNavy,
    });

    let currentY = startY - 28;
    for (const item of items) {
      page.drawText(item.label + ":", {
        x: 195,
        y: currentY,
        size: 7.5,
        font: bold,
        color: textMuted,
      });

      const valText = pdfSafeText(item.value);
      const lines = wrapText(valText, regular, 7.5, 250);
      for (const line of lines) {
        page.drawText(line, {
          x: 275,
          y: currentY,
          size: 7.5,
          font: regular,
          color: darkNavy,
        });
        currentY -= 10;
      }
      currentY -= 2;
    }
  };

  const docItems = [
    { label: "Titulo", value: envelope.title },
    { label: "Arquivo Original", value: original.original_name },
    { label: "Codigo de Validade", value: envelope.verification_code },
    { label: "Hash SHA-256", value: original.sha256 },
    { label: "Criado em", value: new Date(envelope.created_at).toLocaleString("pt-BR") },
    { label: "Concluido em", value: envelope.completed_at ? new Date(envelope.completed_at).toLocaleString("pt-BR") : "N/A" },
  ];

  drawDetailsBox("Dados do Documento", docItems, y, 105);
  y -= 125;

  page.drawText("ASSINATURAS E HABILITACOES", {
    x: 180,
    y,
    size: 11,
    font: bold,
    color: darkNavy,
  });
  y -= 15;

  for (const recipient of recipients || []) {
    if (y < 170) {
      page = pdfDoc.addPage(pageSize);
      page.drawRectangle({ x: 0, y: 0, width: 150, height: 841.89, color: darkNavy });
      page.drawRectangle({ x: 150, y: 0, width: 4, height: 841.89, color: gold });
      page.drawText("SOCIAL JURIDICO", { x: 30, y: 770, size: 10, font: bold, color: gold });
      if (logoEmbedded && logoImage) {
        page.drawImage(logoImage, { x: 30, y: 690, width: 38, height: 38 });
      }
      y = 750;
    }

    const boxHeight = 85;
    page.drawRectangle({
      x: 180,
      y: y - boxHeight,
      width: 365,
      height: boxHeight,
      color: white,
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });

    const isCompleted = recipient.status === "COMPLETED";
    page.drawRectangle({
      x: 180,
      y: y - boxHeight,
      width: 4,
      height: boxHeight,
      color: isCompleted ? green : gold,
    });

    page.drawRectangle({
      x: 480,
      y: y - 18,
      width: 55,
      height: 12,
      color: isCompleted ? rgb(0.9, 0.97, 0.92) : lightGold,
    });
    page.drawText(isCompleted ? "CONCLUIDO" : "PENDENTE", {
      x: 485,
      y: y - 15,
      size: 6.5,
      font: bold,
      color: isCompleted ? green : gold,
    });

    page.drawText(pdfSafeText(recipient.name), {
      x: 195,
      y: y - 14,
      size: 8.5,
      font: bold,
      color: darkNavy,
    });
    page.drawText(`Papel: ${recipient.role === "APPROVER" ? "Aprovador" : recipient.role === "COPY" ? "Copia" : "Signatario"}`, {
      x: 195,
      y: y - 24,
      size: 7,
      font: regular,
      color: textMuted,
    });
    page.drawText(`E-mail: ${recipient.email}`, {
      x: 195,
      y: y - 34,
      size: 7,
      font: regular,
      color: textMuted,
    });

    if (isCompleted) {
      page.drawText(`Assinado em: ${new Date(recipient.completed_at).toLocaleString("pt-BR")}`, {
        x: 195,
        y: y - 46,
        size: 7,
        font: regular,
        color: darkNavy,
      });

      page.drawText(`IP de Evidencia: ${recipient.signed_ip_hash || "N/A"}`, {
        x: 195,
        y: y - 56,
        size: 6,
        font: regular,
        color: textMuted,
      });

      const userAgentRaw = recipient.signed_user_agent || "N/A";
      const uaLines = wrapText(`Navegador: ${userAgentRaw}`, regular, 5.5, 335);
      let uaY = y - 66;
      for (const line of uaLines.slice(0, 2)) {
        page.drawText(line, {
          x: 195,
          y: uaY,
          size: 5.5,
          font: regular,
          color: textMuted,
        });
        uaY -= 8;
      }
    } else {
      page.drawText("Aguardando assinatura eletronica.", {
        x: 195,
        y: y - 46,
        size: 7,
        font: regular,
        color: gold,
      });
    }

    y -= boxHeight + 10;
  }

  if (y < 100) {
    page = pdfDoc.addPage(pageSize);
    page.drawRectangle({ x: 0, y: 0, width: 150, height: 841.89, color: darkNavy });
    page.drawRectangle({ x: 150, y: 0, width: 4, height: 841.89, color: gold });
    y = 750;
  }

  page.drawRectangle({
    x: 180,
    y: 50,
    width: 365,
    height: 45,
    color: lightGold,
  });
  page.drawText("VALIDACAO DE AUTENTICIDADE", {
    x: 195,
    y: 80,
    size: 7.5,
    font: bold,
    color: gold,
  });
  page.drawText("Consulte o codigo deste envelope em: socialjuridico.com.br/validar", {
    x: 195,
    y: 70,
    size: 7,
    font: regular,
    color: darkNavy,
  });
  page.drawText(`Codigo de seguranca: ${envelope.verification_code}`, {
    x: 195,
    y: 60,
    size: 7.5,
    font: bold,
    color: darkNavy,
  });

  const finalPdfBytes = await pdfDoc.save();
  return Buffer.from(finalPdfBytes);
}

export async function applyRecipientSignature(db, envelopeId, recipientId) {
  const { data: recipient, error: recipientError } = await db
    .from("signature_recipients")
    .select("id, name, status, stamp_page, stamp_x, stamp_y, completed_at, signed_name, role")
    .eq("id", recipientId)
    .single();
  if (recipientError) throw recipientError;
  if (recipient.status !== "COMPLETED") {
    throw new Error("Recipient is not completed yet.");
  }

  const { data: envelope, error: envelopeError } = await db
    .from("signature_envelopes")
    .select("id, organization_id, verification_code")
    .eq("id", envelopeId)
    .single();
  if (envelopeError) throw envelopeError;

  const { data: documents, error: docError } = await db
    .from("signature_documents")
    .select("id, document_kind, storage_bucket, storage_path, original_name, size_bytes, sha256")
    .eq("envelope_id", envelopeId)
    .in("document_kind", ["ORIGINAL", "IN_PROGRESS"])
    .order("created_at", { ascending: false });
  if (docError) throw docError;

  const currentDoc = documents.find(d => d.document_kind === "IN_PROGRESS") || documents.find(d => d.document_kind === "ORIGINAL");
  if (!currentDoc) throw new Error("No source document found for signature stamp.");

  const { data: source, error: downloadError } = await db.storage
    .from(currentDoc.storage_bucket || BUCKET)
    .download(currentDoc.storage_path);
  if (downloadError) throw downloadError;

  const sourceBuffer = Buffer.from(await source.arrayBuffer());
  const pdfDoc = await PDFDocument.load(sourceBuffer, { ignoreEncryption: false, updateMetadata: false });

  const stampPage = recipient.stamp_page || pdfDoc.getPageCount();
  const stampX = recipient.stamp_x !== null && recipient.stamp_x !== undefined ? recipient.stamp_x : 0.5;
  const stampY = recipient.stamp_y !== null && recipient.stamp_y !== undefined ? recipient.stamp_y : 0.8;

  await drawSignatureStamp(pdfDoc, recipient, stampX, stampY, stampPage, envelope.verification_code);

  const pdfBytes = Buffer.from(await pdfDoc.save({ useObjectStreams: true }));
  const pdfHash = crypto.createHash("sha256").update(pdfBytes).digest("hex");
  const storagePath = `${envelope.organization_id}/in_progress/${envelope.id}/${crypto.randomUUID()}.pdf`;

  const { error: uploadError } = await db.storage.from(BUCKET).upload(storagePath, pdfBytes, {
    contentType: "application/pdf",
    cacheControl: "0",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data: insertedDoc, error: insertError } = await db
    .from("signature_documents")
    .insert({
      envelope_id: envelope.id,
      document_kind: "IN_PROGRESS",
      storage_bucket: BUCKET,
      storage_path: storagePath,
      original_name: currentDoc.original_name,
      mime_type: "application/pdf",
      size_bytes: pdfBytes.length,
      sha256: pdfHash,
      page_count: pdfDoc.getPageCount(),
    })
    .select()
    .single();

  if (insertError) {
    await db.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }

  const oldInProgressDocs = documents.filter(d => d.document_kind === "IN_PROGRESS");
  if (oldInProgressDocs.length > 0) {
    const pathsToDelete = oldInProgressDocs.map(d => d.storage_path);
    const idsToDelete = oldInProgressDocs.map(d => d.id);
    await db.from("signature_documents").delete().in("id", idsToDelete);
    await db.storage.from(BUCKET).remove(pathsToDelete).catch(() => null);
  }

  return insertedDoc;
}
