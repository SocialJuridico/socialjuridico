import {
  hasValidPlatformMutationOrigin,
  platformJson,
  requireTutorialUser,
  safePlatformError,
} from "@/lib/platformContent/contentServer";
import { isPlatformUuid } from "@/lib/platformContent/contentValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set(["SHOWN", "DISMISSED", "COMPLETED", "PROGRESS"]);

export async function POST(request) {
  try {
    if (!hasValidPlatformMutationOrigin(request)) {
      return platformJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requireTutorialUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const tutorialId = String(body.tutorialId || "");
    const version = Number(body.version);
    const action = String(body.action || "").trim().toUpperCase();
    const positionSeconds = Math.max(0, Math.floor(Number(body.positionSeconds || 0)));
    if (!isPlatformUuid(tutorialId) || !Number.isInteger(version) || version < 1 || !ACTIONS.has(action)) {
      return platformJson({ success: false, message: "Progresso de tutorial inválido." }, 400);
    }

    const { data: tutorial, error: tutorialError } = await access.db
      .from("platform_tutorials")
      .select("id, audience, version, status")
      .eq("id", tutorialId)
      .eq("status", "PUBLISHED")
      .is("deleted_at", null)
      .maybeSingle();
    if (tutorialError) throw tutorialError;
    if (!tutorial || Number(tutorial.version) !== version) {
      return platformJson({ success: false, message: "Tutorial não encontrado ou desatualizado." }, 404);
    }
    if (![access.audience, "BOTH"].includes(tutorial.audience)) {
      return platformJson({ success: false, message: "Tutorial fora do seu perfil." }, 403);
    }

    const { data, error } = await access.db.rpc("record_platform_tutorial_progress", {
      p_user_id: access.user.id,
      p_audience: access.audience,
      p_tutorial_id: tutorialId,
      p_tutorial_version: version,
      p_action: action,
      p_position_seconds: positionSeconds,
    });
    if (error) throw error;

    return platformJson({ success: true, data });
  } catch (error) {
    return safePlatformError(error, "Não foi possível registrar o progresso do tutorial.");
  }
}
