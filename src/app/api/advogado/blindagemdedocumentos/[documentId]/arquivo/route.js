import crypto from "node:crypto";

import {
  recordSmartDocAudit,
  scopeSmartDocQuery,
  smartDocFailure,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";
import { requireDocumentProtectionAccess } from "@/lib/lawyerDocumentProtection/documentProtectionServer";
import { resolveDocumentProtectionStorageTarget } from "@/lib/lawyerDocumentProtection/documentProtectionValidation";
import { isClientUuid } from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const { data: signed, error: signedError } = await access.db.storage
      .from(storageTarget.bucket)
      .createSignedUrl(storageTarget.path, 120, {
        download: document.file_name || "documento-blindado",
      });
    if (signedError || !signed?.signedUrl) {
      throw signedError || new Error("Não foi possível assinar o download.");
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

    return Response.redirect(signed.signedUrl, 302);
  } catch (error) {
    console.error("[Advogado/Blindagem/Arquivo][GET] Erro:", error);
    const failure = smartDocFailure(
      error,
      "Não foi possível abrir o documento blindado.",
    );
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}
