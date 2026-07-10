import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStudent, oraculoJson } from "@/lib/oraculo/oraculoStudentApi";
import {
  createEncaminhamento,
  listEncaminhamentos,
} from "@/lib/oraculo/oraculoAnalises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireOraculoStudent(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const analiseId = searchParams.get("analiseId") || null;
  const data = await listEncaminhamentos({
    oraculoId: auth.context.oraculoId,
    analiseId,
  });
  return oraculoJson({ success: true, data });
}

export async function POST(request) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStudent(request, { requireActive: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => null);
  const result = await createEncaminhamento({
    oraculoId: auth.context.oraculoId,
    context: auth.context,
    destino: body?.destino,
    assunto: body?.assunto,
    mensagem: body?.mensagem,
    analiseId: body?.analiseId || null,
  });

  if (!result.ok) {
    if (result.code === "INVALID_DESTINO") {
      return oraculoJson({ success: false, message: "Destino inválido." }, 400);
    }
    if (result.code === "EMPTY") {
      return oraculoJson({ success: false, message: "Escreva sua mensagem." }, 400);
    }
    return oraculoJson(
      { success: false, message: "Não foi possível enviar o encaminhamento." },
      500,
    );
  }

  const destinoLabel =
    result.encaminhamento.destino === "AMBOS"
      ? "orientador e supervisor"
      : result.encaminhamento.destino === "SUPERVISOR"
        ? "supervisor"
        : "orientador";

  return oraculoJson({
    success: true,
    message: `Encaminhamento enviado ao ${destinoLabel}.`,
    data: result.encaminhamento,
  });
}
