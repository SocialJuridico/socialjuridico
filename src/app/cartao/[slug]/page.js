import { notFound } from "next/navigation";

import { getPublicDigitalCardBySlug } from "@/lib/lawyerDigitalCard/digitalCardServer";
import { resolveStaticPublicAppOrigin } from "@/lib/publicAppOrigin";

import PublicDigitalCard from "./PublicDigitalCard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const card = await getPublicDigitalCardBySlug(
    slug,
    resolveStaticPublicAppOrigin(),
  ).catch(() => null);
  if (!card) return { title: "Cartão não encontrado | Social Jurídico" };
  const description =
    card.bio ||
    `${card.displayName}, ${card.headline}. Entre em contato e salve este cartão digital.`;
  return {
    title: `${card.displayName} | Cartão Digital`,
    description,
    alternates: { canonical: card.publicUrl },
    openGraph: {
      type: "profile",
      url: card.publicUrl,
      title: card.displayName,
      description,
      images: card.avatarUrl
        ? [{ url: card.avatarUrl, alt: card.displayName }]
        : [],
    },
    twitter: {
      card: card.avatarUrl ? "summary_large_image" : "summary",
      title: card.displayName,
      description,
      images: card.avatarUrl ? [card.avatarUrl] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default async function DigitalCardPublicPage({ params }) {
  const { slug } = await params;
  const card = await getPublicDigitalCardBySlug(
    slug,
    resolveStaticPublicAppOrigin(),
  ).catch(() => null);
  if (!card) notFound();
  return <PublicDigitalCard card={card} />;
}
