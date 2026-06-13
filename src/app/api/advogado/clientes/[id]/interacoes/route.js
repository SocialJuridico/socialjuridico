import crypto from "node:crypto";

import {
  clientFailure,
  clientJson,
  getScopedClient,
  hasValidClientMutationOrigin,
  recordClientAudit,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import { validateInteractionPayload } from "@/lib/lawyerClients/clientValidation";

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
      metadata: { interaction_id: interactionId, type: validation.data.type },
    });

    return clientJson(
      {
        success: true,
        message: "Interação registrada.",
        data,
      },
      201,
    );
  } catch (error) {
    console.error("[Advogado/Clientes/Interações] Erro:", error);
    const failure = clientFailure(error, "Não foi possível registrar a interação.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
