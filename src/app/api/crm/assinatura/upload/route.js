import crypto from "node:crypto";

import {
  getSignaturePublicStorageUrl,
  hasValidSignatureMutationOrigin,
  requireDigitalSignatureAccess,
  signatureJson,
  signatureServerFailure,
  signatureStoragePrefix,
} from "@/lib/digitalSignatures/signatureServer";
import {
  MAX_SIGNATURE_FILE_BYTES,
  validateSignatureFileDescriptor,
} from "@/lib/digitalSignatures/signatureValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    if (!hasValidSignatureMutationOrigin(request)) {
      return signatureJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }
    const access = await requireDigitalSignatureAccess(request);
    if (!access.ok) return access.response;

    const contentType = String(request.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    const declaredSize = Number(request.headers.get("content-length") || 0);
    if (declaredSize > MAX_SIGNATURE_FILE_BYTES) {
      return signatureJson(
        { success: false, message: "O PDF excede o limite de 15 MB." },
        413,
      );
    }

    let fileName = "documento.pdf";
    const headerName = request.headers.get("x-file-name");
    if (headerName) {
      try {
        fileName = decodeURIComponent(headerName);
      } catch {
        fileName = headerName;
      }
    }

    const buffer = Buffer.from(await request.arrayBuffer());
    const validation = validateSignatureFileDescriptor({
      fileName,
      contentType,
      size: buffer.length,
    });
    if (!validation.valid) {
      return signatureJson(
        { success: false, message: validation.errors.file },
        400,
      );
    }
    if (!buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
      return signatureJson(
        { success: false, message: "O conteúdo enviado não corresponde a um PDF." },
        400,
      );
    }

    const storagePath = `${signatureStoragePrefix(access.user.id)}${crypto.randomUUID()}.pdf`;
    const originalHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const { error } = await access.db.storage
      .from("crm_documents")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        cacheControl: "0",
        upsert: false,
      });
    if (error) throw error;

    return signatureJson(
      {
        success: true,
        data: {
          document_url: getSignaturePublicStorageUrl(storagePath),
          original_hash: originalHash,
          upload_path: storagePath,
          file_name: validation.safeName,
        },
      },
      201,
    );
  } catch (error) {
    console.error("[CRM/Assinatura/Upload] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível fazer o upload do documento.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
