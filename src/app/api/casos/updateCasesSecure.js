import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";

import {
  getCaseGovernance,
  isValidUuid,
  json,
  normalizeText,
  requireCaseUser,
  upsertCaseGovernance,
} from "./caseRouteUtils";

function normalizeExpectedDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function conflictResponse() {
  return json(
    {
      success: false,
      message:
        "Este caso foi alterado em outra sessão. Atualize o painel antes de continuar.",
    },
    409,
  );
}

async function caseStillExists(db, caseId, userId) {
  const { data } = await db
    .from("casos")
    .select("id")
    .eq("id", caseId)
    .eq("cliente_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function updateCaseContentSecure(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireCaseUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.id || "").trim();
    const expectedUpdatedAt = normalizeExpectedDate(body?.updated_at);

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }
    if (expectedUpdatedAt === undefined) {
      return json({ success: false, message: "Versão do caso inválida." }, 400);
    }

    const governance = await getCaseGovernance(access.db, caseId);
    if (governance?.legal_hold) {
      return json(
        {
          success: false,
          message:
            "O conteúdo do caso está preservado e não pode ser alterado neste momento.",
        },
        409,
      );
    }

    const title = normalizeText(body?.titulo, 180);
    const description = normalizeText(body?.descricao, 20000);
    const area = normalizeText(body?.area_atuacao, 120);
    const city = normalizeText(body?.cidade, 120);
    const state = normalizeText(body?.estado, 2).toUpperCase();

    if (!title || !description || !area || !city || state.length !== 2) {
      return json(
        {
          success: false,
          message:
            "Título, descrição, área, cidade e estado são obrigatórios.",
        },
        400,
      );
    }

    let query = access.db
      .from("casos")
      .update({
        titulo: title,
        descricao: description,
        area_atuacao: area,
        cidade: city,
        estado: state,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId)
      .eq("cliente_id", access.user.id)
      .neq("status", "CANCELADO");

    if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);

    const { data, error } = await query
      .select(
        "id, titulo, descricao, area_atuacao, cidade, estado, status, advogado_id, anexos, video_link, video_url, audio_url, created_at, updated_at",
      )
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao atualizar caso: ${error.message}`);
    }

    if (!data) {
      return (await caseStillExists(access.db, caseId, access.user.id))
        ? conflictResponse()
        : json(
            { success: false, message: "Caso não encontrado ou sem permissão." },
            404,
          );
    }

    return json({ success: true, data });
  } catch (error) {
    console.error("[Casos][PUT] Erro:", error);
    return json(
      { success: false, message: "Não foi possível atualizar o caso." },
      500,
    );
  }
}

export async function updateCaseStatusSecure(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireCaseUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.id || "").trim();
    const status = String(body?.status || "").trim().toUpperCase();
    const expectedUpdatedAt = normalizeExpectedDate(body?.updated_at);

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }
    if (expectedUpdatedAt === undefined) {
      return json({ success: false, message: "Versão do caso inválida." }, 400);
    }
    if (!["ABERTO", "FECHADO"].includes(status)) {
      return json({ success: false, message: "Status inválido." }, 400);
    }

    const governance = await getCaseGovernance(access.db, caseId);
    if (governance?.legal_hold && status !== "FECHADO") {
      return json(
        {
          success: false,
          message: "O caso está sob preservação e não pode ser reaberto.",
        },
        409,
      );
    }

    let query = access.db
      .from("casos")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", caseId)
      .eq("cliente_id", access.user.id)
      .neq("status", "CANCELADO");

    if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);

    const { data, error } = await query
      .select("id, status, updated_at")
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao atualizar status: ${error.message}`);
    }

    if (!data) {
      return (await caseStillExists(access.db, caseId, access.user.id))
        ? conflictResponse()
        : json(
            { success: false, message: "Caso não encontrado ou sem permissão." },
            404,
          );
    }

    await upsertCaseGovernance(access.db, caseId, {
      operational_stage: status === "ABERTO" ? "NEW" : "CLOSED",
      archived_at: null,
      archive_reason: null,
    });

    return json({ success: true, data });
  } catch (error) {
    console.error("[Casos][PATCH] Erro:", error);
    return json(
      { success: false, message: "Não foi possível atualizar o status." },
      500,
    );
  }
}
