import {
  getPlatformRequestId,
  hasValidPlatformMutationOrigin,
  platformJson,
  recordPlatformAudit,
  requirePlatformAdmin,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import { isPlatformUuid } from "@/lib/platformContent/contentValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
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
    const { data: current, error: currentError } = await access.db
      .from("platform_documentation")
      .select("id, title, status, content_schema, updated_at")
      .eq("id", documentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return platformJson({ success: false, message: "Documento não encontrado." }, 404);
    if (!Array.isArray(current.content_schema?.blocks) || !current.content_schema.blocks.length) {
      return platformJson({ success: false, message: "Processe e revise o PDF antes de publicar." }, 409);
    }
    if (body.updatedAt && new Date(body.updatedAt).getTime() !== new Date(current.updated_at).getTime()) {
      return platformJson(
        { success: false, conflict: true, message: "O documento foi atualizado em outra sessão." },
        409,
      );
    }

    const publish = body.publish !== false;
    const now = new Date().toISOString();
    const { data: updated, error } = await access.db
      .from("platform_documentation")
      .update({
        status: publish ? "PUBLISHED" : "REVIEW",
        published_at: publish ? now : null,
        published_by: publish ? access.admin.id : null,
        updated_by: access.admin.id,
        updated_at: now,
      })
      .eq("id", documentId)
      .eq("updated_at", current.updated_at)
      .select("id, slug, title, status, published_at, updated_at")
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
      action: publish ? "PUBLISH" : "UNPUBLISH",
      requestId: getPlatformRequestId(request, body),
      metadata: { title: current.title },
    });

    return platformJson({
      success: true,
      data: updated,
      message: publish ? "Documentação publicada." : "Documentação retirada de publicação.",
    });
  } catch (error) {
    return safePlatformError(error, "Não foi possível alterar a publicação.");
  }
}
