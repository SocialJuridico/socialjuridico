import crypto from "node:crypto";

import {
  recordSmartDocAudit,
  scopeSmartDocQuery,
  smartDocFailure,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";
import { requireDocumentProtectionAccess } from "@/lib/lawyerDocumentProtection/documentProtectionServer";
import {
  extractLegacyStoragePath,
  resolveLegacyProtectionSource,
} from "@/lib/lawyerDocumentProtection/legacyDocumentProtection";
import { resolveDocumentProtectionStorageTarget } from "@/lib/lawyerDocumentProtection/documentProtectionValidation";
import { isClientUuid } from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function redirectToSignedDownload(access, bucket, path, fileName) {
  const { data: signed, error } = await access.db.storage
    .from(bucket)
    .createSignedUrl(path, 120, {
      download: fileName || "documento-blindado",
    });
  if (error || !signed?.signedUrl) {
    throw error || new Error("Não foi possível assinar o download.");
  }
  return Response.redirect(signed.signedUrl, 302);
}

async function openLegacyDocument(request, access, documentId, sourceKey) {
  const source = resolveLegacyProtectionSource(sourceKey);
  if (!source) {
    return smartDocJson(
      { success: false, message: "Origem do registro legado inválida." },
      400,
    );
  }

  let query = access.db
    .from(source.table)
    .select("id, lawyer_id, file_name, file_url")
    .eq("id", documentId);
  query = scopeSmartDocQuery(query, access.lawyerIds);
  const { data: document, error } = await query.maybeSingle();
  if (error) throw error;
  if (!document) {
    return smartDocJson(
      { success: false, message: "Registro legado não encontrado." },
      404,
    );
  }

  const storagePath = extractLegacyStoragePath(document.file_url, "crm_documents");
  if (!storagePath) {
    return smartDocJson(
      { success: false, message: "Arquivo legado indisponível para download." },
      404,
    );
  }

  try {
    await recordSmartDocAudit(access, request, {
      requestId: crypto.randomUUID(),
      documentId: null,
      lawyerId: document.lawyer_id,
      action: "DOWNLOAD_DOCUMENT",
      metadata: {
        protected_document: true,
        legacy: true,
        legacy_document_id: document.id,
        legacy_source: sourceKey,
        storage_bucket: "crm_documents",
      },
    });
  } catch (auditError) {
    console.error("[Blindagem/Legado/Arquivo] Falha na auditoria:", auditError);
  }

  return redirectToSignedDownload(
    access,
    "crm_documents",
    storagePath,
    document.file_name,
  );
}

export async function GET(request, context) {
  try {
    const access = await requireDocumentProtectionAccess(request);
    if (!access.ok) return access.response;

    const { documentId } = await context.params;
    if (!isClientUuid(documentId)) {
      return smartDocJson(
        { success: false, message: "Documento inválido." },
        400,
      );
    }

    const legacySource = new URL(request.url).searchParams.get("legacySource");
    if (legacySource) {
      return openLegacyDocument(request, access, documentId, legacySource);
    }

    let query = access.db
      .from("crm_documents")
      .select(
        "id, lawyer_id, file_name, file_url, storage_bucket, storage_path, is_blindado",
      )
      .eq("id", documentId)
      .eq("is_blindado", true);
    query = scopeSmartDocQuery(query, access.lawyerIds);
    const { data: document, error } = await query.maybeSingle();
    if (error) throw error;
    if (!document) {
      return smartDocJson(
        { success: false, message: "Documento blindado não encontrado." },
        404,
      );
    }

    const storageTarget = resolveDocumentProtectionStorageTarget(document);
    if (!storageTarget) {
      return smartDocJson(
        { success: false, message: "Arquivo privado indisponível para download." },
        404,
      );
    }

    try {
      await recordSmartDocAudit(access, request, {
        requestId: crypto.randomUUID(),
        documentId: document.id,
        lawyerId: document.lawyer_id,
        action: "DOWNLOAD_DOCUMENT",
        metadata: {
          storage_bucket: storageTarget.bucket,
          protected_document: true,
        },
      });
    } catch (auditError) {
      console.error("[Blindagem/Arquivo] Falha não bloqueante na auditoria:", auditError);
    }

    return redirectToSignedDownload(
      access,
      storageTarget.bucket,
      storageTarget.path,
      document.file_name,
    );
  } catch (error) {
    console.error("[Advogado/Blindagem/Arquivo][GET] Erro:", error);
    const failure = smartDocFailure(
      error,
      "Não foi possível abrir o documento blindado.",
    );
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}
