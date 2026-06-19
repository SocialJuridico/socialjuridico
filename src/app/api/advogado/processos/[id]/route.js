import {
  clientFailure,
  clientJson,
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
