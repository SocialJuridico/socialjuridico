import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { resolveOraculoStudentContext } from "@/lib/oraculo/oraculoAcademicContext";
import { getLegalCollectionBySlug } from "@/lib/oraculo/legalLibrary/legalLibraryRead";
import { recordLegalUnitView } from "@/lib/oraculo/legalLibrary/legalLibrarySources";
import { listStudentAnalyses } from "@/lib/oraculo/oraculoAnalises";

import LivroClient from "./LivroClient";

export const dynamic = "force-dynamic";

const EDITABLE_STATUSES = ["EM_ANDAMENTO", "AJUSTE_SOLICITADO"];

export async function generateMetadata({ params }) {
  const { collectionSlug } = await params;
  const data = await getLegalCollectionBySlug(collectionSlug);
  return {
    title: data?.collection
      ? `${data.collection.title} — Biblioteca Jurídica`
      : "Biblioteca Jurídica",
  };
}

export default async function OraculoLivroPage({ params, searchParams }) {
  const requestHeaders = await headers();
  const { context } = await resolveOraculoStudentContext(requestHeaders);
  if (!context) redirect("/oraculoacademico/login");

  const { collectionSlug } = await params;
  const sp = (await searchParams) || {};
  const artigo = typeof sp.artigo === "string" ? sp.artigo : null;

  const data = await getLegalCollectionBySlug(collectionSlug);
  if (!data || !data.collection) notFound();

  // Dispositivo em foco (para registrar a consulta): artigo pedido ou o primeiro.
  const articles = data.units.filter((u) => u.unit_type === "ARTICLE");
  const focused =
    (artigo && articles.find((a) => a.number === artigo)) || articles[0] || null;
  if (focused) {
    await recordLegalUnitView({ context, legalUnitId: focused.id });
  }

  const analyses = (await listStudentAnalyses({ oraculoId: context.oraculoId }))
    .filter((a) => EDITABLE_STATUSES.includes(a.status))
    .map((a) => ({ id: a.id, titulo: a.titulo, area: a.area }));

  return (
    <LivroClient
      collection={data.collection}
      document={data.document}
      version={data.version}
      units={data.units}
      tree={data.tree}
      analyses={analyses}
      focusedUnitId={focused?.id || null}
    />
  );
}
