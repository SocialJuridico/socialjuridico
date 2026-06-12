import {
  getCaseGovernance,
  isValidUuid,
  json,
  normalizeText,
  requireCaseUser,
  upsertCaseGovernance,
} from "./caseRouteUtils";

export async function updateCaseContent(request) {
  try {
    const access = await requireCaseUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.id || "").trim();

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
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
    const state = normalizeText(body?.estado, 40);

    if (!title || !description || !area || !city || !state) {
      return json(
        {
          success: false,
          message:
            "Título, descrição, área, cidade e estado são obrigatórios.",
        },
        400,
      );
    }

    const { data, error } = await access.db
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
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao atualizar caso: ${error.message}`);
    }

    if (!data) {
      return json(
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

export async function updateCaseStatus(request) {
  try {
    const access = await requireCaseUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.id || "").trim();
    const status = String(body?.status || "").trim().toUpperCase();

    if (!isValidUuid(caseId)) {
      return json({ success: false, message: "Caso inválido." }, 400);
    }

    if (!["ABERTO", "FECHADO", "CANCELADO"].includes(status)) {
      return json({ success: false, message: "Status inválido." }, 400);
    }

    const { data, error } = await access.db
      .from("casos")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId)
      .eq("cliente_id", access.user.id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao atualizar status: ${error.message}`);
    }

    if (!data) {
      return json(
        { success: false, message: "Caso não encontrado ou sem permissão." },
        404,
      );
    }

    const currentGovernance = await getCaseGovernance(access.db, caseId);
    const cancelled = status === "CANCELADO";

    await upsertCaseGovernance(access.db, caseId, {
      operational_stage:
        status === "ABERTO"
          ? "NEW"
          : status === "FECHADO"
            ? "CLOSED"
            : "ARCHIVED",
      archived_at: cancelled && !currentGovernance?.legal_hold
        ? new Date().toISOString()
        : null,
      archive_reason: cancelled
        ? "Caso cancelado pelo titular por meio da área do cliente."
        : null,
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
