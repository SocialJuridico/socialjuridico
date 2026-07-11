import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { listFichamentos, createFichamento } from "@/lib/oraculo/notebook/fichamentos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;

  const items = await listFichamentos({ oraculoId: auth.context.oraculoId });
  return oraculoJson({ success: true, data: items });
}

export async function POST(request) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body?.title) {
    return oraculoJson({ success: false, message: "Título é obrigatório." }, 400);
  }

  const result = await createFichamento({
    context: auth.context,
    oraculoId: auth.context.oraculoId,
    title: body.title,
    theme: body.theme,
  });

  if (!result.ok) {
    const status = result.code === "TITLE_REQUIRED" ? 400 : 500;
    return oraculoJson({ success: false, message: "Não foi possível criar." }, status);
  }
  return oraculoJson({ success: true, data: result.fichamento });
}
