import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { getRadarAcademicCaseForStudent } from "@/lib/oraculo/radarAcademic/radarAcademicCasesRead";
import { recordOraculoAudit } from "@/lib/oraculo/radarAcademic/radarAcademicAudit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const dossie = await getRadarAcademicCaseForStudent(id);
  if (!dossie) {
    return oraculoJson({ success: false, message: "Dossiê não encontrado." }, 404);
  }

  await recordOraculoAudit({
    oraculoId: auth.context.oraculoId,
    academicCaseId: id,
    eventType: "ORACULO_RADAR_DOSSIER_VIEWED",
  });

  return oraculoJson({ success: true, data: dossie });
}
