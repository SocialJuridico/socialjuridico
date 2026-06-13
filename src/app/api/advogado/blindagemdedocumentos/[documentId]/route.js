import {
  hasValidSmartDocOrigin,
  recordSmartDocAudit,
  scopeSmartDocQuery,
  smartDocFailure,
  smartDocJson,
} from "@/lib/lawyerSmartDocs/smartDocServer";
import {
  canDeleteProtectedDocument,
  requireDocumentProtectionAccess,
} from "@/lib/lawyerDocumentProtection/documentProtectionServer";
import { resolveDocumentProtectionStorageTarget } from "@/lib/lawyerDocumentProtection/documentProtectionValidation";
import { isClientUuid } from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function operationError(message, status = 409, code = "DELETE_FAILED") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export async function DELETE(request, context) {
  try {
    if (!hasValidSmartDocOrigin(request)) {
      return smartDocJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requireDocumentProtectionAccess(request);
    if (!access.ok) return access.response;

    const { documentId } = await context.params;
    const body = await request.json().catch(() => null);
    const requestId = String(body?.requestId || "");
    if (!isClientUuid(documentId) || !isClientUuid(requestId)) {
      return smartDocJson(
        { success: false, message: "Solicitação de exclusão inválida." },
        400,
      );
    }

    const { data: priorDeletion, error: priorDeletionError } = await access.db
      .from("smartdoc_audit_logs")
      .select("id, metadata")
      .eq("actor_id", access.user.id)
      .eq("request_id", requestId)
      .eq("action", "DELETE_DOCUMENT")
      .maybeSingle();
    if (priorDeletionError) throw priorDeletionError;
    if (priorDeletion?.metadata?.deleted_document_id === documentId) {
      return smartDocJson({
        success: true,
        idempotent: true,
        message: "A exclusão desta solicitação já foi concluída.",
      });
    }

    let query = access.db
      .from("crm_documents")
      .select(
        "id, lawyer_id, storage_bucket, storage_path, file_size_bytes, is_blindado",
      )
      .eq("id", documentId)
      .eq("is_blindado", true);
    query = scopeSmartDocQuery(query, access.lawyerIds);
    const { data: document, error: documentError } = await query.maybeSingle();
    if (documentError) throw documentError;
    if (!document) {
      return smartDocJson(
        { success: false, message: "Documento blindado não encontrado." },
        404,
      );
    }
    if (!canDeleteProtectedDocument(access, document.lawyer_id)) {
      return smartDocJson(
        {
          success: false,
          permissionDenied: true,
          message: "Somente o responsável ou um gestor pode excluir este documento.",
        },
        403,
      );
    }

    const storageTarget = resolveDocumentProtectionStorageTarget(document);
    if (!storageTarget) {
      return smartDocJson(
        {
          success: false,
          message: "O caminho privado do documento é inválido e a exclusão foi bloqueada.",
        },
        409,
      );
    }

    const { data: deleted, error: deleteError } = await access.db.rpc(
      "delete_smartdoc_document",
      {
        p_document_id: document.id,
        p_lawyer_id: document.lawyer_id,
      },
    );
    if (deleteError) throw deleteError;
    if (!deleted?.success) {
      throw operationError(
        deleted?.message || "Não foi possível excluir o registro do documento.",
        409,
        deleted?.code || "DELETE_FAILED",
      );
    }

    const { error: storageError } = await access.db.storage
      .from(storageTarget.bucket)
      .remove([storageTarget.path]);
    let cleanupPending = false;
    if (storageError) {
      cleanupPending = true;
      const { error: queueError } = await access.db
        .from("smartdoc_storage_cleanup")
        .upsert(
          [
            {
              document_id: document.id,
              storage_bucket: storageTarget.bucket,
              storage_path: storageTarget.path,
              reason: String(storageError.message || "STORAGE_DELETE_FAILED").slice(
                0,
                500,
              ),
              status: "PENDING",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "storage_bucket,storage_path" },
        );
      if (queueError) {
        console.error("[Blindagem] Falha ao registrar limpeza pendente:", queueError);
      }
    }

    try {
      await recordSmartDocAudit(access, request, {
        requestId,
        documentId: null,
        lawyerId: document.lawyer_id,
        action: "DELETE_DOCUMENT",
        metadata: {
          deleted_document_id: document.id,
          file_size_bytes: Number(document.file_size_bytes || 0),
          cleanup_pending: cleanupPending,
          protected_document: true,
        },
      });
    } catch (auditError) {
      console.error("[Blindagem] Falha não bloqueante na auditoria:", auditError);
    }

    return smartDocJson(
      {
        success: true,
        cleanupPending,
        message: cleanupPending
          ? "Documento excluído. A limpeza do arquivo foi registrada para nova tentativa."
          : "Documento blindado excluído.",
      },
      cleanupPending ? 202 : 200,
    );
  } catch (error) {
    console.error("[Advogado/Blindagem][DELETE] Erro:", error);
    const failure = smartDocFailure(
      error,
      "Não foi possível excluir o documento blindado.",
    );
    return smartDocJson({ success: false, message: failure.message }, failure.status);
  }
}
