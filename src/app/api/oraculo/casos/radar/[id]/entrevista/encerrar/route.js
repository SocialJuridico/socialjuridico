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
      { success: false, message: "Entrevista não encontrada." },
      404,
    );
  }

  const result = await endSimulatedInterview({
    interviewId: interview.id,
    oraculoId: auth.context.oraculoId,
  });
  if (!result.ok) {
    return oraculoJson(
      { success: false, message: "Não foi possível encerrar a entrevista." },
      400,
    );
  }

  return oraculoJson({
    success: true,
    message: "Entrevista simulada concluída.",
    data: {
      indicators: result.interview.indicators,
      feedback: result.interview.ai_feedback,
      summary: result.interview.summary_stats,
    },
  });
}
