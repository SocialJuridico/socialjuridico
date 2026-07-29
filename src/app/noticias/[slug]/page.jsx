import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Calendar, User, ArrowLeft } from "lucide-react";

import Header from "@/components/Header";
import ShareButton from "./ShareButton";
import { SITE_URL } from "@/lib/seo";
import {
  getPublishedArticleBySlug,
  listSources,
  resolveRedirect,
} from "@/lib/news/newsService";

import styles from "./Artigo.module.css";

export const revalidate = 60;

const DEFAULT_COVER = "/noticias/image.png";

function formatDate(value) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

async function loadArticle(slug) {
  try {
    return await getPublishedArticleBySlug(slug);
  } catch (error) {
    console.error("[ArtigoPage] Falha ao carregar:", error.message);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const article = await loadArticle(slug);

  if (!article) {
    return { title: "Notícia não encontrada" };
  }

  const url = `${SITE_URL}/noticias/${article.slug}`;
  const description =
    article.seo_description || article.excerpt || article.title;

  return {
    title: article.seo_title || article.title,
    description,
    alternates: { canonical: url },
    robots: article.allow_indexing === false ? { index: false } : undefined,
    openGraph: {
      title: article.title,
      description,
      url,
      type: "article",
      publishedTime: article.published_at,
      modifiedTime: article.updated_at,
      images: article.cover_image_url
        ? [{ url: article.cover_image_url }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: article.cover_image_url ? [article.cover_image_url] : undefined,
    },
  };
}

export default async function ArtigoPage({ params }) {
  const { slug } = await params;
  let article = await loadArticle(slug);

  // Suporte a redirecionamento de slug antigo (301 lógico)
  if (!article) {
    try {
      const redirect = await resolveRedirect(slug);
      if (redirect?.new_slug) {
        article = await loadArticle(redirect.new_slug);
      }
    } catch {
      /* ignora */
    }
  }

  if (!article) {
    notFound();
  }

  let sources = [];
  try {
    sources = await listSources(article.id);
  } catch {
    /* fontes são opcionais */
  }

  const url = `${SITE_URL}/noticias/${article.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.seo_description || article.excerpt,
    image: article.cover_image_url ? [article.cover_image_url] : undefined,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: {
      "@type": "Organization",
      name: article.author_name || "Social Jurídico",
    },
    publisher: {
      "@type": "Organization",
      name: "Social Jurídico",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "pt-BR",
    isPartOf: { "@type": "WebSite", "@id": `${SITE_URL}/#website` },
    ...(article.category?.name && { articleSection: article.category.name }),
    ...(article.seo_keywords?.length && { keywords: article.seo_keywords.join(", ") }),
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
      {
        "@type": "ListItem",
        position: 3,
        name: article.category?.name || "Artigo",
        item: article.category?.slug
          ? `${SITE_URL}/noticias?categoria=${article.category.slug}`
          : `${SITE_URL}/noticias`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: article.title,
        item: url,
      },
    ],
  };

  return (
    <div className={styles.wrapper}>
      <Header />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([jsonLd, breadcrumbJsonLd]),
        }}
      />

      <article className={styles.article}>
        <Link href="/noticias" className={styles.backButton}>
          <ArrowLeft size={16} />
          Voltar para Notícias
        </Link>

        <div className={styles.breadcrumb}>
          <Link href="/noticias">Notícias</Link>
          <span>›</span>
          <span>{article.category?.name || "Artigo"}</span>
        </div>

        {article.category?.name && (
          <span className={styles.category}>{article.category.name}</span>
        )}

        <h1 className={styles.title}>{article.title}</h1>

        <div className={styles.meta}>
          <span>
            <Calendar size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {formatDate(article.published_at)}
          </span>
          {article.reading_time ? (
            <span>
              <Clock size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
              {article.reading_time} min de leitura
            </span>
          ) : null}
          {article.author_name ? (
            <span>
              <User size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
              {article.author_name}
            </span>
          ) : null}
        </div>

        <div className={styles.shareRow}>
          <ShareButton slug={article.slug} title={article.title} />
        </div>

        <div className={styles.cover}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.cover_image_url || DEFAULT_COVER}
            alt={article.cover_image_alt || article.title}
          />
        </div>

        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: article.content || "" }}
        />

        {sources.length > 0 && (
          <div className={styles.sources}>
            <h4>Fontes</h4>
            <ul>
              {sources.map((source) => (
                <li key={source.id}>
                  {source.url ? (
                    <a href={source.url} target="_blank" rel="noopener noreferrer nofollow">
                      {source.title || source.url}
                    </a>
                  ) : (
                    source.title
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className={styles.disclaimer}>
          {article.legal_notice ||
            "Este conteúdo tem caráter exclusivamente informativo e educativo, não constituindo aconselhamento jurídico. Cada caso possui particularidades — consulte sempre um advogado."}
        </div>
      </article>
    </div>
  );
}