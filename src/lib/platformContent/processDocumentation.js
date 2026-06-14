import {
  DOCUMENTATION_BUCKET,
  getPlatformRequestId,
  hasValidPlatformMutationOrigin,
  platformJson,
  recordPlatformAudit,
  requirePlatformAdmin,
  safePlatformError,
} from "./contentServer";
import { isPlatformUuid } from "./contentValidation";
import {
  MAX_PRESENTATION_PAGES,
  analyzeDocumentationPdfVisual,
  createPresentationSchema,
  extractDocumentationPdf,
  generateDocumentationFromPdf,
} from "./documentationAi";

function createSlug(value, id) {
  const base = String(value || "documentacao")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "documentacao";
  return `${base}-${String(id).slice(0, 8)}`;
}

async function saveRevision(access, current) {
  if (!current.content_schema?.blocks?.length) return;
  const { error } = await access.db
    .from("platform_documentation_revisions")
    .upsert([{
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
    }], { onConflict: "documentation_id,content_version", ignoreDuplicates: true });
  if (error) throw error;
}

export async function processDocumentationRequest(request, context) {
  let access;
  let documentId;
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    access = await requirePlatformAdmin();
    if (!access.ok) return access.response;

    documentId = (await context.params)?.documentId;
    if (!isPlatformUuid(documentId)) {
      return platformJson({ success: false, message: "Documento inválido." }, 400);
    }

    const body = await request.json().catch(() => ({}));
    const requestId = getPlatformRequestId(request, body);
    const { data: current, error: findError } = await access.db
      .from("platform_documentation")
      .select("*")
      .eq("id", documentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (findError) throw findError;
    if (!current) return platformJson({ success: false, message: "Documento não encontrado." }, 404);
    if (!current.source_pdf_path) {
      return platformJson({ success: false, message: "O documento não possui PDF de origem." }, 409);
    }
    if (current.status === "PROCESSING") {
      return platformJson({ success: false, message: "Este documento já está sendo processado." }, 409);
    }
    if (body.updatedAt && new Date(body.updatedAt).getTime() !== new Date(current.updated_at).getTime()) {
      return platformJson({ success: false, conflict: true, message: "O documento foi atualizado em outra sessão." }, 409);
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
      .select("id")
      .maybeSingle();
    if (lockError) throw lockError;
    if (!locked) {
      return platformJson({ success: false, conflict: true, message: "O documento foi atualizado em outra sessão." }, 409);
    }

    const { data: source, error: sourceError } = await access.db.storage
      .from(DOCUMENTATION_BUCKET)
      .download(current.source_pdf_path);
    if (sourceError || !source) {
      const error = new Error("Não foi possível recuperar o PDF de origem.");
      error.status = 503;
      throw error;
    }

    const buffer = Buffer.from(await source.arrayBuffer());
    const extracted = await extractDocumentationPdf(buffer);
    const visual = await analyzeDocumentationPdfVisual({
      fileName: current.source_file_name || "documentacao.pdf",
      buffer,
      pageCount: extracted.pageCount,
      pageInfo: extracted.pageInfo,
    });

    let generated;
    let processingMode;
    if (visual.isPresentation) {
      if (extracted.pageCount > MAX_PRESENTATION_PAGES) {
        const error = new Error(`Apresentações devem possuir no máximo ${MAX_PRESENTATION_PAGES} slides.`);
        error.status = 413;
        throw error;
      }
      generated = {
        title: visual.title,
        subtitle: visual.subtitle,
        summary: "",
        contentType: "PRESENTATION",
        contentSchema: createPresentationSchema(extracted.pageCount),
        model: visual.model,
      };
      processingMode = "PRESENTATION_FILE_INPUT";
    } else {
      if (!extracted.hasUsefulText) {
        const error = new Error("O PDF não possui texto pesquisável e não foi identificado como apresentação.");
        error.status = 422;
        throw error;
      }
      generated = await generateDocumentationFromPdf({
        fileName: current.source_file_name || "documentacao.pdf",
        pages: extracted.usefulPages,
      });
      processingMode = "TEXT_DOCUMENT";
    }

    await saveRevision(access, current);
    const nextVersion = current.content_schema?.blocks?.length
      ? Number(current.content_version || 1) + 1
      : Number(current.content_version || 1);
    const { data: updated, error: updateError } = await access.db
      .from("platform_documentation")
      .update({
        slug: createSlug(generated.title, current.id),
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
      .select("id, slug, title, subtitle, summary, content_type, content_schema, content_version, status, updated_at")
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
        processing_mode: processingMode,
        model: generated.model,
        content_type: generated.contentType,
        content_version: nextVersion,
      },
    });

    return platformJson({
      success: true,
      data: updated,
      message: generated.contentType === "PRESENTATION"
        ? "A apresentação foi reconhecida. Revise somente o título e o subtítulo antes de publicar."
        : "A IA estruturou o PDF textual e criou o resumo profissional. Revise antes de publicar.",
    });
  } catch (error) {
    if (access?.ok && isPlatformUuid(documentId)) {
      await access.db.from("platform_documentation").update({
        status: "FAILED",
        processing_error: String(error?.message || "Falha no processamento").slice(0, 1000),
        updated_by: access.admin.id,
        updated_at: new Date().toISOString(),
      }).eq("id", documentId).eq("status", "PROCESSING");
    }
    return safePlatformError(error, "Não foi possível processar o PDF.");
  }
}