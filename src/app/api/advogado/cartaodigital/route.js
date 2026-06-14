import crypto from "node:crypto";

import {
  digitalCardFailure,
  digitalCardJson,
  ensureDigitalCard,
  getDigitalCardMetrics,
  hasValidDigitalCardMutationOrigin,
  recordDigitalCardAudit,
  requireLawyerDigitalCardAccess,
  serializeDigitalCard,
} from "@/lib/lawyerDigitalCard/digitalCardServer";
import { validateDigitalCardMutation } from "@/lib/lawyerDigitalCard/digitalCardValidation";
import {
  getRequestIpHash,
  getRequestUserAgent,
} from "@/lib/lawyerOpportunities/opportunityServerUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requestId(request, body = {}) {
  const candidate =
    body.requestId ||
    request.headers.get("x-idempotency-key") ||
    request.headers.get("x-request-id");
  return /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(candidate || ""))
    ? String(candidate)
    : crypto.randomUUID();
}

export async function GET(request) {
  try {
    const access = await requireLawyerDigitalCardAccess(request);
    if (!access.ok) return access.response;
    const ensured = await ensureDigitalCard(access);
    if (ensured.created) {
      await recordDigitalCardAudit(access, request, {
        requestId: crypto.randomUUID(),
        cardId: ensured.row.id,
        action: "CREATE_CARD",
        metadata: { source: "DASHBOARD_FIRST_ACCESS" },
      });
    }
    const metrics = await getDigitalCardMetrics(access, ensured.row.id);
    return digitalCardJson({
      success: true,
      data: serializeDigitalCard(ensured.row, access),
      metrics,
    });
  } catch (error) {
    console.error("[Cartão Digital][GET] Erro:", error);
    const failure = digitalCardFailure(error, "Não foi possível carregar o cartão digital.");
    return digitalCardJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function PUT(request) {
  try {
    if (!hasValidDigitalCardMutationOrigin(request)) {
      return digitalCardJson({ success: false, message: "Origem não autorizada." }, 403);
    }
    const access = await requireLawyerDigitalCardAccess(request);
    if (!access.ok) return access.response;
    const body = await request.json().catch(() => ({}));
    const validation = validateDigitalCardMutation(body, { partial: true });
    if (!validation.success) {
      return digitalCardJson(
        { success: false, message: "Revise os campos informados.", errors: validation.errors },
        400,
      );
    }
    const ensured = await ensureDigitalCard(access);
    const current = ensured.row;
    const expectedUpdatedAt = body.updatedAt || body.updated_at;
    if (
      expectedUpdatedAt &&
      new Date(expectedUpdatedAt).getTime() !== new Date(current.updated_at).getTime()
    ) {
      return digitalCardJson(
        {
          success: false,
          conflict: true,
          message: "O cartão foi alterado em outra sessão. Recarregue antes de salvar.",
        },
        409,
      );
    }

    const nextPublished = Object.prototype.hasOwnProperty.call(validation.data, "is_published")
      ? validation.data.is_published
      : current.is_published;
    const update = {
      ...validation.data,
      version: Number(current.version || 1) + 1,
      updated_at: new Date().toISOString(),
      published_at:
        nextPublished && !current.is_published
          ? new Date().toISOString()
          : nextPublished
            ? current.published_at
            : null,
    };

    let query = access.db
      .from("lawyer_digital_cards")
      .update(update)
      .eq("id", current.id)
      .eq("lawyer_id", access.profile.id);
    if (current.updated_at) query = query.eq("updated_at", current.updated_at);
    const { data: updated, error } = await query.select("*").maybeSingle();
    if (error) throw error;
    if (!updated) {
      return digitalCardJson(
        { success: false, conflict: true, message: "O cartão foi atualizado por outra sessão." },
        409,
      );
    }

    const action =
      current.is_published !== updated.is_published
        ? updated.is_published
          ? "PUBLISH_CARD"
          : "UNPUBLISH_CARD"
        : "UPDATE_CARD";
    await recordDigitalCardAudit(access, request, {
      requestId: requestId(request, body),
      cardId: updated.id,
      action,
      metadata: {
        changedFields: Object.keys(validation.data),
        previousSlug: current.slug,
        currentSlug: updated.slug,
        version: updated.version,
      },
    });

    return digitalCardJson({
      success: true,
      data: serializeDigitalCard(updated, access),
      message:
        action === "PUBLISH_CARD"
          ? "Cartão publicado com sucesso."
          : action === "UNPUBLISH_CARD"
            ? "Cartão retirado do ar."
            : "Cartão atualizado com sucesso.",
    });
  } catch (error) {
    console.error("[Cartão Digital][PUT] Erro:", error);
    const failure = digitalCardFailure(error, "Não foi possível salvar o cartão digital.");
    return digitalCardJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function POST(request) {
  try {
    if (!hasValidDigitalCardMutationOrigin(request)) {
      return digitalCardJson({ success: false, message: "Origem não autorizada." }, 403);
    }
    const access = await requireLawyerDigitalCardAccess(request);
    if (!access.ok) return access.response;
    const body = await request.json().catch(() => ({}));
    if (body.action !== "PDF_DOWNLOAD") {
      return digitalCardJson({ success: false, message: "Ação inválida." }, 400);
    }
    const ensured = await ensureDigitalCard(access);
    const minute = new Date();
    minute.setSeconds(0, 0);
    const ipHash = getRequestIpHash(request);
    const dedupeKey = crypto
      .createHash("sha256")
      .update(`${ensured.row.id}:PDF_DOWNLOAD:${ipHash}:${minute.toISOString()}`)
      .digest("hex");
    const { error } = await access.db.from("lawyer_digital_card_events").insert([
      {
        card_id: ensured.row.id,
        event_type: "PDF_DOWNLOAD",
        dedupe_key: dedupeKey,
        ip_hash: ipHash,
        user_agent: getRequestUserAgent(request),
        metadata: { version: ensured.row.version },
      },
    ]);
    if (error && error.code !== "23505") throw error;
    await recordDigitalCardAudit(access, request, {
      requestId: requestId(request, body),
      cardId: ensured.row.id,
      action: "DOWNLOAD_PDF",
      metadata: { version: ensured.row.version },
    });
    return digitalCardJson({ success: true });
  } catch (error) {
    console.error("[Cartão Digital][POST] Erro:", error);
    const failure = digitalCardFailure(error, "Não foi possível registrar o download.");
    return digitalCardJson({ success: false, message: failure.message }, failure.status);
  }
}
