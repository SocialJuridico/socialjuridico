import {
  TUTORIAL_BUCKET,
  createPrivateSignedUrl,
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
      .from("platform_tutorials")
      .select("*")
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = await Promise.all(
      (data || []).map(async (item) => ({
        ...item,
        playback_url: await createPrivateSignedUrl(
          access.db,
          TUTORIAL_BUCKET,
          item.video_path,
          900,
        ),
      })),
    );

    const summary = rows.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[String(item.status || "").toLowerCase()] =
          (acc[String(item.status || "").toLowerCase()] || 0) + 1;
        return acc;
      },
      { total: 0, draft: 0, published: 0, archived: 0 },
    );

    return platformJson({ success: true, data: rows, summary });
  } catch (error) {
    return safePlatformError(error, "Não foi possível carregar os tutoriais.");
  }
}
