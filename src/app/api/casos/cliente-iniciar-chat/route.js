import crypto from "node:crypto";

import {
  clientJson,
  isClientUuid,
  requireClientUser,
  safeClientError,
  validateClientMutationOrigin,
} from "@/lib/clientDashboard/clientServer";
import { isPremiumPlanCurrentlyActive } from "@/lib/planUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const originResponse = validateClientMutationOrigin(request);
    if (originResponse) return originResponse;

    const access = await requireClientUser(request);
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => null);
    const caseId = String(body?.caseId || "").trim();
    const lawyerId = String(body?.lawyerId || "").trim();

    if (!isClientUuid(caseId) || !isClientUuid(lawyerId)) {
      return clientJson(
        { success: false, message: "Caso ou advogado inválido." },
        400,
      );
    }

    const [{ data: lawyer, error: lawyerError }, { data: caseItem, error: caseError }] =
      await Promise.all([
        access.db
          .from("advogados")
          .select("id, name, is_premium, premium_expires_at, plan_type, oab_verification_status")
          .eq("id", lawyerId)
          .maybeSingle(),
        access.db
          .from("casos")
          .select("id, cliente_id, titulo, advogado_id, status, updated_at")
          .eq("id", caseId)
          .eq("cliente_id", access.user.id)
          .maybeSingle(),
      ]);

    if (lawyerError) {
      throw new Error(`Falha ao consultar advogado: ${lawyerError.message}`);
    }
    if (!lawyer) {
      return clientJson(
        { success: false, message: "Advogado não encontrado." },
        404,
      );
    }
    if (!isPremiumPlanCurrentlyActive(lawyer) || lawyer.oab_verification_status === "ERROR") {
      return clientJson(
        {
          success: false,
          message: "Este advogado não aceita contatos diretos no momento.",
        },
        403,
      );
    }

    if (caseError) {
      throw new Error(`Falha ao consultar caso: ${caseError.message}`);
    }
    if (!caseItem) {
      return clientJson(
        { success: false, message: "Caso não encontrado ou sem permissão." },
        404,
      );
    }

    if (caseItem.advogado_id) {
      if (caseItem.advogado_id === lawyerId) {
        return clientJson({
          success: true,
          message: "Você já está em contato com este advogado.",
          data: { caseId },
        });
      }
      return clientJson(
        { success: false, message: "Este caso já possui um advogado vinculado." },
        409,
      );
    }

    if (!["ABERTO", "NEGOCIANDO"].includes(caseItem.status)) {
      return clientJson(
        {
          success: false,
          message: "Este caso não está disponível para iniciar um novo contato.",
        },
        409,
      );
    }

    const now = new Date().toISOString();
    const { data: updatedCase, error: updateError } = await access.db
      .from("casos")
      .update({
        advogado_id: lawyerId,
        status: "EM_ANDAMENTO",
        chat_started: true,
        updated_at: now,
      })
      .eq("id", caseId)
      .eq("cliente_id", access.user.id)
      .is("advogado_id", null)
      .in("status", ["ABERTO", "NEGOCIANDO"])
      .eq("updated_at", caseItem.updated_at)
      .select("id, advogado_id, status, updated_at")
      .maybeSingle();

    if (updateError) {
      throw new Error(`Falha ao vincular advogado: ${updateError.message}`);
    }
    if (!updatedCase) {
      return clientJson(
        {
          success: false,
          message:
            "O caso foi alterado em outra sessão. Atualize o painel e tente novamente.",
        },
        409,
      );
    }

    const notification = {
      id: crypto.randomUUID(),
      user_id: lawyerId,
      titulo: "Novo chat iniciado por cliente",
      mensagem: `Um cliente iniciou um contato direto sobre o caso “${caseItem.titulo}”.`,
      lida: false,
      created_at: now,
      tipo: "CHAT_INICIADO",
      meta: JSON.stringify({ case_id: caseId }),
    };

    const { error: notificationError } = await access.db
      .from("notificacoes")
      .insert([notification]);

    if (notificationError) {
      console.error(
        "[Cliente/Chat] Vínculo criado, mas a notificação falhou:",
        notificationError.message,
      );
    }

    return clientJson({
      success: true,
      message: "Chat iniciado com sucesso.",
      data: updatedCase,
    });
  } catch (error) {
    return safeClientError(error, "Não foi possível iniciar o contato.");
  }
}
