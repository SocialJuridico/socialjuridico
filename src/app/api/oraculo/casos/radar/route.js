import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  listRadarAcademicCases,
  listRadarAcademicAreas,
  radarAcademicSummary,
} from "@/lib/oraculo/radarAcademic/radarAcademicCasesRead";
import { recordOraculoAudit } from "@/lib/oraculo/radarAcademic/radarAcademicAudit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const area = searchParams.get("area") || undefined;
  const search = searchParams.get("busca") || undefined;

  const [cases, areas, summary] = await Promise.all([
    listRadarAcademicCases({ area, search }),
    listRadarAcademicAreas(),
    radarAcademicSummary(),
  ]);

  await recordOraculoAudit({
    oraculoId: auth.context.oraculoId,
    eventType: "ORACULO_RADAR_CASE_LIST_VIEWED",
  });

  return oraculoJson({ success: true, data: { cases, areas, summary } });
}
