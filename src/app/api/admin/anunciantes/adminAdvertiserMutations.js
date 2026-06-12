import {
  json,
  requireAdminAdvertiserAccess,
  validateMutationOrigin,
} from "./adminAdvertiserCore";
import { createAdvertiser } from "./actions/createAdvertiser";
import { setAdvertiserStatus } from "./actions/setAdvertiserStatus";
import { toggleFeaturedAd } from "./actions/toggleFeaturedAd";
import { updateAdLifecycle } from "./actions/updateAdLifecycle";
import { updateAdvertiser } from "./actions/updateAdvertiser";

const VALID_ACTIONS = new Set([
  "CREATE_ADVERTISER",
  "UPDATE_ADVERTISER",
  "SET_ADVERTISER_STATUS",
  "TOGGLE_FEATURED",
  "ARCHIVE_AD",
  "RESTORE_AD",
  "CREATE_ANUNCIANTE",
  "UPDATE_ANUNCIANTE",
  "DELETE_ANUNCIANTE",
  "TOGGLE_DESTAQUE",
  "DELETE_ANUNCIO",
]);

export async function mutateAdminAdvertiser(request) {
  try {
    const originResponse = validateMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireAdminAdvertiserAccess();
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const action = String(body?.action || "").trim().toUpperCase();

    if (!VALID_ACTIONS.has(action)) {
      return json({ success: false, message: "Ação inválida." }, 400);
    }

    const context = {
      db: access.db,
      request,
      adminId: access.auth.user.id,
      body,
    };

    if (["CREATE_ADVERTISER", "CREATE_ANUNCIANTE"].includes(action)) {
      return createAdvertiser(context);
    }

    if (["UPDATE_ADVERTISER", "UPDATE_ANUNCIANTE"].includes(action)) {
      return updateAdvertiser(context);
    }

    if (["SET_ADVERTISER_STATUS", "DELETE_ANUNCIANTE"].includes(action)) {
      return setAdvertiserStatus({
        ...context,
        legacyDelete: action === "DELETE_ANUNCIANTE",
      });
    }

    if (["TOGGLE_FEATURED", "TOGGLE_DESTAQUE"].includes(action)) {
      return toggleFeaturedAd(context);
    }

    return updateAdLifecycle({
      ...context,
      restoring: action === "RESTORE_AD",
      legacyDelete: action === "DELETE_ANUNCIO",
    });
  } catch (error) {
    console.error("[Admin/Anunciantes][POST] Erro:", error);
    return json(
      { success: false, message: "Não foi possível concluir a operação." },
      500,
    );
  }
}
