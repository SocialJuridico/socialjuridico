import {
  platformJson,
  requireLawyerDocumentationAccess,
  safePlatformError,
} from "@/lib/platformContent/contentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function prepareItem(item) {
  const blocks = Array.isArray(item?.content_schema?.blocks)
    ? item.content_schema.blocks
    : [];
  const presentation = item?.content_type === "PRESENTATION" || blocks.some(
    (block) => block?.type === "presentation_pdf" || block?.type === "slide_image",
  );
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    subtitle: item.subtitle,
    summary: item.summary,
    content_type: presentation ? "PRESENTATION" : item.content_type,
    content_version: item.content_version,
    sort_order: item.sort_order,
    published_at: item.published_at,
    updated_at: item.updated_at,
  };
}

export async function GET(request) {
  try {
    const access = await requireLawyerDocumentationAccess(request);
    if (!access.ok) return access.response;

    const url = new URL(request.url);
    const query = String(url.searchParams.get("q") || "").trim().slice(0, 120);
    let builder = access.db
      .from("platform_documentation")
      .select(
        "id, slug, title, subtitle, summary, content_type, content_schema, content_version, sort_order, published_at, updated_at",
      )
      .eq("status", "PUBLISHED")
      .in("target_audience", ["LAWYER", "BOTH"])
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false })
      .limit(200);
    if (query) {
      const escaped = query.replace(/[%_,()]/g, " ");
      builder = builder.or(`title.ilike.%${escaped}%,subtitle.ilike.%${escaped}%,summary.ilike.%${escaped}%`);
    }

    const { data, error } = await builder;
    if (error) throw error;
    return platformJson({ success: true, data: (data || []).map(prepareItem) });
  } catch (error) {
    return safePlatformError(error, "Não foi possível carregar a documentação.");
  }
}
