import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { listNotebookEntries } from "@/lib/oraculo/notebook/notebookEntries";
import { listNotebookItems } from "@/lib/oraculo/legalLibrary/legalLibrarySources";
import { listFichamentos } from "@/lib/oraculo/notebook/fichamentos";

import NotebookClient from "./NotebookClient";

export const metadata = { title: "Meu Caderno Jurídico — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function OraculoCadernoPage() {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const [entries, sources, fichamentos] = await Promise.all([
    listNotebookEntries({ oraculoId: context.oraculoId }),
    listNotebookItems({ oraculoId: context.oraculoId, limit: 200 }),
    listFichamentos({ oraculoId: context.oraculoId }),
  ]);

  return <NotebookClient entries={entries} sources={sources} fichamentos={fichamentos} />;
}
