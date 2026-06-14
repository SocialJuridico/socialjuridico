import {
  TUTORIAL_BUCKET,
  createPrivateSignedUrl,
  platformJson,
  requireTutorialUser,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import { getTutorialRoute } from "@/lib/platformTutorials/tutorialRoutes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await requireTutorialUser(request);
    if (!access.ok) return access.response;

    const url = new URL(request.url);
    const routeKey = String(url.searchParams.get("routeKey") || "")
      .trim()
      .toUpperCase();
    if (routeKey) {
      const route = getTutorialRoute(routeKey);
      if (!route || route.audience !== access.audience) {
        return platformJson({ success: false, message: "Rota de tutorial inválida." }, 400);
      }
    }

    const { data: tutorials, error } = await access.db
      .from("platform_tutorials")
      .select(
        "id, title, description, audience, route_key, version, video_path, video_mime_type, duration_seconds, auto_open, sort_order, published_at",
      )
      .eq("status", "PUBLISHED")
      .in("audience", [access.audience, "BOTH"])
      .is("deleted_at", null)
      .order("sort_order", { ascending: true })
      .order("published_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const ids = (tutorials || []).map((item) => item.id);
    let progress = [];
    if (ids.length) {
      const result = await access.db
        .from("platform_tutorial_user_progress")
        .select(
          "tutorial_id, tutorial_version, first_shown_at, dismissed_at, completed_at, last_position_seconds, view_count",
        )
        .eq("user_id", access.user.id)
        .eq("audience", access.audience)
        .in("tutorial_id", ids);
      if (result.error) throw result.error;
      progress = result.data || [];
    }

    const progressByKey = new Map(
      progress.map((item) => [`${item.tutorial_id}:${item.tutorial_version}`, item]),
    );
    const data = await Promise.all(
      (tutorials || []).map(async (item) => {
        const itemProgress = progressByKey.get(`${item.id}:${item.version}`) || null;
        return {
          id: item.id,
          title: item.title,
          description: item.description,
          routeKey: item.route_key,
          version: item.version,
          mimeType: item.video_mime_type,
          durationSeconds: item.duration_seconds,
          autoOpen: item.auto_open,
          sortOrder: item.sort_order,
          publishedAt: item.published_at,
          playbackUrl: await createPrivateSignedUrl(
            access.db,
            TUTORIAL_BUCKET,
            item.video_path,
            900,
          ),
          progress: itemProgress
            ? {
                firstShownAt: itemProgress.first_shown_at,
                dismissedAt: itemProgress.dismissed_at,
                completedAt: itemProgress.completed_at,
                lastPositionSeconds: itemProgress.last_position_seconds,
                viewCount: itemProgress.view_count,
              }
            : null,
          isNew: !itemProgress?.first_shown_at,
        };
      }),
    );

    const automatic = routeKey
      ? data.find(
          (item) => item.routeKey === routeKey && item.autoOpen && item.isNew,
        ) || null
      : null;

    return platformJson({
      success: true,
      audience: access.audience,
      routeKey: routeKey || null,
      data,
      automatic,
    });
  } catch (error) {
    return safePlatformError(error, "Não foi possível carregar os tutoriais.");
  }
}
