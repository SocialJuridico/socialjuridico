import {
  clientFailure,
  clientJson,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import { getProcessFolder } from "@/lib/lawyerProcesses/processServer";
import { isUuid } from "@/lib/lawyerProcesses/processValidation";
import { generateProcessSummary } from "@/lib/lawyerProcesses/processSummaryAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  try {
    const access = await requireLawyerClientAccess(request, { requirePro: true });
    if (!access.ok) return access.response;

    const { id } = await context.params;
    if (!isUuid(id)) {
      return clientJson({ success: false, message: "Processo inválido." }, 400);
    }

    const folder = await getProcessFolder(access, id);
    if (!folder || !folder.process) {
      return clientJson({ success: false, message: "Processo não encontrado." }, 404);
    }

    const processRow = folder.raw || folder.process;
    const movements = folder.movements || [];
    const parties = folder.parties || [];

    const summary = await generateProcessSummary(processRow, movements, parties);
    if (!summary) {
      return clientJson({ success: false, message: "Não foi possível gerar o resumo. Verifique os dados do processo." }, 500);
    }

    const { error: updateError } = await access.db
      .from("lawyer_processes")
      .update({
        resumo_ia: summary,
        resumo_ia_gerado: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) throw updateError;

    return clientJson({
      success: true,
      resumoIa: summary,
    });
  } catch (error) {
    console.error("[Advogado/Processos/Resumo][POST] Erro:", error);
    const failure = clientFailure(error, "Não foi possível gerar o resumo do processo.");
    return clientJson({ success: false, message: failure.message }, failure.status);
  }
}
