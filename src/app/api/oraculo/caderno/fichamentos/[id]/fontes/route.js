import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  addFichamentoSource,
  removeFichamentoSource,
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
  const sourceId = String(body?.sourceId || "").trim();
  if (!sourceId) return oraculoJson({ success: false, message: "Fonte inválida." }, 400);

  const result = await addFichamentoSource({ oraculoId: auth.context.oraculoId, id, sourceId });
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" || result.code === "SOURCE_NOT_FOUND" ? 404 : 500;
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
  const sourceId = searchParams.get("sourceId");
  if (!sourceId) return oraculoJson({ success: false, message: "Fonte inválida." }, 400);

  const result = await removeFichamentoSource({ oraculoId: auth.context.oraculoId, id, sourceId });
  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 500;
    return oraculoJson({ success: false, message: "Não foi possível remover." }, status);
  }
  return oraculoJson({ success: true, data: result.fichamento });
}
