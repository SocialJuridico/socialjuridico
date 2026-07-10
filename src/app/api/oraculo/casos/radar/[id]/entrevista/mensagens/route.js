import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  getInterviewForCase,
  sendStudentMessage,
} from "@/lib/oraculo/radarAcademic/simulatedInterview";
import { recordOraculoAudit } from "@/lib/oraculo/radarAcademic/radarAcademicAudit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const content = String(body?.content || "").trim();
  if (!content) {
    return oraculoJson({ success: false, message: "Mensagem vazia." }, 400);
  }
  if (content.length > 2000) {
    return oraculoJson({ success: false, message: "Mensagem muito longa." }, 400);
  }

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

  await recordOraculoAudit({
    oraculoId: auth.context.oraculoId,
    academicCaseId: id,
    interviewId: interview.id,
    eventType: "ORACULO_SIMULATED_INTERVIEW_MESSAGE_SENT",
  });

  const result = await sendStudentMessage({
    interviewId: interview.id,
    oraculoId: auth.context.oraculoId,
    content,
    context: auth.context,
  });

  // Conduct Guard bloqueou (HIGH): 422 com detalhes para o produto.
  if (result.blocked) {
    return oraculoJson(
      {
        success: false,
        blocked: true,
        message: "Sua mensagem foi retida pelo guardião de conduta.",
        conduct: {
          excerpt: result.conduct.excerpt,
          reason: result.conduct.reason,
          flags: result.conduct.flags,
        },
      },
      422,
    );
  }

  if (!result.ok) {
    if (result.code === "MODEL_ERROR") {
      return oraculoJson(
        {
          success: false,
          message:
            "O cliente simulado não conseguiu responder neste momento. Nenhuma nova informação foi adicionada.",
        },
        503,
      );
    }
    if (result.code === "INTERVIEW_NOT_ACTIVE") {
      return oraculoJson(
        { success: false, message: "Esta entrevista já foi encerrada." },
        409,
      );
    }
    return oraculoJson(
      { success: false, message: "Não foi possível enviar a mensagem." },
      400,
    );
  }

  return oraculoJson({
    success: true,
    data: {
      studentMessage: result.studentMessage,
      clientMessage: result.clientMessage,
      conductWarning: result.conduct
        ? { reason: result.conduct.reason, flags: result.conduct.flags }
        : null,
    },
  });
}
