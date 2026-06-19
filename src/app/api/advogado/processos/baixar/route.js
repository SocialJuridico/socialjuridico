import {
  clientJson,
  hasValidClientMutationOrigin,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import {
  callExternalProcessApi,
  processApiErrorMessage,
  saveLocalProcessFromExternal,
  serializeProcessListItem,
} from "@/lib/lawyerProcesses/processServer";
import { validateDownloadPayload } from "@/lib/lawyerProcesses/processValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    if (!hasValidClientMutationOrigin(request)) {
      return clientJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requireLawyerClientAccess(request, { requirePro: true });
    if (!access.ok) return access.response;

    const validation = validateDownloadPayload(await request.json());
    if (!validation.valid) {
      return clientJson(
        { success: false, message: validation.message },
        validation.status || 400,
      );
    }

    const externalPayload = {
      numero_processo: validation.numeroProcesso,
      advogado_id: access.user.id,
      usuario_id: access.user.id,
    };

    if (validation.clienteManual?.nome || validation.selectedDatajudParty?.nome) {
      externalPayload.cliente = validation.clienteManual?.nome
        ? validation.clienteManual
        : validation.selectedDatajudParty;
    }

    if (validation.parteContrariaManual?.nome) {
      externalPayload.parte_contraria = validation.parteContrariaManual;
    }

    const external = await callExternalProcessApi("/api/processos/baixar", externalPayload);

    if (!external.ok || !external.payload?.success) {
      return clientJson(
        {
          success: false,
          message: processApiErrorMessage(external.status, external.payload),
          externalStatus: external.status,
        },
        external.status || 502,
      );
    }

    // A rota externa /baixar salva no Supabase da API, mas pode retornar apenas um recorte.
    // Para montar a pasta processual local completa, buscamos o preview completo quando necessário.
    let payloadForLocalFolder = external.payload;
    const fullLookup = await callExternalProcessApi("/api/processos/buscar", {
      numero_processo: validation.numeroProcesso,
    });
    if (fullLookup.ok && fullLookup.payload?.success && fullLookup.payload?.data) {
      payloadForLocalFolder = {
        ...fullLookup.payload,
        data: {
          ...fullLookup.payload.data,
          registro: external.payload?.data?.registro || external.payload?.registro || null,
          processo_externo: external.payload?.data?.processo || null,
        },
      };
    }

    const saved = await saveLocalProcessFromExternal(
      access,
      request,
      validation,
      payloadForLocalFolder,
    );

    return clientJson(
      {
        success: true,
        message: "Processo importado com sucesso para o CRM.",
        data: {
          external: external.payload.data || external.payload,
          processo: serializeProcessListItem(
            saved.process,
            new Map([[saved.client.id, saved.client]]),
          ),
          cliente: {
            id: saved.client.id,
            name: saved.client.name,
            created: saved.clientCreated,
            source: saved.clientSource,
          },
        },
      },
      201,
    );
  } catch (error) {
    console.error("[Advogado/Processos/Baixar][POST] Erro:", error);
    if (error?.status === 409 && error.process) {
      return clientJson(
        {
          success: false,
          duplicate: true,
          message: error.message,
          data: { id: error.process.id, numero_cnj: error.process.numero_cnj },
        },
        409,
      );
    }
    return clientJson(
      {
        success: false,
        message: error?.message || "Não foi possível importar o processo.",
      },
      Number(error?.status || 500),
    );
  }
}
