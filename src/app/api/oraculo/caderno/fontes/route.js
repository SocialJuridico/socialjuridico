import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import { saveLegalUnitToNotebook } from "@/lib/oraculo/legalLibrary/legalLibrarySources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const legalUnitId = String(body?.legalUnitId || "").trim();
  if (!legalUnitId) {
    return oraculoJson({ success: false, message: "Dispositivo inválido." }, 400);
  }

  const result = await saveLegalUnitToNotebook({
    context: auth.context,
    oraculoId: auth.context.oraculoId,
    legalUnitId,
    note: body?.note,
  });

  if (!result.ok) {
    const status = result.code === "UNIT_NOT_FOUND" ? 404 : 500;
    return oraculoJson(
      { success: false, message: "Não foi possível salvar no caderno." },
      status,
    );
  }
  return oraculoJson({ success: true, data: result.item });
}
