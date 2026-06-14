import { handleAgendaDelete, handleAgendaPatch } from "@/lib/lawyerAgenda/agendaHandlers";
import { prepareAgendaPatchRequest } from "@/lib/lawyerAgenda/agendaRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request, context) {
  const prepared = await prepareAgendaPatchRequest(request);
  if (prepared.response) return prepared.response;
  const { itemId } = await context.params;
  return handleAgendaPatch(prepared.request, itemId);
}

export async function DELETE(request, context) {
  const { itemId } = await context.params;
  return handleAgendaDelete(request, itemId);
}
