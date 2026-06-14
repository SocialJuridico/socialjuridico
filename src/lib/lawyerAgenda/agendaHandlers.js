import crypto from "node:crypto";

import {
  buildAgendaMetrics,
  isAgendaUuid,
  matchesAgendaFilters,
  normalizeAgendaQuery,
  validateAgendaMutation,
} from "./agendaValidation";
import {
  agendaFailure,
  agendaJson,
  canMutateAgendaItem,
  deleteAgendaItemFromGoogle,
  getScopedAgendaItem,
  hasValidAgendaMutationOrigin,
  recordAgendaAudit,
  requireLawyerAgendaAccess,
  reserveAgendaItem,
  resolveAgendaAssignee,
  scopeAgendaQuery,
  serializeAgendaItem,
  syncAgendaItemToGoogle,
  validateAgendaClient,
} from "./agendaServer";

function getRequestId(request, body = {}) {
  const candidate =
    body.requestId ||
    body.request_id ||
    request.headers.get("x-idempotency-key") ||
    request.headers.get("x-request-id");
  return isAgendaUuid(candidate) ? String(candidate) : crypto.randomUUID();
}

function reservationMessage(code) {
  const messages = {
    INVALID_REQUEST: "Os dados do compromisso são inválidos.",
    ACTOR_NOT_FOUND: "O perfil autenticado não foi encontrado.",
    ASSIGNEE_NOT_FOUND: "O responsável selecionado não foi encontrado.",
    ASSIGNEE_BLOCKED: "O responsável selecionado está com o acesso suspenso.",
    OFFICE_NOT_FOUND: "O escritório informado não foi encontrado.",
    ACCOUNT_BLOCKED: "Acesso suspenso por inconsistências na verificação da OAB.",
    OFFICE_SCOPE_MISMATCH: "O perfil não pertence ao escritório informado.",
    ASSIGNEE_SCOPE_MISMATCH: "O responsável não pertence ao mesmo escritório.",
    ASSIGNMENT_FORBIDDEN: "Você não pode atribuir compromissos a outro usuário.",
    UPGRADE_REQUIRED: "A Agenda & Prazos está disponível nos planos START, PRO e Enterprise.",
    OFFICE_PLAN_REQUIRED: "O escritório precisa de um plano Enterprise ativo.",
    QUOTA_EXCEEDED: "O limite mensal de registros da agenda foi atingido.",
  };
  return messages[code] || "Não foi possível reservar este compromisso.";
}

function toLegacyAgendaItem(item) {
  const urgencyLabels = { LOW: "Baixa", MEDIUM: "Média", HIGH: "Alta" };
  const typeLabels = {
    PRAZO: "Judicial",
    AUDIENCIA: "Audiência",
    REUNIAO: "Reunião",
    TAREFA: "Tarefa",
    OUTRO: "Outro",
  };
  return {
    id: item.id,
    request_id: item.requestId,
    lawyer_id: item.lawyerId,
    lawyer_name: item.lawyerName,
    title: item.title,
    description: item.description,
    date: item.date,
    end_date: item.endDate,
    type: typeLabels[item.type] || item.type,
    urgency: urgencyLabels[item.urgency] || item.urgency,
    client_id: item.clientId,
    client_name: item.clientName,
    status: item.status,
    google_event_id: item.googleSynced ? "SYNCED" : null,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    completed_at: item.completedAt,
  };
}

async function loadAgendaMaps(access, items = []) {
  const memberMap = new Map((access.members || []).map((member) => [member.id, member]));
  const clientIds = [...new Set(items.map((item) => item.client_id).filter(Boolean))];
  const clientMap = new Map();

  if (clientIds.length > 0) {
    let query = access.db
      .from("crm_clients")
      .select("id, name, email, lawyer_id")
      .in("id", clientIds.slice(0, 1000));
    query = access.lawyerIds.length === 1
      ? query.eq("lawyer_id", access.lawyerIds[0])
      : query.in("lawyer_id", access.lawyerIds);
    const result = await query;
    if (result.error) throw result.error;
    for (const client of result.data || []) clientMap.set(client.id, client);
  }

  return { memberMap, clientMap };
}

async function loadAgendaClients(access) {
  let query = access.db
    .from("crm_clients")
    .select("id, name, email, lawyer_id")
    .order("name", { ascending: true })
    .limit(500);
  query = access.lawyerIds.length === 1
    ? query.eq("lawyer_id", access.lawyerIds[0])
    : query.in("lawyer_id", access.lawyerIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email || "",
    lawyerId: client.lawyer_id,
  }));
}

