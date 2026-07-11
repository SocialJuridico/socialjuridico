import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  addFichamentoAnalysis,
  removeFichamentoAnalysis,
} from "@/lib/oraculo/notebook/fichamentos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const analysisId = String(body?.analysisId || "").trim();
  if (!analysisId) return oraculoJson({ success: false, message: "Caso inválido." }, 400);

  const result = await addFichamentoAnalysis({ oraculoId: auth.context.oraculoId, id, analysisId });
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" || result.code === "ANALYSIS_NOT_FOUND" ? 404 : 500;
    return oraculoJson({ success: false, message: "Não foi possível vincular." }, status);
  }
  return oraculoJson({ success: true, data: result.fichamento });
}

export async function DELETE(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const analysisId = searchParams.get("analysisId");
  if (!analysisId) return oraculoJson({ success: false, message: "Caso inválido." }, 400);

  const result = await removeFichamentoAnalysis({ oraculoId: auth.context.oraculoId, id, analysisId });
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 500;
    return oraculoJson({ success: false, message: "Não foi possível remover." }, status);
  }
  return oraculoJson({ success: true, data: result.fichamento });
}
