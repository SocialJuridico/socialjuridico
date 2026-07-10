import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { createOrGetRadarAnalysis, listStudentAnalyses } from "@/lib/oraculo/oraculoAnalises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;
  const analyses = await listStudentAnalyses({ oraculoId: auth.context.oraculoId });
  return oraculoJson({ success: true, data: analyses });
}

export async function POST(request) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const academicCaseId = String(body?.academicCaseId || "").trim();
  if (!academicCaseId) {
    return oraculoJson({ success: false, message: "Caso inválido." }, 400);
  }

  const result = await createOrGetRadarAnalysis({
    academicCaseId,
    context: auth.context,
  });
  if (!result.ok) {
    const status = result.code === "CASE_NOT_FOUND" ? 404 : 500;
    return oraculoJson(
      { success: false, message: "Não foi possível iniciar a análise." },
      status,
    );
  }

  return oraculoJson({
    success: true,
    data: {
      analiseId: result.analiseId,
      redirectTo: `/dashboard/oraculo/analises/${result.analiseId}`,
    },
  });
}
