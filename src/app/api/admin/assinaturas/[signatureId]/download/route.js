import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { readAdminSignableDocument } from "@/lib/adminDocumentSignatures";
import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizeFileName(value) {
  return String(value || "documento-assinado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .toLowerCase();
}

function safePdfText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .replace(/\s+$/gm, "");
}

function wrapText(text, maxChars) {
  const words = safePdfText(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function formatCertificate(signature) {
  const payload = signature.signature_payload || {};
  const evidence = payload.evidence || {};

  return [
    "",
    "---",
    "",
    "# Certificado de Assinatura Eletronica Social Juridico",
    "",
    `**Codigo de verificacao:** ${signature.verification_code}`,
    `**Status:** ${signature.status}`,
    `**Documento:** ${signature.document_title}`,
    `**Categoria:** ${signature.document_category}`,
    `**Caminho original:** ${signature.document_path}`,
    `**Hash SHA-256 do documento:** ${signature.document_hash}`,
    `**Hash SHA-256 da assinatura:** ${signature.signature_hash}`,
    `**Signatario:** ${signature.signer_name}`,
    `**Perfil:** ${signature.signer_role || "ADMIN"}`,
    `**Assinado em:** ${signature.signed_at}`,
    `**IP hash:** ${signature.request_ip_hash || evidence.request_ip_hash || "Registrado no banco"}`,
    `**User-Agent hash:** ${signature.user_agent_hash || evidence.user_agent_hash || "Registrado no banco"}`,
    "",
    "## Declaracao de vontade",
    "",
    signature.signature_statement,
    "",
    "## Base de integridade",
    "",
    "Este certificado registra autoria, integridade, data, hora, hash criptografico e trilha de auditoria da assinatura eletronica realizada no ambiente autenticado da plataforma Social Juridico.",
    "",
  ].join("\n");
}

function drawWrappedText(page, text, options) {
  const {
    x,
    y,
    maxChars = 92,
    lineHeight = 13,
    font,
    size = 9,
    color = rgb(0.13, 0.13, 0.13),
    maxLines = Infinity,
  } = options;

  const lines = wrapText(text, maxChars).slice(0, maxLines);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size,
      font,
      color,
    });
  });
  return y - lines.length * lineHeight;
}

function drawField(page, label, value, { x, y, labelFont, valueFont }) {
  page.drawText(safePdfText(label).toUpperCase(), {
    x,
    y,
    size: 7,
    font: labelFont,
    color: rgb(0.48, 0.42, 0.3),
  });
  const nextY = drawWrappedText(page, value, {
    x,
    y: y - 13,
    maxChars: 58,
    lineHeight: 11,
    font: valueFont,
    size: 8.5,
    color: rgb(0.11, 0.11, 0.11),
    maxLines: 3,
  });
  return nextY - 8;
}

