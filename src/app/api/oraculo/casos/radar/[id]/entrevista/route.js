import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  getInterviewForCase,
  loadInterviewState,
} from "@/lib/oraculo/radarAcademic/simulatedInterview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const interview = await getInterviewForCase({
    academicCaseId: id,
    oraculoId: auth.context.oraculoId,
  });

  if (!interview) {
    return oraculoJson({ success: true, data: { interview: null, messages: [] } });
  }

  const state = await loadInterviewState({
    interviewId: interview.id,
    oraculoId: auth.context.oraculoId,
  });
  return oraculoJson({ success: true, data: state });
}
