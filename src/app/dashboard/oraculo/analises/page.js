import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { listStudentAnalyses } from "@/lib/oraculo/oraculoAnalises";

import AnalisesClient from "./AnalisesClient";

export const metadata = { title: "Minhas Análises — Oráculo Acadêmico" };

export default async function OraculoAnalisesPage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const analyses = await listStudentAnalyses({ oraculoId: context.oraculoId });

  return <AnalisesClient analyses={analyses} />;
}
