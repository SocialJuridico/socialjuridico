import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  getAnalysisForStudent,
  updateAnalysisSection,
} from "@/lib/oraculo/oraculoAnalises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const state = await getAnalysisForStudent({
    analiseId: id,
    oraculoId: auth.context.oraculoId,
  });
  if (!state) {
    return oraculoJson({ success: false, message: "Análise não encontrada." }, 404);
  }
  return oraculoJson({ success: true, data: state });
}

export async function PATCH(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return oraculoJson({ success: false, message: "Dados inválidos." }, 400);
  }

  const result = await updateAnalysisSection({
    analiseId: id,
    oraculoId: auth.context.oraculoId,
    fields: body,
  });

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND"
        ? 404
        : result.code === "NOT_EDITABLE"
          ? 409
          : result.code === "NO_FIELDS"
            ? 400
            : 500;
    const message =
      result.code === "NOT_EDITABLE"
        ? "Esta análise não pode mais ser editada."
        : "Não foi possível salvar.";
    return oraculoJson({ success: false, message }, status);
  }

  return oraculoJson({ success: true });
}
