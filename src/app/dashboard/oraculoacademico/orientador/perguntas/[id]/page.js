import { redirect, notFound } from "next/navigation";

import { resolveOraculoStaffContext } from "@/lib/oraculo/staff/oraculoStaffContext";
import { getStaffQuestion } from "@/lib/oraculo/notebook/notebookEntries";
import QuestionAnswerClient from "../../../_staffShared/QuestionAnswerClient";

export const metadata = { title: "Responder Pergunta — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function OrientadorPerguntaPage({ params }) {
  const context = await resolveOraculoStaffContext({
    requiredRole: "ORACULO_PROFESSOR_ORIENTADOR",
  });
  if (!context) redirect("/oraculoacademico/login");

  const { id } = await params;
  const detail = await getStaffQuestion({ authUserId: context.authUserId, id });
  if (!detail) notFound();

  return (
    <QuestionAnswerClient
      id={id}
      apiBase="/api/oraculoacademico/orientador/perguntas"
      backHref="/dashboard/oraculoacademico/orientador/perguntas"
      initialQuestion={detail.question}
      initialStudent={detail.student}
    />
  );
}
