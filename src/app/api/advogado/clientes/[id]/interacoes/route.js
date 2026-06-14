import crypto from "node:crypto";

import {
  clientFailure,
  clientJson,
  getScopedClient,
  hasValidClientMutationOrigin,
  recordClientAudit,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import {
  SCHEDULABLE_INTERACTION_TYPES,
  validateInteractionPayload,
} from "@/lib/lawyerClients/clientValidation";
import {
  agendaFailure,
  getScopedAgendaItem,
  recordAgendaAudit,
  requireLawyerAgendaAccess,
  reserveAgendaItem,
} from "@/lib/lawyerAgenda/agendaServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toAgendaType(interactionType) {
  if (interactionType === "reunião") return "REUNIAO";
  if (interactionType === "ligação") return "TAREFA";
  return "OUTRO";
}

function buildAgendaTitle(interactionType, clientName) {
  if (interactionType === "reunião") return `Reunião com ${clientName}`;
  if (interactionType === "ligação") return `Ligação com ${clientName}`;
  return `Compromisso com ${clientName}`;
}

async function createAgendaItemForInteraction(request, client, interaction) {
  if (!SCHEDULABLE_INTERACTION_TYPES.includes(interaction.type)) return null;

  try {
    const agendaAccess = await requireLawyerAgendaAccess(request);
    if (!agendaAccess.ok) {
      const error = new Error("Não foi possível acessar a Agenda para criar o compromisso.");
      error.status = 403;
      throw error;
    }

    const requestId = interaction.requestId || crypto.randomUUID();
    const start = new Date(interaction.scheduledAt);
    const reservation = await reserveAgendaItem(agendaAccess, {
      requestId,
      lawyerId: client.lawyer_id || agendaAccess.user.id,
      clientId: client.id,
      title: buildAgendaTitle(interaction.type, client.name),
      description: interaction.content,
      date: start.toISOString(),
      endDate: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      type: toAgendaType(interaction.type),
      urgency: "MEDIUM",
      status: "PENDING",
    });

    if (!reservation.success) {
      const error = new Error(
        reservation.code === "QUOTA_EXCEEDED"
          ? "O limite mensal da agenda foi atingido."
          : "Não foi possível criar o compromisso na agenda.",
      );
      error.status = reservation.httpStatus || 400;
      error.code = reservation.code;
      throw error;
    }

    const agendaItem = await getScopedAgendaItem(agendaAccess, reservation.item_id);
    if (!agendaItem) return null;

    await recordAgendaAudit(agendaAccess, request, {
      requestId,
      itemId: agendaItem.id,
      lawyerId: agendaItem.lawyer_id,
      action: "CREATE_ITEM",
      metadata: {
        source: "CRM_INTERACTION",
        interactionType: interaction.type,
        clientId: client.id,
        reused: reservation.reused === true,
      },
    });

    return {
      id: agendaItem.id,
      title: agendaItem.title,
      date: agendaItem.date,
      type: agendaItem.type,
      status: agendaItem.status,
      reused: reservation.reused === true,
    };
  } catch (error) {
    const failure = agendaFailure(
      error,
      "Não foi possível criar o compromisso na agenda.",
    );
    const agendaError = new Error(failure.message);
    agendaError.status = failure.status;
    agendaError.code = error?.code || null;
    throw agendaError;
  }
}

export async function POST(request, context) {
  try {
    if (!hasValidClientMutationOrigin(request)) {
      return clientJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;

    const { id } = await context.params;
    const client = await getScopedClient(access, id, "id, lawyer_id, name");
    if (!client) {
      return clientJson(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const validation = validateInteractionPayload(await request.json());
    if (!validation.valid) {
      return clientJson(
        {
          success: false,
          message: "Revise a interação.",
          errors: validation.errors,
        },
        400,
      );
    }

    const agendaItem = await createAgendaItemForInteraction(
      request,
      client,
      validation.data,
    );

    const interactionId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data, error } = await access.db
      .from("crm_interactions")
      .insert([
        {
          id: interactionId,
          lawyer_id: access.user.id,
          client_id: client.id,
          content: validation.data.content,
          type: validation.data.type,
          created_at: now,
        },
      ])
      .select("id, lawyer_id, client_id, content, type, created_at")
      .single();
    if (error) throw error;

    await recordClientAudit(access, request, {
      requestId: validation.data.requestId,
      clientId: client.id,
      action: "ADD_INTERACTION",
      metadata: {
        interaction_id: interactionId,
        type: validation.data.type,
        agenda_item_id: agendaItem?.id || null,
      },
    });

    return clientJson(
      {
        success: true,
        message: agendaItem
          ? "Interação registrada e compromisso criado na agenda."
          : "Interação registrada.",
        data: { ...data, agendaItem },
      },
      201,
    );
  } catch (error) {
    console.error("[Advogado/Clientes/Interações] Erro:", {
      message: error?.message,
      code: error?.code,
      status: error?.status,
    });
    const failure = clientFailure(error, "Não foi possível registrar a interação.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
