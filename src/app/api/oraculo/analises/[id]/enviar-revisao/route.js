import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { submitAnalysisForReview } from "@/lib/oraculo/oraculoAnalises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const result = await submitAnalysisForReview({
    analiseId: id,
    oraculoId: auth.context.oraculoId,
    cienciaSupervisor: Boolean(body?.cienciaSupervisor),
  });

  if (!result.ok) {
    if (result.code === "INCOMPLETE") {
      return oraculoJson(
        {
          success: false,
          message:
            "Preencha ao menos o problema identificado e a análise inicial antes de enviar.",
        },
        400,
      );
    }
    if (result.code === "NOT_EDITABLE") {
      return oraculoJson(
        { success: false, message: "Esta análise já foi enviada." },
        409,
      );
    }
    const status = result.code === "NOT_FOUND" ? 404 : 500;
    return oraculoJson(
      { success: false, message: "Não foi possível enviar para revisão." },
      status,
    );
  }

  return oraculoJson({
    success: true,
    message: "Análise enviada para revisão do orientador.",
  });
}
