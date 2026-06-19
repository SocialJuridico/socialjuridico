import crypto from "node:crypto";

import {
  clientFailure,
  clientJson,
  recordClientAudit,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import { getProcessFolder } from "@/lib/lawyerProcesses/processServer";
import { isUuid } from "@/lib/lawyerProcesses/processValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  try {
    const access = await requireLawyerClientAccess(request, { requirePro: true });
    if (!access.ok) return access.response;

    const { id } = await context.params;
    if (!isUuid(id)) {
      return clientJson({ success: false, message: "Processo inválido." }, 400);
    }

    const folder = await getProcessFolder(access, id);
    if (!folder) {
      return clientJson({ success: false, message: "Processo não encontrado." }, 404);
    }

    return clientJson({ success: true, data: folder });
  } catch (error) {
    console.error("[Advogado/Processos/Detalhe][GET] Erro:", error);
    const failure = clientFailure(error, "Não foi possível carregar o processo.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}

export async function DELETE(request, context) {
  try {
    const access = await requireLawyerClientAccess(request, { requirePro: true });
    if (!access.ok) return access.response;

    const { id } = await context.params;
    if (!isUuid(id)) {
      return clientJson({ success: false, message: "Processo inválido." }, 400);
    }

    // Buscar o processo para validar pertencimento ao advogado/escritório
    const { data: process, error: processError } = await access.db
      .from("lawyer_processes")
      .select("id, client_id, numero_cnj")
      .eq("id", id)
      .in("lawyer_id", access.lawyerIds)
      .maybeSingle();

    if (processError) throw processError;
    if (!process) {
      return clientJson({ success: false, message: "Processo não encontrado ou sem permissão." }, 404);
    }

    // Excluir dependências sequencialmente
    const { error: warningsError } = await access.db
      .from("lawyer_process_warnings")
      .delete()
      .eq("process_id", id);
    if (warningsError) throw warningsError;

    const { error: movementsError } = await access.db
      .from("lawyer_process_movements")
      .delete()
      .eq("process_id", id);
    if (movementsError) throw movementsError;

    const { error: partiesError } = await access.db
      .from("lawyer_process_parties")
      .delete()
      .eq("process_id", id);
    if (partiesError) throw partiesError;

    const { error: deleteError } = await access.db
      .from("lawyer_processes")
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;

    // Registrar interações de auditoria e logs de forma segura (sem interromper a exclusão caso falhem)
    if (process.client_id) {
      try {
        await access.db.from("crm_interactions").insert([
          {
            id: crypto.randomUUID(),
            lawyer_id: access.user.id,
            client_id: process.client_id,
            content: `Processo nº ${process.numero_cnj} removido do sistema.`,
            type: "auditoria",
            created_at: new Date().toISOString(),
          },
        ]);

        await recordClientAudit(access, request, {
          clientId: process.client_id,
          action: "UPDATE_CLIENT",
          metadata: {
            process_id: id,
            numero_cnj: process.numero_cnj,
            action_detail: "DELETE_PROCESS_DATAJUD",
          },
        });
      } catch (auditError) {
        console.warn("[DELETE_PROCESS][Audit] Falha ao registrar log de exclusão:", auditError);
      }
    }

    return clientJson({ success: true, message: "Processo excluído com sucesso." });
  } catch (error) {
    console.error("[Advogado/Processos/Detalhe][DELETE] Erro:", error);
    const failure = clientFailure(error, "Não foi possível excluir o processo.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}

