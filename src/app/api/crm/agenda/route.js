import {
  handleAgendaDelete,
  handleAgendaGet,
  handleAgendaPatch,
  handleAgendaPost,
} from "@/lib/lawyerAgenda/agendaHandlers";
import { prepareAgendaPatchRequest } from "@/lib/lawyerAgenda/agendaRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleAgendaGet;
export const POST = handleAgendaPost;
export async function PATCH(request) {
  const prepared = await prepareAgendaPatchRequest(request);
  if (prepared.response) return prepared.response;
  return handleAgendaPatch(prepared.request);
}
export const DELETE = handleAgendaDelete;
