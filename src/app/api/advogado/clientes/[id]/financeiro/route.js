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
  FINANCE_STATUSES,
  isClientUuid,
  validateFinancePayload,
} from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const validation = validateFinancePayload(await request.json());
    if (!validation.valid) {
      return clientJson(
        {
          success: false,
          message: "Revise o lançamento financeiro.",
          errors: validation.errors,
        },
        400,
      );
    }

    const financeId = crypto.randomUUID();
    const now = new Date().toISOString();
    const { data, error } = await access.db
      .from("crm_finance")
      .insert([
        {
          id: financeId,
          lawyer_id: access.user.id,
          client_id: client.id,
          description: validation.data.description,
          amount: validation.data.amount,
          status: validation.data.status,
          due_date: validation.data.dueDate,
          paid_at: validation.data.status === "PAGO" ? now : null,
          created_at: now,
        },
      ])
      .select(
        "id, lawyer_id, client_id, description, amount, status, due_date, paid_at, created_at",
      )
      .single();
    if (error) throw error;

    await recordClientAudit(access, request, {
      requestId: validation.data.requestId,
      clientId: client.id,
      action: "ADD_FINANCE",
      metadata: {
        finance_id: financeId,
        amount: validation.data.amount,
        status: validation.data.status,
      },
    });

    return clientJson(
      {
        success: true,
        message: "Lançamento financeiro registrado.",
        data,
      },
      201,
    );
  } catch (error) {
    console.error("[Advogado/Clientes/Financeiro][POST] Erro:", error);
    const failure = clientFailure(error, "Não foi possível salvar o lançamento.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function PATCH(request, context) {
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
    const client = await getScopedClient(access, id, "id, lawyer_id");
    if (!client) {
      return clientJson(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const body = await request.json();
    const financeId = String(body.financeId || "");
    const status = String(body.status || "").toUpperCase();
    if (!isClientUuid(financeId) || !FINANCE_STATUSES.includes(status)) {
      return clientJson(
        { success: false, message: "Atualização financeira inválida." },
        400,
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await access.db
      .from("crm_finance")
      .update({
        status,
        paid_at: status === "PAGO" ? now : null,
      })
      .eq("id", financeId)
      .eq("client_id", client.id)
      .select(
        "id, lawyer_id, client_id, description, amount, status, due_date, paid_at, created_at",
      )
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return clientJson(
        { success: false, message: "Lançamento não encontrado." },
        404,
      );
    }

    await recordClientAudit(access, request, {
      requestId: body.requestId,
      clientId: client.id,
      action: "UPDATE_FINANCE",
      metadata: { finance_id: financeId, status },
    });

    return clientJson({
      success: true,
      message: `Status atualizado para ${status}.`,
      data,
    });
  } catch (error) {
    console.error("[Advogado/Clientes/Financeiro][PATCH] Erro:", error);
    const failure = clientFailure(error, "Não foi possível atualizar o lançamento.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
