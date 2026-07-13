import { listLegalCollections } from "@/lib/oraculo/legalLibrary/legalLibraryRead";
import { searchLegalLibrary } from "@/lib/oraculo/legalLibrary/legalLibrarySearch";

import AdvogadoBibliotecaClient from "./AdvogadoBibliotecaClient";

export const metadata = { title: "Biblioteca Jurídica | Social Jurídico" };
export const dynamic = "force-dynamic";

export default async function AdvogadoBibliotecaPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const query = typeof sp.q === "string" ? sp.q : "";

  const collections = await listLegalCollections();
  const search = query.trim().length >= 2 ? await searchLegalLibrary(query) : null;

  return <AdvogadoBibliotecaClient collections={collections} search={search} query={query} />;
}
