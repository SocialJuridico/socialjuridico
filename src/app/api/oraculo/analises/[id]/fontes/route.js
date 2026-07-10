import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  addAnalysisSource,
  removeAnalysisSource,
} from "@/lib/oraculo/oraculoAnalises";
import { addLegalSourceToAnalysis } from "@/lib/oraculo/legalLibrary/legalLibrarySources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  // Fonte vinda da Biblioteca Jurídica: vincula + snapshot da versão.
  const legalUnitId = String(body?.legalUnitId || "").trim();
  if (legalUnitId) {
    const result = await addLegalSourceToAnalysis({
      analiseId: id,
      oraculoId: auth.context.oraculoId,
      context: auth.context,
      legalUnitId,
    });
    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND" || result.code === "UNIT_NOT_FOUND"
          ? 404
          : result.code === "NOT_EDITABLE"
            ? 409
            : result.code === "ALREADY_ADDED"
              ? 409
              : 500;
      const message =
        result.code === "ALREADY_ADDED"
          ? "Esta fonte já está na análise."
          : "Não foi possível adicionar a fonte.";
      return oraculoJson({ success: false, code: result.code, message }, status);
    }
    return oraculoJson({ success: true, data: result.source });
  }

  // Fonte de texto livre (comportamento existente).
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
