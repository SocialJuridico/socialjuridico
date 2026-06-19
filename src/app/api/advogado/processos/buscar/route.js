import {
  clientJson,
  hasValidClientMutationOrigin,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import {
  callExternalProcessApi,
  findLocalProcess,
  processApiErrorMessage,
} from "@/lib/lawyerProcesses/processServer";
import { validateSearchPayload } from "@/lib/lawyerProcesses/processValidation";

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

    const validation = validateSearchPayload(await request.json());
    if (!validation.valid) {
      return clientJson(
        { success: false, message: validation.message },
        validation.status || 400,
      );
    }

    const duplicate = await findLocalProcess(access, validation.numeroProcesso);
    if (duplicate) {
      return clientJson(
        {
          success: false,
          duplicate: true,
          message: "Este processo já foi importado para o seu CRM.",
          data: { id: duplicate.id, numero_cnj: duplicate.numero_cnj },
        },
        409,
      );
    }

    const external = await callExternalProcessApi("/api/processos/buscar", {
      numero_processo: validation.numeroProcesso,
    });

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

    return clientJson({
      ...external.payload,
      duplicate: false,
    });
  } catch (error) {
    console.error("[Advogado/Processos/Buscar][POST] Erro:", error);
    return clientJson(
      { success: false, message: "Não foi possível buscar o processo." },
      Number(error?.status || 500),
    );
  }
}
