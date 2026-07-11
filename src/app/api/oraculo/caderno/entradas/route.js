import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  listNotebookEntries,
  createNotebookEntry,
} from "@/lib/oraculo/notebook/notebookEntries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const entryType = searchParams.get("type");
  const type = ["NOTE", "DRAFT", "CASE_NOTE", "STUDY_QUESTION"].includes(entryType)
    ? entryType
    : null;
  const linkedAnalysisId = searchParams.get("analiseId") || null;

  const entries = await listNotebookEntries({
    oraculoId: auth.context.oraculoId,
    entryType: type,
    linkedAnalysisId,
  });
  return oraculoJson({ success: true, data: entries });
}

export async function POST(request) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body?.content) {
    return oraculoJson({ success: false, message: "Conteúdo é obrigatório." }, 400);
  }

  const result = await createNotebookEntry({
    context: auth.context,
    oraculoId: auth.context.oraculoId,
    entryType: body.entryType,
    title: body.title,
    content: body.content,
    category: body.category,
    tags: body.tags,
    linkedAnalysisId: body.analiseId,
    targetType: body.targetType,
  });

  if (!result.ok) {
    const status =
      result.code === "CONTENT_REQUIRED" ||
      result.code === "ANALYSIS_NOT_FOUND" ||
      result.code === "TARGET_NOT_FOUND"
        ? 400
        : 500;
    return oraculoJson({ success: false, message: "Não foi possível salvar." }, status);
  }
  return oraculoJson({ success: true, data: result.entry });
}
