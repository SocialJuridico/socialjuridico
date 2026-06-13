import crypto from "node:crypto";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { supabaseAdmin } from "@/lib/supabase";
import {
  getSignaturePublicStorageUrl,
  hasValidSignatureMutationOrigin,
  readSignatureStorageFile,
  recordPublicSignatureAudit,
  signatureJson,
  signatureServerFailure,
  verifySignatureOtp,
} from "@/lib/digitalSignatures/signatureServer";
import {
  isValidSignatureUuid,
  normalizeSignatureRole,
  normalizeSignatureText,
  parseSignatureMetadata,
} from "@/lib/digitalSignatures/signatureValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OTP_ATTEMPTS = 5;
const STAMP_WIDTH = 240;
const STAMP_HEIGHT = 65;

function storagePathFromPublicUrl(value) {
  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/crm_documents/";
    const index = url.pathname.indexOf(marker);
    return index >= 0
      ? decodeURIComponent(url.pathname.slice(index + marker.length))
      : "";
  } catch {
    return "";
  }
}

function requestIp(request) {
  return normalizeSignatureText(
    request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown",
    100,
  );
}

function safePdfText(value, maxLength = 32) {
  return normalizeSignatureText(value, maxLength)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .toUpperCase();
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function resolveStampPosition({ role, width, height, x, y, position }) {
  let stampX = role === "lawyer" ? 40 : width - STAMP_WIDTH - 40;
  let stampY = 40;

  const presets = {
    "header-left": [40, height - STAMP_HEIGHT - 40],
    "header-center": [(width - STAMP_WIDTH) / 2, height - STAMP_HEIGHT - 40],
    "header-right": [width - STAMP_WIDTH - 40, height - STAMP_HEIGHT - 40],
    "middle-left": [40, (height - STAMP_HEIGHT) / 2],
    "middle-center": [(width - STAMP_WIDTH) / 2, (height - STAMP_HEIGHT) / 2],
    "middle-right": [width - STAMP_WIDTH - 40, (height - STAMP_HEIGHT) / 2],
    "footer-left": [40, 40],
    "footer-center": [(width - STAMP_WIDTH) / 2, 40],
    "footer-right": [width - STAMP_WIDTH - 40, 40],
  };
  if (presets[position]) [stampX, stampY] = presets[position];

  const numericX = Number(x);
  if (Number.isFinite(numericX)) {
    stampX = numericX >= 0 && numericX <= 1 ? numericX * width : numericX;
  }
  const numericY = Number(y);
  if (Number.isFinite(numericY)) {
    stampY =
      numericY >= 0 && numericY <= 1
        ? (1 - numericY) * height - STAMP_HEIGHT
        : numericY;
  }

  return {
    x: clamp(stampX, 10, Math.max(10, width - STAMP_WIDTH - 10)),
    y: clamp(stampY, 10, Math.max(10, height - STAMP_HEIGHT - 10)),
  };
}

async function registerRejectedAttempt(request, signature, metadata, role, party) {
  const attempts = Number(party.otp_attempts || 0) + 1;
  metadata[role] = { ...party, otp_attempts: attempts };
  metadata.history = Array.isArray(metadata.history) ? metadata.history : [];
  metadata.history.push({
    event: `otp_rejected_${role}`,
    timestamp: new Date().toISOString(),
    details: "Tentativa de confirmação com código inválido.",
  });
  await supabaseAdmin
    .from("assinaturas_digitais")
    .update({ metadata, updated_at: new Date().toISOString() })
    .eq("id", signature.id)
    .eq("updated_at", signature.updated_at);
  await recordPublicSignatureAudit(request, signature, "OTP_REJECTED", {
    role,
    attempts,
  });
  return attempts;
}

export async function POST(request) {
  let uploadedPath = null;
  try {
    if (!hasValidSignatureMutationOrigin(request)) {
      return signatureJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const body = await request.json();
    const signatureId = String(body.signature_id || "");
    const role = normalizeSignatureRole(body.role);
    const code = normalizeSignatureText(body.code, 6);
    if (!isValidSignatureUuid(signatureId) || !role || !/^\d{6}$/.test(code)) {
      return signatureJson(
        { success: false, message: "Dados de confirmação inválidos." },
        400,
      );
    }

    const { data: signature, error } = await supabaseAdmin
      .from("assinaturas_digitais")
      .select("*")
      .eq("id", signatureId)
      .maybeSingle();
    if (error) throw error;
    if (!signature) {
      return signatureJson(
        { success: false, message: "Processo de assinatura não encontrado." },
        404,
      );
    }

    const metadata = parseSignatureMetadata(signature.metadata);
    const party = metadata[role];
    const otherRole = role === "lawyer" ? "client" : "lawyer";
    const otherParty = metadata[otherRole] || {};
    if (!party) {
      return signatureJson(
        { success: false, message: "Signatário não encontrado." },
        400,
      );
    }
    if (party.signed) {
      return signatureJson(
        { success: false, message: "Este signatário já realizou a assinatura." },
        409,
      );
    }
    if (!party.otp_hash && !party.otp) {
      return signatureJson(
        { success: false, message: "Solicite um código antes de assinar." },
        400,
      );
    }
    if (Number(party.otp_attempts || 0) >= MAX_OTP_ATTEMPTS) {
      return signatureJson(
        {
          success: false,
          message: "Código bloqueado após várias tentativas. Solicite um novo.",
        },
        429,
      );
    }
    if (!party.otp_expires || Date.now() > Date.parse(party.otp_expires)) {
      return signatureJson(
        { success: false, message: "O código expirou. Solicite um novo." },
        400,
      );
    }
    if (!verifySignatureOtp(signatureId, role, code, party)) {
      const attempts = await registerRejectedAttempt(
        request,
        signature,
        metadata,
        role,
        party,
      );
      return signatureJson(
        {
          success: false,
          message:
            attempts >= MAX_OTP_ATTEMPTS
              ? "Código bloqueado. Solicite um novo código."
              : "Código de verificação incorreto.",
        },
        attempts >= MAX_OTP_ATTEMPTS ? 429 : 400,
      );
    }

    const storageMetadata = metadata.storage || {};
    const currentStoragePath =
      signature.signed_storage_path ||
      storageMetadata.signed_path ||
      signature.original_storage_path ||
      storageMetadata.original_path ||
      storagePathFromPublicUrl(signature.document_url);
    if (!currentStoragePath) {
      return signatureJson(
        { success: false, message: "Arquivo do documento não localizado." },
        404,
      );
    }

    const sourceBuffer = await readSignatureStorageFile(currentStoragePath);
    const pdfDocument = await PDFDocument.load(sourceBuffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
    const pages = pdfDocument.getPages();
    if (!pages.length) throw new Error("O PDF não possui páginas válidas.");

    const requestedPage = Number.parseInt(body.stamp_page, 10);
    const pageIndex = Number.isFinite(requestedPage)
      ? clamp(requestedPage - 1, 0, pages.length - 1)
      : pages.length - 1;
    const page = pages[pageIndex];
    const { width, height } = page.getSize();
    const coordinates = resolveStampPosition({
      role,
      width,
      height,
      x: body.stamp_x,
      y: body.stamp_y,
      position: body.stamp_position,
    });

    const regularFont = await pdfDocument.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);
    const x = coordinates.x;
    const y = coordinates.y;

    page.drawRectangle({
      x,
      y,
      width: STAMP_WIDTH,
      height: STAMP_HEIGHT,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.77, 0.63, 0.35),
      borderWidth: 1.5,
    });
    page.drawRectangle({
      x: x + 3,
      y: y + 3,
      width: STAMP_WIDTH - 6,
      height: STAMP_HEIGHT - 6,
      borderColor: rgb(0.88, 0.8, 0.63),
      borderWidth: 0.5,
    });
    page.drawRectangle({
      x: x + 10,
      y: y + 15.5,
      width: 34,
      height: 34,
      color: rgb(0.77, 0.63, 0.35),
    });
    page.drawText("SJ", {
      x: x + 18,
      y: y + 25.5,
      size: 14,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    const signedAt = new Date().toISOString();
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
    const textX = x + 54;
    const startY = y + 53;
    page.drawText("Documento assinado eletronicamente", {
      x: textX,
      y: startY,
      size: 6.5,
      font: boldFont,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(safePdfText(party.name), {
      x: textX,
      y: startY - 10,
      size: 7.5,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`Data: ${formattedDate} -03:00`, {
      x: textX,
      y: startY - 20,
      size: 6.5,
      font: regularFont,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText("Valide em socialjuridico.com.br/validar", {
      x: textX,
      y: startY - 30,
      size: 5.8,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    page.drawText(`Codigo: ${signature.verification_code}`, {
      x: textX,
      y: startY - 40,
      size: 6.5,
      font: boldFont,
      color: rgb(0.77, 0.63, 0.35),
    });

    const pdfBytes = await pdfDocument.save({ useObjectStreams: true });
    const signedHash = crypto
      .createHash("sha256")
      .update(pdfBytes)
      .digest("hex");
    uploadedPath = `signatures/signed/${signatureId}/${crypto.randomUUID()}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("crm_documents")
      .upload(uploadedPath, pdfBytes, {
        contentType: "application/pdf",
        cacheControl: "0",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const clientIp = requestIp(request);
    const userAgent = normalizeSignatureText(
      request.headers.get("user-agent") || "Navegador não identificado",
      500,
    );
    metadata[role] = {
      ...party,
      signed: true,
      signed_at: signedAt,
      ip: clientIp,
      user_agent: userAgent,
      otp: null,
      otp_hash: null,
      otp_expires: null,
      otp_attempts: 0,
    };
    metadata.storage = {
      original_path:
        signature.original_storage_path || storageMetadata.original_path || null,
      signed_path: uploadedPath,
    };
    metadata.history = Array.isArray(metadata.history) ? metadata.history : [];
    metadata.history.push({
      event: `${role}_signed`,
      timestamp: signedAt,
      details: `Documento assinado eletronicamente por ${party.name}.`,
    });

    const completed = Boolean(otherParty.signed);
    const finalStatus = completed ? "signed" : "partially_signed";
    if (completed) {
      metadata.history.push({
        event: "completed",
        timestamp: signedAt,
        details: "Todas as partes assinaram o documento.",
      });
    }

    const nextUpdatedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("assinaturas_digitais")
      .update({
        status: finalStatus,
        document_url: getSignaturePublicStorageUrl(uploadedPath),
        signed_storage_path: uploadedPath,
        signed_hash: signedHash,
        metadata,
        updated_at: nextUpdatedAt,
      })
      .eq("id", signatureId)
      .eq("updated_at", signature.updated_at)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      await supabaseAdmin.storage.from("crm_documents").remove([uploadedPath]);
      uploadedPath = null;
      return signatureJson(
        {
          success: false,
          message:
            "O documento foi atualizado por outra assinatura. Recarregue e tente novamente.",
        },
        409,
      );
    }

    await recordPublicSignatureAudit(request, signature, "SIGNED", {
      role,
      status: finalStatus,
      page: pageIndex + 1,
      signed_hash: signedHash,
    });
    if (completed) {
      await recordPublicSignatureAudit(request, signature, "COMPLETED", {
        signed_hash: signedHash,
      });
      const { error: notificationError } = await supabaseAdmin
        .from("notificacoes")
        .insert([
          {
            user_id: signature.lawyer_id,
            titulo: "Documento assinado por completo! ✍️",
            mensagem: `O documento "${signature.document_name}" foi assinado por todos os signatários.`,
            tipo: "CRM_SIGNATURE",
            lida: false,
            created_at: signedAt,
          },
        ]);
      if (notificationError) {
        console.error(
          "[Assinatura] Falha ao criar notificação:",
          notificationError,
        );
      }
    }

    return signatureJson({
      success: true,
      message: "Documento assinado com sucesso.",
      data: {
        status: finalStatus,
        document_url: `/api/crm/assinatura/proxy-pdf?id=${signatureId}`,
        signed_hash: signedHash,
      },
    });
  } catch (error) {
    if (uploadedPath) {
      await supabaseAdmin.storage
        .from("crm_documents")
        .remove([uploadedPath])
        .catch(() => null);
    }
    console.error("[CRM/Assinatura/ValidarOTP] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível processar a assinatura eletrônica.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