export async function handleAgendaGet(request) {
  try {
    const access = await requireLawyerAgendaAccess(request);
    if (!access.ok) return access.response;

    const filters = normalizeAgendaQuery(new URL(request.url).searchParams);
    let query = access.db
      .from("agenda_items")
      .select(
        "id, request_id, lawyer_id, title, description, date, end_date, type, urgency, client_id, status, google_event_id, created_at, updated_at, completed_at, deleted_at",
      )
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .limit(1000);
    query = scopeAgendaQuery(query, access.lawyerIds);
    if (filters.from) query = query.gte("date", filters.from);
    if (filters.to) query = query.lte("date", filters.to);

    const [itemsResult, clients] = await Promise.all([query, loadAgendaClients(access)]);
    if (itemsResult.error) throw itemsResult.error;

    const rows = itemsResult.data || [];
    const maps = await loadAgendaMaps(access, rows);
    const allItems = rows.map((item) => serializeAgendaItem(item, access, maps));
    const filtered = allItems.filter((item) => matchesAgendaFilters(item, filters));
    const total = filtered.length;
    const from = (filters.page - 1) * filters.pageSize;
    const maxAgenda = access.planLimits?.maxAgenda;
    const usedAgenda = Number(access.planLimits?.usedAgenda || 0);

    const pageItems = filtered.slice(from, from + filters.pageSize);
    const members = (access.members || []).map((member) => ({
      id: member.id,
      name: member.name,
      cargo: member.cargo || "advogado",
    }));

    return agendaJson({
      success: true,
      data: pageItems,
      agenda: pageItems.map(toLegacyAgendaItem),
      metrics: buildAgendaMetrics(allItems),
      members,
      membros: members,
      clients,
      governance: {
        officeId: access.officeId,
        actorType: access.actorType,
        currentLawyerId: access.actorId,
        canManageOffice: access.canManageOffice,
        googleSyncEnabled: access.googleSyncEnabled,
        googleSyncAvailable: access.googleSyncAvailable,
        planType: access.planType,
        quota: {
          used: usedAgenda,
          max: Number.isFinite(maxAgenda) ? maxAgenda : null,
          remaining: Number.isFinite(maxAgenda) ? Math.max(0, maxAgenda - usedAgenda) : null,
          unlimited: !Number.isFinite(maxAgenda),
        },
      },
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
      },
    });
  } catch (error) {
    console.error("[Advogado/Agenda][GET] Erro:", error);
    const failure = agendaFailure(error, "Não foi possível carregar a agenda.");
    return agendaJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function handleAgendaPost(request) {
  try {
    if (!hasValidAgendaMutationOrigin(request)) {
      return agendaJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requireLawyerAgendaAccess(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const validation = validateAgendaMutation(body);
    if (!validation.success) {
      return agendaJson(
        { success: false, message: "Revise os campos informados.", errors: validation.errors },
        400,
      );
    }

    const requestId = getRequestId(request, body);
    const lawyerId = resolveAgendaAssignee(access, validation.data.lawyerId);
    await validateAgendaClient(access, validation.data.clientId);
    const payload = {
      ...validation.data,
      requestId,
      lawyerId,
      clientId: validation.data.clientId ?? null,
      endDate:
        validation.data.endDate ||
        new Date(new Date(validation.data.date).getTime() + 60 * 60 * 1000).toISOString(),
    };

    const reservation = await reserveAgendaItem(access, payload);
    if (!reservation.success) {
      return agendaJson(
        {
          success: false,
          message: reservationMessage(reservation.code),
          code: reservation.code,
          quotaExceeded: reservation.code === "QUOTA_EXCEEDED",
        },
        reservation.httpStatus,
      );
    }

    const item = await getScopedAgendaItem(access, reservation.item_id);
    if (!item) throw new Error("Compromisso reservado não foi encontrado.");

    await recordAgendaAudit(access, request, {
      requestId,
      itemId: item.id,
      lawyerId: item.lawyer_id,
      action: "CREATE_ITEM",
      metadata: {
        reused: reservation.reused === true,
        type: item.type,
        urgency: item.urgency,
        clientId: item.client_id,
      },
    });

    let googleSync = { synced: false, reason: "NOT_CONNECTED" };
    if (!reservation.reused) {
      try {
        googleSync = await syncAgendaItemToGoogle(access, item);
        if (googleSync.synced) {
          await recordAgendaAudit(access, request, {
            requestId: crypto.randomUUID(),
            itemId: item.id,
            lawyerId: item.lawyer_id,
            action: "SYNC_GOOGLE",
            metadata: { operation: "CREATE" },
          });
        }
      } catch (syncError) {
        console.error("[Advogado/Agenda][POST][Google] Erro não bloqueante:", syncError);
        googleSync = { synced: false, reason: "SYNC_FAILED" };
      }
    }

    const refreshed = (await getScopedAgendaItem(access, item.id)) || item;
    const maps = await loadAgendaMaps(access, [refreshed]);
    return agendaJson(
      {
        success: true,
        reused: reservation.reused === true,
        data: serializeAgendaItem(refreshed, access, maps),
        googleSync,
      },
      reservation.reused ? 200 : 201,
    );
  } catch (error) {
    console.error("[Advogado/Agenda][POST] Erro:", error);
    const failure = agendaFailure(error, "Não foi possível criar o compromisso.");
    return agendaJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function handleAgendaPatch(request, explicitItemId = null) {
  try {
    if (!hasValidAgendaMutationOrigin(request)) {
      return agendaJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requireLawyerAgendaAccess(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const itemId = explicitItemId || body.id || body.itemId;
    if (!isAgendaUuid(itemId)) {
      return agendaJson({ success: false, message: "Compromisso inválido." }, 400);
    }
    const current = await getScopedAgendaItem(access, itemId);
    if (!current) {
      return agendaJson({ success: false, message: "Compromisso não encontrado." }, 404);
    }
    if (!canMutateAgendaItem(access, current.lawyer_id)) {
      return agendaJson(
        { success: false, message: "Você não possui permissão para alterar este compromisso." },
        403,
      );
    }
    const expectedUpdatedAt = body.updatedAt || body.updated_at;
    if (
      expectedUpdatedAt &&
      current.updated_at &&
      new Date(expectedUpdatedAt).getTime() !== new Date(current.updated_at).getTime()
    ) {
      return agendaJson(
        {
          success: false,
          conflict: true,
          message: "Este compromisso foi atualizado em outra sessão. Recarregue a agenda.",
        },
        409,
      );
    }

    const validation = validateAgendaMutation(body, { partial: true });
    if (!validation.success) {
      return agendaJson(
        { success: false, message: "Revise os campos informados.", errors: validation.errors },
        400,
      );
    }

    const nextLawyerId = validation.data.lawyerId
      ? resolveAgendaAssignee(access, validation.data.lawyerId)
      : current.lawyer_id;
    if (validation.data.clientId !== undefined) {
      await validateAgendaClient(access, validation.data.clientId);
    }

    const update = {
      updated_by: access.actorId,
      updated_by_office_id: access.actorOfficeId,
      updated_at: new Date().toISOString(),
    };
    const fieldMap = {
      title: "title",
      description: "description",
      date: "date",
      endDate: "end_date",
      type: "type",
      urgency: "urgency",
      status: "status",
      clientId: "client_id",
    };
    for (const [sourceKey, targetKey] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(validation.data, sourceKey)) {
        update[targetKey] = validation.data[sourceKey];
      }
    }
    update.lawyer_id = nextLawyerId;
    if (validation.data.status === "COMPLETED") update.completed_at = new Date().toISOString();
    if (validation.data.status && validation.data.status !== "COMPLETED") update.completed_at = null;

    if (nextLawyerId !== current.lawyer_id && current.google_event_id) {
      try {
        await deleteAgendaItemFromGoogle(access, current);
      } catch (syncError) {
        console.error("[Advogado/Agenda][PATCH][Reassign Google] Erro não bloqueante:", syncError);
      }
      update.google_event_id = null;
    }

    let updateQuery = access.db
      .from("agenda_items")
      .update(update)
      .eq("id", current.id)
      .is("deleted_at", null);
    if (current.updated_at) updateQuery = updateQuery.eq("updated_at", current.updated_at);
    const { data: updated, error } = await updateQuery.select("*").maybeSingle();
    if (error) throw error;
    if (!updated) {
      return agendaJson({ success: false, message: "O compromisso foi alterado por outra sessão." }, 409);
    }

    const requestId = getRequestId(request, body);
    const action =
      validation.data.status === "COMPLETED"
        ? "COMPLETE_ITEM"
        : validation.data.status === "CANCELLED"
          ? "CANCEL_ITEM"
          : "UPDATE_ITEM";
    await recordAgendaAudit(access, request, {
      requestId,
      itemId: updated.id,
      lawyerId: updated.lawyer_id,
      action,
      metadata: {
        previousLawyerId: current.lawyer_id,
        changedFields: Object.keys(update).filter(
          (field) => !["updated_by", "updated_by_office_id", "updated_at"].includes(field),
        ),
      },
    });

    let googleSync = { synced: false, reason: "NOT_CONNECTED" };
    let responseItem = updated;
    try {
      if (updated.status === "CANCELLED") {
        const googleDelete = await deleteAgendaItemFromGoogle(access, {
          ...updated,
          google_event_id: updated.google_event_id || current.google_event_id,
        });
        if (googleDelete.deleted) {
          const { error: clearError } = await access.db
            .from("agenda_items")
            .update({ google_event_id: null })
            .eq("id", updated.id);
          if (clearError) throw clearError;
          responseItem = { ...updated, google_event_id: null };
          googleSync = { synced: false, reason: "CANCELLED_AND_REMOVED" };
        }
      } else {
        googleSync = await syncAgendaItemToGoogle(access, updated);
        if (googleSync.synced) {
          responseItem = { ...updated, google_event_id: googleSync.googleEventId };
          await recordAgendaAudit(access, request, {
            requestId: crypto.randomUUID(),
            itemId: updated.id,
            lawyerId: updated.lawyer_id,
            action: "SYNC_GOOGLE",
            metadata: { operation: "UPDATE" },
          });
        }
      }
    } catch (syncError) {
      console.error("[Advogado/Agenda][PATCH][Google] Erro não bloqueante:", syncError);
      googleSync = { synced: false, reason: "SYNC_FAILED" };
    }

    const maps = await loadAgendaMaps(access, [responseItem]);
    return agendaJson({
      success: true,
      data: serializeAgendaItem(responseItem, access, maps),
      googleSync,
    });
  } catch (error) {
    console.error("[Advogado/Agenda][PATCH] Erro:", error);
    const failure = agendaFailure(error, "Não foi possível atualizar o compromisso.");
    return agendaJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function handleAgendaDelete(request, explicitItemId = null) {
  try {
    if (!hasValidAgendaMutationOrigin(request)) {
      return agendaJson({ success: false, message: "Origem da requisição não autorizada." }, 403);
    }
    const access = await requireLawyerAgendaAccess(request);
    if (!access.ok) return access.response;

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const itemId =
      explicitItemId ||
      url.searchParams.get("id") ||
      url.searchParams.get("itemId") ||
      body.id ||
      body.itemId;
    if (!isAgendaUuid(itemId)) {
      return agendaJson({ success: false, message: "Compromisso inválido." }, 400);
    }
    const current = await getScopedAgendaItem(access, itemId);
    if (!current) {
      return agendaJson({ success: false, message: "Compromisso não encontrado." }, 404);
    }
    if (!canMutateAgendaItem(access, current.lawyer_id)) {
      return agendaJson(
        { success: false, message: "Você não possui permissão para excluir este compromisso." },
        403,
      );
    }

    const deletedAt = new Date().toISOString();
    const { data: deleted, error } = await access.db
      .from("agenda_items")
      .update({
        deleted_at: deletedAt,
        updated_at: deletedAt,
        updated_by: access.actorId,
        updated_by_office_id: access.actorOfficeId,
        status: "CANCELLED",
      })
      .eq("id", current.id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!deleted) {
      return agendaJson({ success: false, message: "O compromisso já foi removido." }, 409);
    }

    const requestId = getRequestId(request, body);
    await recordAgendaAudit(access, request, {
      requestId,
      itemId: current.id,
      lawyerId: current.lawyer_id,
      action: "DELETE_ITEM",
      metadata: { title: current.title, googleEventId: current.google_event_id || null },
    });

    let googleDelete = { deleted: false, reason: "NOT_SYNCED" };
    try {
      googleDelete = await deleteAgendaItemFromGoogle(access, current);
    } catch (syncError) {
      console.error("[Advogado/Agenda][DELETE][Google] Erro não bloqueante:", syncError);
      googleDelete = { deleted: false, reason: "SYNC_FAILED" };
    }

    return agendaJson({ success: true, deletedAt, googleDelete });
  } catch (error) {
    console.error("[Advogado/Agenda][DELETE] Erro:", error);
    const failure = agendaFailure(error, "Não foi possível excluir o compromisso.");
    return agendaJson({ success: false, message: failure.message }, failure.status);
  }
}
