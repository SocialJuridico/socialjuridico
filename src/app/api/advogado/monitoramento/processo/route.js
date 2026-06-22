import crypto from "node:crypto";
import {
  clientJson,
  clientFailure,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import {
  callExternalProcessApi,
  saveLocalProcessFromExternal,
  serializeProcessListItem,
} from "@/lib/lawyerProcesses/processServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const access = await requireLawyerClientAccess(request, { requirePro: true });
    if (!access.ok) return access.response;

    const body = await request.json().catch(() => ({}));
    const { action, id } = body;

    if (!id) {
      return clientJson({ success: false, message: "ID do processo OAB é obrigatório." }, 400);
    }

    // Retrieve OAB process record
    const { data: oabProcess, error: selectError } = await access.db
      .from("lawyer_oab_processes")
      .select("*")
      .eq("id", id)
      .eq("lawyer_id", access.profile.id)
      .maybeSingle();

    if (selectError) throw selectError;
    if (!oabProcess) {
      return clientJson({ success: false, message: "Processo OAB não encontrado." }, 404);
    }

    // ACTION: EXCLUIR (Delete OAB Process)
    if (action === "excluir") {
      const { error: deleteError } = await access.db
        .from("lawyer_oab_processes")
        .delete()
        .eq("id", id)
        .eq("lawyer_id", access.profile.id);

      if (deleteError) throw deleteError;

      return clientJson({
        success: true,
        message: "Processo OAB excluído com sucesso."
      });
    }

    // ACTION: MONITORAR (Toggle / Set Monitor Status)
    if (action === "monitorar") {
      const { monitored } = body;
      const targetMonitored = monitored !== undefined ? Boolean(monitored) : !oabProcess.monitored;

      if (targetMonitored) {
        // Enforce maximum limit of 10 monitored processes
        const { count, error: countError } = await access.db
          .from("lawyer_oab_processes")
          .select("*", { count: "exact", head: true })
          .eq("lawyer_id", access.profile.id)
          .eq("monitored", true);

        if (countError) throw countError;

        if ((count || 0) >= 10) {
          return clientJson({
            success: false,
            message: "Limite de monitoramento atingido. O plano PRO permite monitorar no máximo 10 processos simultaneamente."
          }, 400);
        }
      }

      const { error: updateError } = await access.db
        .from("lawyer_oab_processes")
        .update({ monitored: targetMonitored, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;

      // Sincroniza o monitoramento do processo individual na API processual externa
      try {
        console.log(`[OAB/Monitoramento/Processo] Sincronizando monitoramento do CNJ ${oabProcess.numero_cnj} na API externa. Ativo: ${targetMonitored}`);
        const external = await callExternalProcessApi("/api/plataformas/monitoramentos", {
          tipo: "cnj",
          type: "cnj",
          numero_cnj: oabProcess.numero_cnj,
          plataforma_ref: access.profile.id,
          ativo: targetMonitored
        });

        if (!external.ok || !external.payload?.success) {
          console.warn("[OAB/Monitoramento/Processo] Erro ao registrar monitoramento na API externa:", external.payload);
        }
      } catch (monitorError) {
        console.error("[OAB/Monitoramento/Processo] Erro de rede ao sincronizar monitoramento na API externa:", monitorError);
      }

      return clientJson({
        success: true,
        message: targetMonitored ? "Monitoramento ativado para o processo." : "Monitoramento desativado para o processo.",
        monitored: targetMonitored
      });
    }

    // ACTION: IMPORTAR (Import to CRM)
    if (action === "importar") {
      const { existingClientId, clienteManual } = body;

      const payload = {
        numeroProcesso: oabProcess.numero_cnj,
        existingClientId: existingClientId || null,
        clienteManual: clienteManual || null,
        requestId: crypto.randomUUID()
      };

      const externalPayload = oabProcess.metadata || {};

      const saved = await saveLocalProcessFromExternal(
        access,
        request,
        payload,
        externalPayload
      );

      // Mark the OAB process as imported
      const { error: updateError } = await access.db
        .from("lawyer_oab_processes")
        .update({ imported: true, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (updateError) throw updateError;

      return clientJson({
        success: true,
        message: "Processo importado com sucesso para o CRM.",
        data: {
          processo: serializeProcessListItem(
            saved.process,
            new Map([[saved.client.id, saved.client]])
          ),
          cliente: {
            id: saved.client.id,
            name: saved.client.name,
            created: saved.clientCreated,
            source: saved.clientSource
          }
        }
      }, 201);
    }

    return clientJson({ success: false, message: `Ação "${action}" inválida.` }, 400);
  } catch (error) {
    console.error("[OAB/Monitoramento/Processo][POST] Erro:", error);
    
    // Check for duplicate CRM process error
    if (error?.status === 409 && error.process) {
      return clientJson({
        success: false,
        duplicate: true,
        message: error.message,
        data: { id: error.process.id, numero_cnj: error.process.numero_cnj }
      }, 409);
    }

    const failure = clientFailure(error, "Não foi possível realizar a ação no processo.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
