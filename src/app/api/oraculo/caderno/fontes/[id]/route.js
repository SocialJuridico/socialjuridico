import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  updateSavedItemNote,
  removeSavedItem,
} from "@/lib/oraculo/legalLibrary/legalLibrarySources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const result = await updateSavedItemNote({
    oraculoId: auth.context.oraculoId,
    id,
    note: body?.note,
  });

  if (!result.ok) {
    return oraculoJson(
      { success: false, message: "Não foi possível salvar." },
      result.code === "NOT_FOUND" ? 404 : 500,
    );
  }
  return oraculoJson({ success: true, data: result.item });
}

export async function DELETE(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await removeSavedItem({
    context: auth.context,
    oraculoId: auth.context.oraculoId,
    id,
  });

  if (!result.ok) {
    return oraculoJson(
      { success: false, message: "Não foi possível remover." },
      result.code === "NOT_FOUND" ? 404 : 500,
    );
  }
  return oraculoJson({ success: true });
}
