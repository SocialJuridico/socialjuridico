import { redirect, notFound } from "next/navigation";

import { resolveSupervisorContext } from "@/lib/oraculo/staff/supervisorContext";
import { getStaffQuestion } from "@/lib/oraculo/notebook/notebookEntries";
import QuestionAnswerClient from "../../../_staffShared/QuestionAnswerClient";

export const metadata = { title: "Responder Pergunta — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function SupervisorPerguntaPage({ params }) {
  const context = await resolveSupervisorContext();
  if (!context) redirect("/oraculoacademico/login");

  const { id } = await params;
  const detail = await getStaffQuestion({ authUserId: context.authUserId, id });
  if (!detail) notFound();

  return (
    <QuestionAnswerClient
      id={id}
      apiBase="/api/oraculoacademico/supervisor/perguntas"
      backHref="/dashboard/oraculoacademico/supervisor/perguntas"
      initialQuestion={detail.question}
      initialStudent={detail.student}
    />
  );
}
