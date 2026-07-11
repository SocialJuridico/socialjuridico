import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireSupervisor, supervisorJson } from "@/lib/oraculo/staff/supervisorContext";
import { getStaffQuestion, answerStaffQuestion } from "@/lib/oraculo/notebook/notebookEntries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireSupervisor();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const detail = await getStaffQuestion({ authUserId: auth.context.authUserId, id });
  if (!detail) return supervisorJson({ success: false, message: "Não encontrada." }, 404);
  return supervisorJson({ success: true, data: detail });
}

export async function PATCH(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireSupervisor();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const result = await answerStaffQuestion({
    authUserId: auth.context.authUserId,
    id,
    answerNotes: body?.answerNotes,
    request,
  });

  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : result.code === "ANSWER_REQUIRED" ? 400 : 500;
    return supervisorJson({ success: false, message: "Não foi possível responder." }, status);
  }
  return supervisorJson({ success: true, data: result.question });
}
