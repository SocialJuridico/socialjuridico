import Link from "next/link";
import Image from "next/image";
import { Newspaper, Clock } from "lucide-react";

import Header from "@/components/Header";
import { SITE_URL } from "@/lib/seo";
import { listCategories, listPublishedArticles } from "@/lib/news/newsService";

import styles from "./Noticias.module.css";

export const revalidate = 60;

const DEFAULT_COVER = "/noticias/image.png";

export const metadata = {
  title: "Central de Notícias Jurídicas",
  description:
    "Notícias jurídicas, conteúdos educativos e novidades da plataforma Social Jurídico. Informação confiável para entender seus direitos.",
  alternates: { canonical: `${SITE_URL}/noticias` },
  openGraph: {
    title: "Central de Notícias Jurídicas | Social Jurídico",
    description:
      "Notícias jurídicas e conteúdos educativos para entender seus direitos.",
    url: `${SITE_URL}/noticias`,
    type: "website",
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

  return (
    <div className={styles.wrapper}>
      <Header />

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