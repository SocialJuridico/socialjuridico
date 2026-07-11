import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  updateNotebookEntry,
  archiveNotebookEntry,
} from "@/lib/oraculo/notebook/notebookEntries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return oraculoJson({ success: false, message: "Corpo inválido." }, 400);

  const result = await updateNotebookEntry({
    context: auth.context,
    oraculoId: auth.context.oraculoId,
    id,
    patch: body,
  });

  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : result.code === "CONTENT_REQUIRED" ? 400 : 500;
    return oraculoJson({ success: false, message: "Não foi possível salvar." }, status);
  }
  return oraculoJson({ success: true, data: result.entry });
}

export async function DELETE(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await archiveNotebookEntry({
    context: auth.context,
    oraculoId: auth.context.oraculoId,
    id,
  });

  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : 500;
    return oraculoJson({ success: false, message: "Não foi possível arquivar." }, status);
  }
  return oraculoJson({ success: true });
}
