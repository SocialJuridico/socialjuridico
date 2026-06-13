import {
  clientFailure,
  clientJson,
  getScopedClient,
  hasValidClientMutationOrigin,
  recordClientAudit,
  requireLawyerClientAccess,
  serializeClientDetail,
} from "@/lib/lawyerClients/clientServer";
import {
  isClientUuid,
  normalizeClientText,
  validateClientPayload,
} from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function findAssociatedCases(access, client) {
  let publicClientId = null;
  if (client.email) {
    const { data } = await access.db
      .from("clientes")
      .select("id")
      .eq("email", client.email)
      .maybeSingle();
    publicClientId = data?.id || null;
  }
  if (!publicClientId && client.cpf_cnpj) {
    const { data } = await access.db
      .from("clientes")
      .select("id")
      .eq("cpf_cnpj", client.cpf_cnpj)
      .maybeSingle();
    publicClientId = data?.id || null;
  }
  if (!publicClientId) return [];

  const { data, error } = await access.db
    .from("casos")
    .select("id, titulo, area_atuacao, status, created_at, advogado_id")
    .eq("cliente_id", publicClientId)
    .eq("advogado_id", client.lawyer_id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

export async function GET(request, context) {
  try {
    const access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;

    const { id } = await context.params;
    const client = await getScopedClient(access, id);
    if (!client) {
      return clientJson(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const [interactions, finance, documents, cases] = await Promise.all([
      access.db
        .from("crm_interactions")
        .select("id, lawyer_id, client_id, content, type, created_at")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(100),
      access.db
        .from("crm_finance")
        .select(
          "id, lawyer_id, client_id, description, amount, status, due_date, paid_at, created_at",
        )
        .eq("client_id", client.id)
        .order("due_date", { ascending: true })
        .limit(100),
      access.db
        .from("crm_documents")
        .select(
          "id, lawyer_id, client_id, file_name, doc_type, tags, is_blindado, hash_sha512, created_at",
        )
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(100),
      findAssociatedCases(access, client),
    ]);

    for (const result of [interactions, finance, documents]) {
      if (result.error) throw result.error;
    }

    const memberMap = new Map(access.members.map((member) => [member.id, member]));
    return clientJson({
      success: true,
      data: {
        client: serializeClientDetail(client, memberMap),
        interactions: interactions.data || [],
        finance: finance.data || [],
        documents: (documents.data || []).map((document) => ({
          id: document.id,
          fileName: document.file_name,
          fileUrl: `/api/advogado/clientes/${client.id}/documentos/${document.id}/arquivo`,
          documentType: document.doc_type || "Outros",
          tags: document.tags || [],
          protected: Boolean(document.is_blindado),
          hash: document.hash_sha512 || null,
          createdAt: document.created_at,
        })),
        cases,
      },
      permissions: {
        canDelegate: access.canDelegate,
        canProtectDocument:
          access.planType === "PRO" || Number(access.profile.balance || 0) >= 3,
      },
    });
  } catch (error) {
    console.error("[Advogado/Clientes/Dossiê][GET] Erro:", error);
    const failure = clientFailure(error, "Não foi possível carregar o dossiê.");
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
    const client = await getScopedClient(access, id);
    if (!client) {
      return clientJson(
        { success: false, message: "Cliente não encontrado." },
        404,
      );
    }

    const body = await request.json();
    const requestId = normalizeClientText(body.requestId, 36);
    const action = body.action === "delegate" ? "delegate" : "update";

    if (action === "delegate") {
      if (!access.canDelegate) {
        return clientJson(
          {
            success: false,
            message: "Somente gestores podem delegar clientes.",
          },
          403,
        );
      }
      const targetLawyerId = String(body.lawyerId || "");
      if (
        !isClientUuid(targetLawyerId) ||
        !access.members.some((member) => member.id === targetLawyerId)
      ) {
        return clientJson(
          { success: false, message: "Responsável de destino inválido." },
          400,
        );
      }

      const { data, error } = await access.db
        .from("crm_clients")
        .update({ lawyer_id: targetLawyerId, updated_at: new Date().toISOString() })
        .eq("id", client.id)
        .eq("lawyer_id", client.lawyer_id)
        .select("*")
        .single();
      if (error) throw error;

      if (targetLawyerId !== client.lawyer_id) {
        const { error: notificationError } = await access.db
          .from("notificacoes")
          .insert([
            {
              user_id: targetLawyerId,
              titulo: "🤝 Novo cliente designado",
              mensagem: `Você foi designado como responsável por ${client.name}.`,
              tipo: "case_assigned",
              lida: false,
              meta: JSON.stringify({ client_id: client.id, client_name: client.name }),
              created_at: new Date().toISOString(),
            },
          ]);
        if (notificationError) {
          console.error("[CRM/Delegação] Falha na notificação:", notificationError);
        }
      }

      await recordClientAudit(access, request, {
        requestId,
        clientId: client.id,
        action: "DELEGATE_CLIENT",
        metadata: { from: client.lawyer_id, to: targetLawyerId },
      });

      const memberMap = new Map(access.members.map((member) => [member.id, member]));
      return clientJson({
        success: true,
        message: "Cliente delegado e responsável notificado.",
        data: serializeClientDetail(data, memberMap),
      });
    }

    const validation = validateClientPayload(body, { partial: true });
    if (!validation.valid) {
      return clientJson(
        {
          success: false,
          message: "Revise os dados do cliente.",
          errors: validation.errors,
        },
        400,
      );
    }
    const payload = validation.data;
    const updateFields = {
      name: payload.name,
      type: payload.type,
      cpf_cnpj: payload.cpfCnpj || null,
      rg: payload.rg || null,
      civil_status: payload.civilStatus || null,
      profession: payload.profession || null,
      phone: payload.phone || null,
      address: payload.address || null,
      email: payload.email || null,
      notes: payload.notes || null,
      status: payload.status,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await access.db
      .from("crm_clients")
      .update(updateFields)
      .eq("id", client.id)
      .eq("lawyer_id", client.lawyer_id)
      .select("*")
      .single();
    if (error) throw error;

    await recordClientAudit(access, request, {
      requestId,
      clientId: client.id,
      action: "UPDATE_CLIENT",
      metadata: {
        fields: Object.keys(updateFields).filter((field) => field !== "updated_at"),
      },
    });

    const memberMap = new Map(access.members.map((member) => [member.id, member]));
    return clientJson({
      success: true,
      message: "Dados do cliente atualizados.",
      data: serializeClientDetail(data, memberMap),
    });
  } catch (error) {
    console.error("[Advogado/Clientes][PATCH] Erro:", error);
    const failure = clientFailure(error, "Não foi possível atualizar o cliente.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
