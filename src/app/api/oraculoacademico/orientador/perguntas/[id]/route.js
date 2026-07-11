import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireOraculoStaff, staffJson } from "@/lib/oraculo/staff/oraculoStaffContext";
import { getStaffQuestion, answerStaffQuestion } from "@/lib/oraculo/notebook/notebookEntries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireOraculoStaff("ORACULO_PROFESSOR_ORIENTADOR");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const detail = await getStaffQuestion({ authUserId: auth.context.authUserId, id });
  if (!detail) return staffJson({ success: false, message: "Não encontrada." }, 404);
  return staffJson({ success: true, data: detail });
}

export async function PATCH(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireOraculoStaff("ORACULO_PROFESSOR_ORIENTADOR");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const result = await answerStaffQuestion({
    authUserId: auth.context.authUserId,
    instituicaoId: auth.context.instituicaoId,
    institutionUserId: auth.context.institutionUserId,
    id,
    answerNotes: body?.answerNotes,
    request,
  });

  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : result.code === "ANSWER_REQUIRED" ? 400 : 500;
    return staffJson({ success: false, message: "Não foi possível responder." }, status);
  }
  return staffJson({ success: true, data: result.question });
}
