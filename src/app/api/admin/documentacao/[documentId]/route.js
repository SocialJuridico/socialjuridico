import {
  getPlatformRequestId,
  hasValidPlatformMutationOrigin,
  platformJson,
  recordPlatformAudit,
  requirePlatformAdmin,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import {
  isPlatformUuid,
  normalizePlatformText,
  validateDocumentationUpdate,
} from "@/lib/platformContent/contentValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getDocument(access, documentId) {
  const { data, error } = await access.db
    .from("platform_documentation")
    .select("*")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function PATCH(request, context) {
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requirePlatformAdmin();
    if (!access.ok) return access.response;
    const { documentId } = await context.params;
    if (!isPlatformUuid(documentId)) {
      return platformJson({ success: false, message: "Documento inválido." }, 400);
    }

    const body = await request.json().catch(() => ({}));
    const current = await getDocument(access, documentId);
    if (!current) return platformJson({ success: false, message: "Documento não encontrado." }, 404);
    if (!body.updatedAt || new Date(body.updatedAt).getTime() !== new Date(current.updated_at).getTime()) {
      return platformJson(
        { success: false, conflict: true, message: "O documento foi atualizado em outra sessão." },
        409,
      );
    }

    const validation = validateDocumentationUpdate(body, { partial: true });
    if (!validation.success) {
      return platformJson(
        { success: false, message: "Revise os campos informados.", errors: validation.errors },
        400,
      );
    }

    const allowedStatus = body.status === "ARCHIVED" || body.status === "REVIEW" ? body.status : null;
    const hasContentChange = Object.keys(validation.data).some((key) =>
      ["title", "subtitle", "summary", "content_type", "content_schema"].includes(key),
    );
    if (hasContentChange) {
      const { error: revisionError } = await access.db
        .from("platform_documentation_revisions")
        .upsert(
          [
            {
              documentation_id: current.id,
              content_version: current.content_version,
              snapshot: {
                title: current.title,
                subtitle: current.subtitle,
                summary: current.summary,
                content_type: current.content_type,
                content_schema: current.content_schema,
                status: current.status,
                updated_at: current.updated_at,
              },
              created_by: access.admin.id,
            },
          ],
          { onConflict: "documentation_id,content_version", ignoreDuplicates: true },
        );
      if (revisionError) throw revisionError;
    }

    const updates = {
      ...validation.data,
      ...(allowedStatus ? { status: allowedStatus } : {}),
      ...(hasContentChange ? { content_version: Number(current.content_version || 1) + 1 } : {}),
      updated_by: access.admin.id,
      updated_at: new Date().toISOString(),
    };
    if (current.status === "PUBLISHED" && hasContentChange) {
      updates.status = "REVIEW";
      updates.published_at = null;
      updates.published_by = null;
    }

    const { data: updated, error } = await access.db
      .from("platform_documentation")
      .update(updates)
      .eq("id", documentId)
      .eq("updated_at", current.updated_at)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (!updated) {
      return platformJson(
        { success: false, conflict: true, message: "O documento foi atualizado em outra sessão." },
        409,
      );
    }

    await recordPlatformAudit(access, request, {
      table: "platform_documentation_audit_logs",
      entityColumn: "documentation_id",
      entityId: documentId,
      action: allowedStatus === "ARCHIVED" ? "ARCHIVE" : "UPDATE",
      requestId: getPlatformRequestId(request, body),
      metadata: { fields: Object.keys(updates).filter((key) => !["updated_by", "updated_at"].includes(key)) },
    });

    return platformJson({ success: true, data: updated, message: "Documentação atualizada." });
  } catch (error) {
    return safePlatformError(error, "Não foi possível atualizar a documentação.");
  }
}

export async function DELETE(request, context) {
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requirePlatformAdmin();
    if (!access.ok) return access.response;
    const { documentId } = await context.params;
    if (!isPlatformUuid(documentId)) {
      return platformJson({ success: false, message: "Documento inválido." }, 400);
    }
    const body = await request.json().catch(() => ({}));
    const reason = normalizePlatformText(body.reason, 500);
    if (reason.length < 10) {
      return platformJson(
        { success: false, message: "Informe uma justificativa com pelo menos 10 caracteres." },
        400,
      );
    }

    const current = await getDocument(access, documentId);
    if (!current) return platformJson({ success: false, message: "Documento não encontrado." }, 404);
    const { error } = await access.db
      .from("platform_documentation")
      .update({
        status: "ARCHIVED",
        deleted_at: new Date().toISOString(),
        updated_by: access.admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .is("deleted_at", null);
    if (error) throw error;

    await recordPlatformAudit(access, request, {
      table: "platform_documentation_audit_logs",
      entityColumn: "documentation_id",
      entityId: documentId,
      action: "DELETE",
      requestId: getPlatformRequestId(request, body),
      metadata: { reason, title: current.title, source_path_preserved: true },
    });

    return platformJson({ success: true, message: "Documentação arquivada com histórico preservado." });
  } catch (error) {
    return safePlatformError(error, "Não foi possível excluir a documentação.");
  }
}
