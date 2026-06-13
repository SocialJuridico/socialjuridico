import crypto from "node:crypto";

import {
  hasValidSignatureMutationOrigin,
  recordSignatureAudit,
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

    const requestId = request.headers.get("x-request-id") || "";
    const rawFileName = request.headers.get("x-file-name") || "documento.pdf";
    let fileName = "documento.pdf";
    try {
      fileName = decodeURIComponent(rawFileName);
    } catch {
      fileName = rawFileName;
    }

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

    const buffer = Buffer.from(await request.arrayBuffer());
    const fileValidation = validateSignatureFileDescriptor({
      fileName,
      contentType,
      size: buffer.length,
    });
    if (!fileValidation.valid) {
      return signatureJson(
        {
          success: false,
          message: fileValidation.errors.file,
          errors: fileValidation.errors,
        },
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

    await recordSignatureAudit(access, request, {
      requestId,
      action: "UPLOAD",
      metadata: {
        storage_path: storagePath,
        file_name: fileValidation.safeName,
        size: buffer.length,
        sha256: originalHash,
      },
    });

    return signatureJson(
      {
        success: true,
        data: {
          uploadPath: storagePath,
          originalHash,
          fileName: fileValidation.safeName,
          size: buffer.length,
        },
      },
      201,
    );
  } catch (error) {
    console.error("[Advogado/Assinaturas/Upload] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível enviar o documento.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
