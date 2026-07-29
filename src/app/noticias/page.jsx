import Link from "next/link";
import Image from "next/image";
import { Newspaper, Clock } from "lucide-react";

import Header from "@/components/Header";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import { listCategories, listPublishedArticles } from "@/lib/news/newsService";

import styles from "./Noticias.module.css";

export const revalidate = 60;

const DEFAULT_COVER = "/noticias/image.png";

export const metadata = {
  title: "Notícias Jurídicas | Direitos do Consumidor, Trabalhista, Previdenciário",
  description:
    "Central de notícias jurídicas com conteúdos educativos sobre direitos do consumidor, trabalhista, previdenciário, familiar e mais. Informação confiável, atualizada diariamente pelo Social Jurídico.",
  alternates: { canonical: `${SITE_URL}/noticias` },
  keywords: [
    "notícias jurídicas",
    "direitos do consumidor",
    "direito trabalhista",
    "direito previdenciário",
    "direito de família",
    "advogado online",
    "consulta jurídica",
    "social jurídico",
    "legislação brasileira",
    "direitos do cidadão",
  ],
  openGraph: {
    title: "Central de Notícias Jurídicas | Social Jurídico",
    description:
      "Notícias jurídicas atualizadas diariamente. Entenda seus direitos com conteúdos educativos sobre consumidor, trabalhista, previdenciário e mais.",
    url: `${SITE_URL}/noticias`,
    siteName: SITE_NAME,
    type: "website",
    locale: "pt_BR",
    images: [
      {
        url: `${SITE_URL}/noticias/image.png`,
        width: 1200,
        height: 630,
        alt: "Central de Notícias Jurídicas - Social Jurídico",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Central de Notícias Jurídicas | Social Jurídico",
    description:
      "Notícias jurídicas atualizadas diariamente. Entenda seus direitos com conteúdos educativos.",
    images: [`${SITE_URL}/noticias/image.png`],
  },
};

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default async function NoticiasPage({ searchParams }) {
  const params = (await searchParams) || {};
  const activeCategory = params.categoria || null;

  let articles = [];
  let categories = [];
  let loadError = false;

  try {
    const [articlesResult, categoriesResult] = await Promise.all([
      listPublishedArticles({ categorySlug: activeCategory, limit: 24 }),
      listCategories({ activeOnly: true }),
    ]);
    articles = articlesResult.items;
    categories = categoriesResult;
  } catch (error) {
    console.error("[NoticiasPage] Falha ao carregar:", error.message);
    loadError = true;
  }

  // JSON-LD: CollectionPage + BreadcrumbList para SEO agressivo
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/noticias`,
    name: "Central de Notícias Jurídicas",
    description:
      "Notícias jurídicas atualizadas diariamente com conteúdos educativos sobre direitos do consumidor, trabalhista, previdenciário e mais.",
    url: `${SITE_URL}/noticias`,
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
    publisher: { "@type": "Organization", "@id": `${SITE_URL}/#organization` },
    inLanguage: "pt-BR",
    ...(articles.length > 0 && {
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: articles.length,
        itemListElement: articles.slice(0, 12).map((a, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/noticias/${a.slug}`,
          name: a.title,
        })),
      },
    }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Notícias",
        item: `${SITE_URL}/noticias`,
      },
    ],
  };

  return (
    <div className={styles.wrapper}>
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([collectionJsonLd, breadcrumbJsonLd]),
        }}
      />

      <section className={styles.hero}>
       
        <h1 className={styles.title}>Seus direitos, explicados com clareza</h1>
        <p className={styles.subtitle}>
          Notícias jurídicas, conteúdos educativos e novidades da plataforma —
          informação confiável para você entender o que importa.
        </p>
      </section>

      {categories.length > 0 && (
        <nav className={styles.filters} aria-label="Filtrar por categoria">
          <Link
            href="/noticias"
            className={`${styles.filterChip} ${
              !activeCategory ? styles.filterChipActive : ""
            }`}
          >
            Todas
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/noticias?categoria=${cat.slug}`}
              className={`${styles.filterChip} ${
                activeCategory === cat.slug ? styles.filterChipActive : ""
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </nav>
      )}

      <div className={styles.grid}>
        {loadError && (
          <p className={styles.empty}>
            Não foi possível carregar as notícias no momento. Verifique se a
            migração do banco foi aplicada e tente novamente.
          </p>
        )}

        {!loadError && articles.length === 0 && (
          <p className={styles.empty}>
            Ainda não há notícias publicadas. Volte em breve!
          </p>
        )}

        {articles.map((article) => (
          <Link
            key={article.id}
            href={`/noticias/${article.slug}`}
            className={styles.card}
          >
            <div className={styles.cardCover}>
              <Image
                src={article.cover_image_url || DEFAULT_COVER}
                alt={article.cover_image_alt || article.title}
                width={480}
                height={270}
                unoptimized
              />
            </div>
            <div className={styles.cardBody}>
              {article.category?.name && (
                <span className={styles.cardCategory}>
                  {article.category.name}
                </span>
              )}
              <h2 className={styles.cardTitle}>{article.title}</h2>
              {article.excerpt && (
                <p className={styles.cardExcerpt}>{article.excerpt}</p>
              )}
              <div className={styles.cardMeta}>
                <span>{formatDate(article.published_at)}</span>
                {article.reading_time ? (
                  <>
                    <span>·</span>
                    <span>
                      <Clock
                        size={12}
                        style={{ verticalAlign: "middle", marginRight: 4 }}
                      />
                      {article.reading_time} min
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}