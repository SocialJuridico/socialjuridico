import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { getFichamentoDetail } from "@/lib/oraculo/notebook/fichamentos";
import { listNotebookItems } from "@/lib/oraculo/legalLibrary/legalLibrarySources";
import { listStudentAnalyses } from "@/lib/oraculo/oraculoAnalises";

import FichamentoClient from "./FichamentoClient";

export const metadata = { title: "Fichamento — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function FichamentoPage({ params }) {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const { id } = await params;
  const [detail, availableSources, availableAnalyses] = await Promise.all([
    getFichamentoDetail({ oraculoId: context.oraculoId, id }),
    listNotebookItems({ oraculoId: context.oraculoId, limit: 200 }),
    listStudentAnalyses({ oraculoId: context.oraculoId }),
  ]);
  if (!detail) notFound();

  return (
    <FichamentoClient
      id={id}
      initialFichamento={detail.fichamento}
      initialSources={detail.sources}
      initialAnalyses={detail.analyses}
      availableSources={availableSources}
      availableAnalyses={availableAnalyses}
    />
  );
}
