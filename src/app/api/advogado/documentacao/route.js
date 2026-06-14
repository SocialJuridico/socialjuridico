import {
  platformJson,
  requireLawyerDocumentationAccess,
  safePlatformError,
} from "@/lib/platformContent/contentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await requireLawyerDocumentationAccess(request);
    if (!access.ok) return access.response;

    const url = new URL(request.url);
    const query = String(url.searchParams.get("q") || "").trim().slice(0, 120);
    let builder = access.db
      .from("platform_documentation")
      .select(
        "id, slug, title, subtitle, summary, content_type, content_version, sort_order, published_at, updated_at",
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
    return platformJson({ success: true, data: data || [] });
  } catch (error) {
    return safePlatformError(error, "Não foi possível carregar a documentação.");
  }
}
