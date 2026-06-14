import {
  DOCUMENTATION_BUCKET,
  getPlatformRequestId,
  hasValidPlatformMutationOrigin,
  platformJson,
  recordPlatformAudit,
  requirePlatformAdmin,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import { isPlatformUuid } from "@/lib/platformContent/contentValidation";
import {
  extractDocumentationPdf,
  generateDocumentationFromPdf,
} from "@/lib/platformContent/documentationAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request, context) {
  let access = null;
  let documentId = null;
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    access = await requirePlatformAdmin();
    if (!access.ok) return access.response;

    const params = await context.params;
    documentId = params?.documentId;
    if (!isPlatformUuid(documentId)) {
      return platformJson({ success: false, message: "Documento inválido." }, 400);
    }

    const body = await request.json().catch(() => ({}));
    const requestId = getPlatformRequestId(request, body);
    const { data: current, error: currentError } = await access.db
      .from("platform_documentation")
      .select("*")
      .eq("id", documentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return platformJson({ success: false, message: "Documento não encontrado." }, 404);
    if (!current.source_pdf_path) {
      return platformJson({ success: false, message: "O documento não possui PDF de origem." }, 409);
    }
    if (current.status === "PROCESSING") {
      return platformJson({ success: false, message: "Este documento já está sendo processado." }, 409);
    }
    if (body.updatedAt && new Date(body.updatedAt).getTime() !== new Date(current.updated_at).getTime()) {
      return platformJson(
        { success: false, conflict: true, message: "O documento foi atualizado em outra sessão." },
        409,
      );
    }

    const { data: locked, error: lockError } = await access.db
      .from("platform_documentation")
      .update({
        status: "PROCESSING",
        processing_error: null,
        updated_by: access.admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("updated_at", current.updated_at)
      .select("id, updated_at")
      .maybeSingle();
    if (lockError) throw lockError;
    if (!locked) {
      return platformJson(
        { success: false, conflict: true, message: "O documento foi atualizado em outra sessão." },
        409,
      );
    }

    const { data: blob, error: downloadError } = await access.db.storage
      .from(DOCUMENTATION_BUCKET)
      .download(current.source_pdf_path);
    if (downloadError || !blob) {
      const error = new Error("Não foi possível recuperar o PDF de origem.");
      error.status = 503;
      throw error;
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const extracted = await extractDocumentationPdf(buffer);
    const generated = await generateDocumentationFromPdf({
      fileName: current.source_file_name || "documentacao.pdf",
      pages: extracted.pages,
    });

    if (current.content_schema?.blocks?.length) {
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

    const nextVersion = current.content_schema?.blocks?.length
      ? Number(current.content_version || 1) + 1
      : Number(current.content_version || 1);
    const nextSlug = `${generated.slug}-${String(current.id).slice(0, 8)}`;
    const { data: updated, error: updateError } = await access.db
      .from("platform_documentation")
      .update({
        slug: nextSlug,
        title: generated.title,
        subtitle: generated.subtitle,
        summary: generated.summary,
        content_type: generated.contentType,
        content_schema: generated.contentSchema,
        content_version: nextVersion,
        status: "REVIEW",
        processing_error: null,
        updated_by: access.admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)
      .eq("status", "PROCESSING")
      .select(
        "id, slug, title, subtitle, summary, content_type, content_schema, content_version, status, updated_at",
      )
      .single();
    if (updateError) throw updateError;

    await recordPlatformAudit(access, request, {
      table: "platform_documentation_audit_logs",
      entityColumn: "documentation_id",
      entityId: documentId,
      action: current.content_schema?.blocks?.length ? "REPROCESS" : "PROCESS",
      requestId,
      metadata: {
        page_count: extracted.pageCount,
        model: generated.model,
        content_type: generated.contentType,
        content_version: nextVersion,
      },
    });

    return platformJson({
      success: true,
      data: updated,
      message: "A IA estruturou o PDF. Revise o conteúdo antes de publicar.",
    });
  } catch (error) {
    if (access?.ok && isPlatformUuid(documentId)) {
      await access.db
        .from("platform_documentation")
        .update({
          status: "FAILED",
          processing_error: String(error?.message || "Falha no processamento").slice(0, 1000),
          updated_by: access.admin.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("status", "PROCESSING");
    }
    return safePlatformError(error, "Não foi possível processar o PDF.");
  }
}
