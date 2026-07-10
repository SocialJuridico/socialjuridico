import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { getInterviewForCase } from "@/lib/oraculo/radarAcademic/simulatedInterview";
import { recordOraculoAudit } from "@/lib/oraculo/radarAcademic/radarAcademicAudit";

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

  if (!interview || interview.status !== "COMPLETED") {
    return oraculoJson(
      { success: false, message: "Indicadores ainda não disponíveis." },
      404,
    );
  }

  await recordOraculoAudit({
    oraculoId: auth.context.oraculoId,
    academicCaseId: id,
    interviewId: interview.id,
    eventType: "ORACULO_SIMULATED_INTERVIEW_INDICATORS_VIEWED",
  });

  return oraculoJson({
    success: true,
    data: {
      indicators: interview.indicators,
      feedback: interview.ai_feedback,
      summary: interview.summary_stats,
    },
  });
}
