import {
  MAX_REQUESTS_PER_DAY,
  requireLawyerSiteRequestUser,
  serializeSiteRequest,
  siteRequestFailure,
  siteRequestJson,
} from "./siteRequestServerShared";

export async function listLawyerSiteRequests(request) {
  try {
    const access = await requireLawyerSiteRequestUser(request);
    if (!access.ok) return access.response;

    const { data, error } = await access.db
      .from("lawyer_site_requests")
      .select(
        "id, project_type, office_name, objective, deadline, budget_range, preferred_contact, status, created_at, updated_at",
      )
      .eq("lawyer_id", access.user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) throw error;

    return siteRequestJson({
      success: true,
      data: (data || []).map(serializeSiteRequest),
      profile: {
        name: access.profile?.name || "",
        email: access.user?.email || "",
      },
      limits: {
        maxRequestsPerDay: MAX_REQUESTS_PER_DAY,
      },
    });
  } catch (error) {
    console.error("[Advogado/QueroSite][GET] Erro:", error);
    const failure = siteRequestFailure(
      error,
      "Não foi possível carregar suas solicitações.",
    );
    return siteRequestJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
