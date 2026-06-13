import crypto from "node:crypto";

import {
  getScopedSignature,
  readSignatureStorageFile,
  recordSignatureAudit,
  requireDigitalSignatureAccess,
  signatureJson,
  signatureServerFailure,
} from "@/lib/digitalSignatures/signatureServer";
import {
  isValidSignatureUuid,
  parseSignatureMetadata,
} from "@/lib/digitalSignatures/signatureValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function downloadName(value) {
  const base = String(value || "documento-assinado")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._ -]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
  return `${base || "documento-assinado"}.pdf`;
}

export async function GET(request, context) {
  try {
    const access = await requireDigitalSignatureAccess(request);
    if (!access.ok) return access.response;

    const { id } = await context.params;
    if (!isValidSignatureUuid(id)) {
      return signatureJson(
        { success: false, message: "Identificador inválido." },
        400,
      );
    }

    const signature = await getScopedSignature(access, id);
    if (!signature) {
      return signatureJson(
        { success: false, message: "Processo não encontrado." },
        404,
      );
    }
    if (signature.status !== "signed") {
      return signatureJson(
        { success: false, message: "O PDF final ainda não está disponível." },
        409,
      );
    }

    const metadata = parseSignatureMetadata(signature.metadata);
    const storagePath =
      signature.signed_storage_path || metadata.storage?.signed_path || null;
    if (!storagePath) {
      return signatureJson(
        { success: false, message: "Arquivo não localizado." },
        404,
      );
    }

    const buffer = await readSignatureStorageFile(storagePath);
    await recordSignatureAudit(access, request, {
      requestId: crypto.randomUUID(),
      signatureId: signature.id,
      action: "DOWNLOAD",
      metadata: { storage_path: storagePath },
    });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${downloadName(signature.document_name)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Advogado/Assinaturas/Arquivo] Erro:", error);
    const failure = signatureServerFailure(
      error,
      "Não foi possível baixar o documento assinado.",
    );
    return signatureJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
