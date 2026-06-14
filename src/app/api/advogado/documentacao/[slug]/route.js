import {
  platformJson,
  requireLawyerDocumentationAccess,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import { normalizePlatformText } from "@/lib/platformContent/contentValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function prepareDocument(data) {
  const originalBlocks = Array.isArray(data?.content_schema?.blocks)
    ? data.content_schema.blocks
    : [];
  const hasPresentationMarker = originalBlocks.some((block) =>
    ["presentation_pdf", "slide_image"].includes(block?.type),
  );
  const shouldRenderSourcePdf =
    data?.content_type === "PRESENTATION" ||
    hasPresentationMarker ||
    originalBlocks.length === 0;

  if (!shouldRenderSourcePdf) return data;

  const blocks = originalBlocks
    .map((block) =>
      block?.type === "presentation_pdf"
        ? { ...block, type: "slide_image", page: 1 }
        : block,
    )
    .filter(Boolean);

  const hasRenderablePdfBlock = blocks.some(
    (block) => block?.type === "slide_image",
  );
  if (!hasRenderablePdfBlock) {
    blocks.push({
      id: "source-pdf-fallback",
      type: "slide_image",
      page: 1,
      title: "Documento completo",
    });
  }

  return {
    ...data,
    ...(data?.content_type === "PRESENTATION" || hasPresentationMarker
      ? { content_type: "PRESENTATION" }
      : {}),
    content_schema: {
      version: Number(data?.content_schema?.version || 1),
      blocks,
    },
  };
}

export async function GET(request, context) {
  try {
    const access = await requireLawyerDocumentationAccess(request);
    if (!access.ok) return access.response;
    const params = await context.params;
    const slug = normalizePlatformText(params?.slug, 120).toLowerCase();
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return platformJson({ success: false, message: "Documentação inválida." }, 400);
    }

    const { data, error } = await access.db
      .from("platform_documentation")
      .select(
        "id, slug, title, subtitle, summary, content_type, content_schema, schema_version, content_version, published_at, updated_at",
      )
      .eq("slug", slug)
      .eq("status", "PUBLISHED")
      .in("target_audience", ["LAWYER", "BOTH"])
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return platformJson({ success: false, message: "Documentação não encontrada." }, 404);
    }

    return platformJson({ success: true, data: prepareDocument(data) });
  } catch (error) {
    return safePlatformError(error, "Não foi possível abrir a documentação.");
  }
}
