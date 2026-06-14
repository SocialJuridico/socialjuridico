import { handleAgendaGet, handleAgendaPost } from "@/lib/lawyerAgenda/agendaHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleAgendaGet;
export const POST = handleAgendaPost;
