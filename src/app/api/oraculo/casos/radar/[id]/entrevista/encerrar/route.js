import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  getInterviewForCase,
  endSimulatedInterview,
} from "@/lib/oraculo/radarAcademic/simulatedInterview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const interview = await getInterviewForCase({
    academicCaseId: id,
    oraculoId: auth.context.oraculoId,
  });
  if (!interview) {
    return oraculoJson(
      { success: false, message: "Atendimento não encontrado." },
      404,
    );
  }

  const result = await endSimulatedInterview({
    interviewId: interview.id,
    oraculoId: auth.context.oraculoId,
    context: auth.context,
  });
  if (!result.ok) {
    return oraculoJson(
      { success: false, message: "Não foi possível encerrar o atendimento." },
      400,
    );
  }

  return oraculoJson({
    success: true,
    message: "Atendimento jurídico simulado concluído.",
    data: {
      evaluation: result.evaluation,
      summary: result.interview.summary_stats,
    },
  });
}
