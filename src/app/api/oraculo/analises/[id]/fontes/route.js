import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  addAnalysisSource,
  removeAnalysisSource,
} from "@/lib/oraculo/oraculoAnalises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const titulo = String(body?.titulo || "").trim();
  if (!titulo) {
    return oraculoJson({ success: false, message: "Informe a fonte." }, 400);
  }

  const result = await addAnalysisSource({
    analiseId: id,
    oraculoId: auth.context.oraculoId,
    titulo,
    referencia: body?.referencia,
    nota: body?.nota,
  });

  if (!result.ok) {
    const status =
      result.code === "NOT_FOUND" ? 404 : result.code === "NOT_EDITABLE" ? 409 : 500;
    return oraculoJson(
      { success: false, message: "Não foi possível adicionar a fonte." },
      status,
    );
  }
  return oraculoJson({ success: true, data: result.source });
}

export async function DELETE(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");
  if (!sourceId) {
    return oraculoJson({ success: false, message: "Fonte inválida." }, 400);
  }

  const result = await removeAnalysisSource({
    analiseId: id,
    oraculoId: auth.context.oraculoId,
    sourceId,
  });
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 500;
    return oraculoJson(
      { success: false, message: "Não foi possível remover a fonte." },
      status,
    );
  }
  return oraculoJson({ success: true });
}
