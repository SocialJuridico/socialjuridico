import {
  getRequestIpHash,
  getRequestUserAgent,
  hasValidMutationOrigin,
} from "../lawyerOpportunities/opportunityServerUtils";
import { isUuid, normalizeRequestId } from "../lawyerOpportunities/opportunityValidation";
import {
  buildSiteSalesWhatsAppUrl,
  normalizeSiteRequestPayload,
  validateSiteRequestPayload,
} from "./siteRequestValidation";
import {
  SALES_WHATSAPP,
  recordSiteRequestAudit,
  requireLawyerSiteRequestUser,
  serializeSiteRequest,
  siteRequestContactAvailable,
  siteRequestFailure,
  siteRequestJson,
  siteRequestPayloadHash,
} from "./siteRequestServerShared";

export async function createLawyerSiteRequest(request) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return siteRequestJson(
        { success: false, message: "Origem da requisição inválida." },
        403,
      );
    }

    const access = await requireLawyerSiteRequestUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const payload = normalizeSiteRequestPayload(body || {});
    payload.requestId = normalizeRequestId(payload.requestId);

    const validation = validateSiteRequestPayload(payload);
    if (!validation.valid) {
      return siteRequestJson(
        {
          success: false,
          message: "Revise os campos destacados.",
          errors: validation.errors,
        },
        400,
      );
    }

    const { data: created, error } = await access.db.rpc(
      "create_lawyer_site_request",
      {
        p_client_request_id: payload.requestId,
        p_lawyer_id: access.user.id,
        p_project_type: payload.projectType,
        p_office_name: payload.officeName,
        p_objective: payload.objective,
        p_desired_features: payload.desiredFeatures,
        p_domain_status: payload.domainStatus,
        p_current_domain:
          payload.domainStatus === "HAS_DOMAIN"
            ? payload.currentDomain
            : null,
        p_deadline: payload.deadline,
        p_budget_range: payload.budgetRange,
        p_preferred_contact: payload.preferredContact,
        p_contact_phone:
          payload.preferredContact === "WHATSAPP"
            ? payload.contactPhone
            : null,
        p_contact_email:
          payload.preferredContact === "EMAIL"
            ? payload.contactEmail
            : null,
        p_notes: payload.notes || null,
        p_consent_at: new Date().toISOString(),
        p_payload_hash: siteRequestPayloadHash(payload),
        p_ip_hash: getRequestIpHash(request),
        p_user_agent: getRequestUserAgent(request),
      },
    );

    if (error) throw error;
    if (!created?.id) {
      throw new Error("A criação da solicitação não retornou os dados esperados.");
    }

    const alreadyProcessed = Boolean(created.already_processed);
    return siteRequestJson(
      {
        success: true,
        alreadyProcessed,
        message: alreadyProcessed
          ? "Esta solicitação já havia sido registrada."
          : "Solicitação enviada para análise comercial.",
        data: serializeSiteRequest(created),
        contactAvailable: siteRequestContactAvailable(created),
      },
      alreadyProcessed ? 200 : 201,
    );
  } catch (error) {
    console.error("[Advogado/QueroSite][POST] Erro:", error);
    const failure = siteRequestFailure(
      error,
      "Não foi possível registrar sua solicitação.",
    );
    return siteRequestJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}

export async function openLawyerSiteSalesContact(request, siteRequestId) {
  try {
    if (!hasValidMutationOrigin(request)) {
      return siteRequestJson(
        { success: false, message: "Origem da requisição inválida." },
        403,
      );
    }

    if (!isUuid(siteRequestId)) {
      return siteRequestJson(
        { success: false, message: "Solicitação inválida." },
        400,
      );
    }

    const access = await requireLawyerSiteRequestUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const requestId = normalizeRequestId(body?.requestId);
    if (!requestId) {
      return siteRequestJson(
        { success: false, message: "Identificador de contato inválido." },
        400,
      );
    }

    const { data: siteRequest, error } = await access.db
      .from("lawyer_site_requests")
      .select("*")
      .eq("id", siteRequestId)
      .eq("lawyer_id", access.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!siteRequest) {
      return siteRequestJson(
        { success: false, message: "Solicitação não encontrada." },
        404,
      );
    }

    const url = buildSiteSalesWhatsAppUrl(SALES_WHATSAPP, siteRequest);
    if (!url) {
      return siteRequestJson(
        {
          success: false,
          message: "O contato comercial não está configurado no momento.",
        },
        503,
      );
    }

    const alreadyProcessed = await recordSiteRequestAudit(access, request, {
      requestId,
      siteRequestId: siteRequest.id,
      action: "CONTACT_OPENED",
      metadata: { channel: "WHATSAPP" },
    });

    return siteRequestJson({
      success: true,
      alreadyProcessed,
      data: { url },
    });
  } catch (error) {
    console.error("[Advogado/QueroSite/Contato][POST] Erro:", error);
    const failure = siteRequestFailure(
      error,
      "Não foi possível abrir o contato comercial.",
    );
    return siteRequestJson(
      { success: false, message: failure.message },
      failure.status,
    );
  }
}
