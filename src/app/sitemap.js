import { SITE_URL } from "@/lib/seo";

const routes = [
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

export default function sitemap() {
  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: new Date(route.lastModified),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
