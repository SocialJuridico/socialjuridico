/**
 * Compartilhamento de matérias da Central de Notícias.
 *
 * Espelha o comportamento de /api/advogado/oportunidades/[id]/compartilhar:
 * gera (ou reaproveita) um link curto rastreável e devolve { shareUrl,
 * description } para o cliente usar com navigator.share / clipboard.
 *
 * Rota pública: só compartilha matérias PUBLICADAS.
 */

import {
  jsonResponse,
} from "@/lib/news/newsServer";
import {
  createShareLink,
  getPublishedArticleBySlug,
  incrementCounter,
} from "@/lib/news/newsService";
import { SITE_URL } from "@/lib/seo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isLocalHost(value) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1|\.local(?::|$)/i.test(value);
}

/**
 * Base do link de compartilhamento.
 *
 * REGRA: o link compartilhado NUNCA pode sair como localhost — ele é
 * distribuído publicamente (WhatsApp, redes, etc.). Por isso o domínio
 * canônico de produção (SITE_URL) tem prioridade absoluta. Variáveis de
 * ambiente e host do request só são usados se apontarem para um domínio
 * público real; qualquer valor de localhost é descartado.
 */
function resolveBaseUrl(request) {
  const candidates = [
    SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    request.headers.get("origin"),
    (() => {
      const host = request.headers.get("host");
      if (!host) return null;
      const proto = request.headers.get("x-forwarded-proto") || "https";
      return `${proto}://${host}`;
    })(),
  ];

  for (const candidate of candidates) {
    if (candidate && !isLocalHost(candidate)) {
      return candidate.replace(/\/$/, "");
    }
  }

  // Fallback final: mesmo sem candidato válido, jamais retorna localhost.
  return SITE_URL.replace(/\/$/, "");
}

// POST /api/news/[slug]/share — gera link curto e registra o compartilhamento
export async function POST(request, { params }) {
  try {
    const { slug } = await params;
    const article = await getPublishedArticleBySlug(slug);
    if (!article) {
      return jsonResponse(
        { success: false, message: "Matéria não encontrada." },
        404,
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const link = await createShareLink(article.id, {
      channel: body.channel || "web",
    });
    await incrementCounter(article.id, "shares_count");

    const base = resolveBaseUrl(request);
    // Link curto rastreável; o resolvedor redireciona para a matéria.
    const shareUrl = `${base}/n/${link.code}`;

    return jsonResponse({
      success: true,
      data: {
        shareUrl,
        code: link.code,
        title: article.title,
        description:
          article.excerpt ||
          article.subtitle ||
          "Confira esta matéria no Social Jurídico.",
      },
    });
  } catch (error) {
    console.error("[News Share] Falha ao compartilhar:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível gerar o link de compartilhamento." },
      500,
    );
  }
}