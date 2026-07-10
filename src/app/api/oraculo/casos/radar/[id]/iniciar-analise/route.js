import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { getRadarAcademicCaseForStudent } from "@/lib/oraculo/radarAcademic/radarAcademicCasesRead";
import { recordOraculoAudit } from "@/lib/oraculo/radarAcademic/radarAcademicAudit";
import { createOrGetRadarAnalysis } from "@/lib/oraculo/oraculoAnalises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const dossie = await getRadarAcademicCaseForStudent(id);
  if (!dossie) {
    return oraculoJson({ success: false, message: "Caso não encontrado." }, 404);
  }

  const result = await createOrGetRadarAnalysis({
    academicCaseId: id,
    context: auth.context,
  });
  if (!result.ok) {
    return oraculoJson(
      { success: false, message: "Não foi possível iniciar a análise." },
      result.code === "CASE_NOT_FOUND" ? 404 : 500,
    );
  }

  await recordOraculoAudit({
    oraculoId: auth.context.oraculoId,
    academicCaseId: id,
    eventType: "ORACULO_RADAR_ANALYSIS_STARTED",
    metadata: { source: "RADAR_ACADEMIC", analiseId: result.analiseId },
  });

  return oraculoJson({
    success: true,
    message: "Análise iniciada. Abrindo a Mesa de Análise Jurídica.",
    data: { redirectTo: `/dashboard/oraculo/analises/${result.analiseId}` },
  });
}
