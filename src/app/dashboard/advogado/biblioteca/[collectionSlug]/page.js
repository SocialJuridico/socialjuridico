import { notFound } from "next/navigation";

import { getLegalCollectionBySlug } from "@/lib/oraculo/legalLibrary/legalLibraryRead";

import AdvogadoLivroClient from "./AdvogadoLivroClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { collectionSlug } = await params;
  const data = await getLegalCollectionBySlug(collectionSlug);
  return {
    title: data?.collection
      ? `${data.collection.title} — Biblioteca Jurídica`
      : "Biblioteca Jurídica",
  };
}

export default async function AdvogadoLivroPage({ params, searchParams }) {
  const { collectionSlug } = await params;
  const sp = (await searchParams) || {};
  const artigo = typeof sp.artigo === "string" ? sp.artigo : null;

  const data = await getLegalCollectionBySlug(collectionSlug);
  if (!data || !data.collection) notFound();

  const articles = data.units.filter((u) => u.unit_type === "ARTICLE");
  const focused = (artigo && articles.find((a) => a.number === artigo)) || articles[0] || null;

  return (
    <AdvogadoLivroClient
      collection={data.collection}
      document={data.document}
      version={data.version}
      units={data.units}
      tree={data.tree}
      focusedUnitId={focused?.id || null}
    />
  );
}
