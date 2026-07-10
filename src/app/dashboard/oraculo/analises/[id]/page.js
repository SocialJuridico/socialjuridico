import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { getAnalysisForStudent } from "@/lib/oraculo/oraculoAnalises";

import MesaClient from "./MesaClient";

export const metadata = { title: "Mesa de Análise Jurídica — Oráculo Acadêmico" };

export default async function MesaPage({ params }) {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const { id } = await params;
  const state = await getAnalysisForStudent({
    analiseId: id,
    oraculoId: context.oraculoId,
  });
  if (!state) notFound();

  return (
    <MesaClient
      analiseId={id}
      initialAnalysis={state.analysis}
      initialSources={state.sources}
      caseView={state.caseView}
      initialSteps={state.steps}
      editable={state.editable}
      canAct={context.studentStatus === "ATIVO"}
    />
  );
}
