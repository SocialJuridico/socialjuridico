import { SITE_URL } from "@/lib/seo";
import { createClient } from "@/lib/supabaseServer";

/**
 * Sitemap dinâmico — inclui rotas estáticas + todas as notícias publicadas.
 * Cada artigo publicado gera uma entrada com prioridade 0.8 e lastModified
 * baseado na data de atualização ou publicação.
 */

const staticRoutes = [
  {
    path: "/",
    lastModified: "2026-06-08",
    changeFrequency: "weekly",
    priority: 1,
  },
  {
    path: "/sou-advogado",
    lastModified: "2026-06-08",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/assinatura",
    lastModified: "2026-06-17",
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    path: "/noticias",
    lastModified: new Date().toISOString().split("T")[0],
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/sobre",
    lastModified: "2026-06-08",
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    path: "/contato",
    lastModified: "2026-06-08",
    changeFrequency: "yearly",
    priority: 0.6,
  },
  {
    path: "/seguranca",
    lastModified: "2026-06-08",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/termos",
    lastModified: "2026-06-08",
    changeFrequency: "monthly",
    priority: 0.4,
  },
  {
    path: "/privacidade",
    lastModified: "2026-06-08",
    changeFrequency: "monthly",
    priority: 0.4,
  },
  {
    path: "/exclusao-de-dados",
    lastModified: "2026-06-08",
    changeFrequency: "monthly",
    priority: 0.4,
  },
];

async function getPublishedArticles() {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("news_articles")
      .select("slug, published_at, updated_at")
      .eq("status", "publicado")
      .eq("allow_indexing", true)
      .order("published_at", { ascending: false });

    if (error) {
      console.error("[Sitemap] Erro ao buscar artigos:", error.message);
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export default async function sitemap() {
  const staticEntries = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const articles = await getPublishedArticles();

  const articleEntries = articles.map((article) => ({
    url: `${SITE_URL}/noticias/${article.slug}`,
    lastModified: new Date(article.updated_at || article.published_at),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...articleEntries];
}