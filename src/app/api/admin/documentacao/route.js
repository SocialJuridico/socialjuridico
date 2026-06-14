import {
  platformJson,
  requirePlatformAdmin,
  safePlatformError,
} from "@/lib/platformContent/contentServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const access = await requirePlatformAdmin();
    if (!access.ok) return access.response;

    const { data, error } = await access.db
      .from("platform_documentation")
      .select(
        "id, slug, title, subtitle, summary, content_type, content_schema, schema_version, content_version, status, target_audience, sort_order, source_file_name, source_mime_type, source_size_bytes, processing_error, created_at, updated_at, published_at",
      )
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = data || [];
    const summary = rows.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[String(item.status || "").toLowerCase()] =
          (acc[String(item.status || "").toLowerCase()] || 0) + 1;
        return acc;
      },
      { total: 0, uploaded: 0, processing: 0, review: 0, published: 0, failed: 0, archived: 0 },
    );

    return platformJson({ success: true, data: rows, summary });
  } catch (error) {
    return safePlatformError(error, "Não foi possível carregar a documentação.");
  }
}
