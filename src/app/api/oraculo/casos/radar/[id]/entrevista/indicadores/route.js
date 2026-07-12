import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { getInterviewForCase } from "@/lib/oraculo/radarAcademic/simulatedInterview";
import { getProfessionalSimulationEvaluation } from "@/lib/oraculo/radarAcademic/professionalSimulationEvaluationStorage";
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
      { success: false, message: "Avaliação ainda não disponível." },
      404,
    );
  }

  const evaluation = await getProfessionalSimulationEvaluation({
    interviewId: interview.id,
    oraculoId: auth.context.oraculoId,
  });

  await recordOraculoAudit({
    oraculoId: auth.context.oraculoId,
    academicCaseId: id,
    interviewId: interview.id,
    eventType: "ORACULO_SIMULATED_INTERVIEW_INDICATORS_VIEWED",
  });

  return oraculoJson({
    success: true,
    data: {
      evaluation,
      summary: interview.summary_stats,
    },
  });
}
