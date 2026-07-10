import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  startSimulatedInterview,
  loadInterviewState,
} from "@/lib/oraculo/radarAcademic/simulatedInterview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CODE_STATUS = {
  CASE_NOT_FOUND: 404,
  INTERVIEW_LIMIT_REACHED: 409,
  SERVICE_UNAVAILABLE: 503,
  START_FAILED: 500,
};

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await startSimulatedInterview({
    academicCaseId: id,
    context: auth.context,
  });

  if (!result.ok) {
    const status = CODE_STATUS[result.code] || 400;
    const message =
      result.code === "INTERVIEW_LIMIT_REACHED"
        ? "Você atingiu o limite de entrevistas simuladas para este caso."
        : result.code === "CASE_NOT_FOUND"
          ? "Caso não encontrado."
          : "Não foi possível iniciar a entrevista simulada.";
    return oraculoJson({ success: false, message }, status);
  }

  const state = await loadInterviewState({
    interviewId: result.interview.id,
    oraculoId: auth.context.oraculoId,
  });

  return oraculoJson({ success: true, data: state });
}
