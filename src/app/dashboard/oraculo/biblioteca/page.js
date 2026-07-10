import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { listLegalCollections } from "@/lib/oraculo/legalLibrary/legalLibraryRead";
import { searchLegalLibrary } from "@/lib/oraculo/legalLibrary/legalLibrarySearch";
import {
  listRecentLegalViews,
  countNotebookItems,
} from "@/lib/oraculo/legalLibrary/legalLibrarySources";
import { logOraculoEvent, ORACULO_EVENTS } from "@/lib/oraculo/telemetry/oraculoTelemetry";

import BibliotecaClient from "./BibliotecaClient";

export const metadata = { title: "Biblioteca Jurídica — Oráculo Acadêmico" };
export const dynamic = "force-dynamic";

export default async function OraculoBibliotecaPage({ searchParams }) {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const sp = (await searchParams) || {};
  const query = typeof sp.q === "string" ? sp.q : "";

  const [collections, recentViews, notebookCount] = await Promise.all([
    listLegalCollections(),
    listRecentLegalViews({ oraculoId: context.oraculoId, limit: 8 }),
    countNotebookItems({ oraculoId: context.oraculoId }),
  ]);

  let search = null;
  if (query.trim().length >= 2) {
    search = await searchLegalLibrary(query);
    await logOraculoEvent({
      context,
      type: ORACULO_EVENTS.LEGAL_LIBRARY_SEARCH,
      surface: "/dashboard/oraculo/biblioteca",
      metadata: { query: query.slice(0, 120), hits: search.results.length },
    });
  }

  return (
    <BibliotecaClient
      collections={collections}
      recentViews={recentViews}
      notebookCount={notebookCount}
      search={search}
      query={query}
    />
  );
}