async function buildSignedPdf({ signature, documentText, validationUrl }) {
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const monoFont = await pdf.embedFont(StandardFonts.Courier);
  const gold = rgb(0.67, 0.5, 0.18);
  const dark = rgb(0.08, 0.08, 0.08);
  const muted = rgb(0.42, 0.42, 0.42);

  const cover = pdf.addPage([595.28, 841.89]);
  cover.drawRectangle({
    x: 0,
    y: 0,
    width: 595.28,
    height: 841.89,
    color: rgb(0.98, 0.96, 0.91),
  });
  cover.drawRectangle({
    x: 42,
    y: 42,
    width: 511.28,
    height: 757.89,
    borderColor: rgb(0.82, 0.72, 0.48),
    borderWidth: 1.2,
  });

  cover.drawText("SOCIAL JURIDICO", {
    x: 58,
    y: 770,
    size: 11,
    font: titleFont,
    color: gold,
  });
  cover.drawText("CERTIFICADO DE ASSINATURA ELETRONICA", {
    x: 58,
    y: 722,
    size: 23,
    font: titleFont,
    color: dark,
  });
  cover.drawText("Documento interno assinado em ambiente autenticado", {
    x: 60,
    y: 697,
    size: 10,
    font: bodyFont,
    color: muted,
  });

  cover.drawRectangle({
    x: 58,
    y: 630,
    width: 479,
    height: 42,
    color: rgb(0.11, 0.1, 0.08),
  });
  cover.drawText("CODIGO DE VERIFICACAO", {
    x: 74,
    y: 654,
    size: 7,
    font: titleFont,
    color: rgb(0.82, 0.76, 0.64),
  });
  cover.drawText(safePdfText(signature.verification_code), {
    x: 74,
    y: 636,
    size: 18,
    font: monoFont,
    color: rgb(1, 0.89, 0.45),
  });

  let cursorY = 590;
  cursorY = drawField(cover, "Documento", signature.document_title, {
    x: 58,
    y: cursorY,
    labelFont: titleFont,
    valueFont: bodyFont,
  });
  cursorY = drawField(cover, "Signatario", signature.signer_name, {
    x: 58,
    y: cursorY,
    labelFont: titleFont,
    valueFont: bodyFont,
  });
  cursorY = drawField(cover, "Assinado em", signature.signed_at, {
    x: 58,
    y: cursorY,
    labelFont: titleFont,
    valueFont: bodyFont,
  });
  cursorY = drawField(cover, "Hash SHA-256 do documento", signature.document_hash, {
    x: 58,
    y: cursorY,
    labelFont: titleFont,
    valueFont: monoFont,
  });
  cursorY = drawField(cover, "Hash SHA-256 da assinatura", signature.signature_hash, {
    x: 58,
    y: cursorY,
    labelFont: titleFont,
    valueFont: monoFont,
  });
  cursorY = drawField(cover, "Validacao publica", validationUrl, {
    x: 58,
    y: cursorY,
    labelFont: titleFont,
    valueFont: bodyFont,
  });

  cover.drawText("DECLARACAO DE VONTADE", {
    x: 58,
    y: 210,
    size: 9,
    font: titleFont,
    color: gold,
  });
  drawWrappedText(cover, signature.signature_statement, {
    x: 58,
    y: 192,
    maxChars: 88,
    lineHeight: 12,
    font: bodyFont,
    size: 8.5,
    color: dark,
    maxLines: 8,
  });

  cover.drawText("Base tecnica: autenticacao do administrador, manifestacao expressa de vontade, hash SHA-256, carimbo de tempo e trilha de auditoria append-only.", {
    x: 58,
    y: 86,
    size: 7,
    font: bodyFont,
    color: muted,
  });
  cover.drawText("Base juridica referencial: MP 2.200-2/2001, art. 10, paragrafo 2; Lei 14.063/2020.", {
    x: 58,
    y: 73,
    size: 7,
    font: bodyFont,
    color: muted,
  });

  const certificate = formatCertificate(signature);
  const body = [
    "# Documento assinado",
    "",
    documentText,
    certificate,
  ].join("\n");
  const paragraphs = safePdfText(body).split(/\n/);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;
  page.drawText("Documento assinado", {
    x: 48,
    y,
    size: 16,
    font: titleFont,
    color: dark,
  });
  y -= 30;

  for (const paragraph of paragraphs) {
    const lines = paragraph.trim()
      ? wrapText(paragraph, 96)
      : [""];

    for (const line of lines) {
      if (y < 54) {
        page = pdf.addPage([595.28, 841.89]);
        y = 790;
      }
      page.drawText(line, {
        x: 48,
        y,
        size: 8.4,
        font: paragraph.startsWith("#") ? titleFont : bodyFont,
        color: dark,
      });
      y -= paragraph.startsWith("#") ? 16 : 11.5;
    }
    y -= 3;
  }

  return pdf.save();
}

export async function GET(request, context) {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status },
      );
    }

    const params = await context?.params;
    const fallbackSignatureId = (() => {
      try {
        const parts = new URL(request.url).pathname.split("/").filter(Boolean);
        const index = parts.indexOf("assinaturas");
        return index >= 0 ? parts[index + 1] : "";
      } catch {
        return "";
      }
    })();
    const signatureId = String(params?.signatureId || fallbackSignatureId || "").trim();
    if (!signatureId) {
      return NextResponse.json(
        { success: false, message: "Assinatura nao informada." },
        { status: 400 },
      );
    }

    const { data: signature, error } = await auth.db
      .from("admin_document_signatures")
      .select("*")
      .eq("id", signatureId)
      .maybeSingle();

    if (error) throw error;
    if (!signature) {
      return NextResponse.json(
        { success: false, message: "Assinatura nao encontrada." },
        { status: 404 },
      );
    }

    const documentFile = await readAdminSignableDocument({
      id: signature.document_id,
      title: signature.document_title,
      category: signature.document_category,
      path: signature.document_path,
    });

    const { searchParams } = new URL(request.url);
    const format = String(searchParams.get("format") || "md").toLowerCase();
    const content = `${documentFile.text}${formatCertificate(signature)}`;
    const baseFileName = `${sanitizeFileName(signature.document_title)}-${signature.verification_code}`;

    if (format === "pdf") {
      const validationUrl = `${resolvePublicAppOrigin(request)}/validar?code=${encodeURIComponent(signature.verification_code)}`;
      const pdfBytes = await buildSignedPdf({
        signature,
        documentText: documentFile.text,
        validationUrl,
      });

      return new NextResponse(pdfBytes, {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseFileName}.pdf"`,
        },
      });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseFileName}.md"`,
      },
    });
  } catch (error) {
    console.error("[Admin/Assinaturas/Download]", error);
    return NextResponse.json(
      {
        success: false,
        message: "Nao foi possivel baixar o documento assinado.",
      },
      { status: 500 },
    );
  }
}
