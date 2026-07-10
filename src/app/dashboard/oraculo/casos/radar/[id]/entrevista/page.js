import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { getRadarAcademicCaseForStudent } from "@/lib/oraculo/radarAcademic/radarAcademicCasesRead";
import {
  getInterviewForCase,
  loadInterviewState,
} from "@/lib/oraculo/radarAcademic/simulatedInterview";

import EntrevistaClient from "./EntrevistaClient";

export const metadata = { title: "Entrevista Simulada — Radar Acadêmico" };

function shortCode(id) {
  return `RAD-${String(id || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export default async function EntrevistaPage({ params }) {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const { id } = await params;
  const dossie = await getRadarAcademicCaseForStudent(id);
  if (!dossie) notFound();

  const interview = await getInterviewForCase({
    academicCaseId: id,
    oraculoId: context.oraculoId,
  });

  const initialState = interview
    ? await loadInterviewState({
        interviewId: interview.id,
        oraculoId: context.oraculoId,
      })
    : { interview: null, messages: [] };

  return (
    <EntrevistaClient
      caseId={id}
      caseTitle={dossie.title}
      caseCode={shortCode(id)}
      canAct={context.studentStatus === "ATIVO"}
      initialInterview={initialState?.interview || null}
      initialMessages={initialState?.messages || []}
    />
  );
}
