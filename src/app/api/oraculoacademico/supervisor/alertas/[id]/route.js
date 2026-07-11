import { validateClientMutationOrigin } from "@/lib/clientDashboard/clientServer";
import { requireSupervisor, supervisorJson } from "@/lib/oraculo/staff/supervisorContext";
import { getSupervisorAlert, reviewSupervisorAlert } from "@/lib/oraculo/staff/supervisorAlerts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const auth = await requireSupervisor();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const detail = await getSupervisorAlert({ authUserId: auth.context.authUserId, id });
  if (!detail) return supervisorJson({ success: false, message: "Não encontrado." }, 404);
  return supervisorJson({ success: true, data: detail });
}

export async function PATCH(request, { params }) {
  const originResponse = validateClientMutationOrigin(request);
  if (originResponse) return originResponse;

  const auth = await requireSupervisor();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const result = await reviewSupervisorAlert({
    authUserId: auth.context.authUserId,
    id,
    decision: body?.decision,
    comment: body?.comment,
    studentOrientation: body?.studentOrientation,
  });

  if (!result.ok) {
    const status = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_DECISION" ? 400 : 500;
    return supervisorJson({ success: false, message: "Não foi possível registrar a revisão." }, status);
  }
  return supervisorJson({ success: true, data: { id: result.id } });
}
