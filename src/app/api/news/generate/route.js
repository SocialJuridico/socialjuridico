/**
 * Motor de automação da Central de Notícias.
 *
 * Aciona a IA (mesmo provedor OpenAI do Social Jurídico) para consumir a fila
 * de pautas cadastradas pelo administrador, pesquisar, redigir e PUBLICAR a
 * matéria. Respeita o limite de 3 matérias por dia e a ordem de prioridade
 * (1 = notícia real, 2 = educativo, 3 = novidade da plataforma).
 *
 * Acionamento:
 *   - Cron (Vercel) 3x/dia via header Authorization: Bearer NEWS_CRON_SECRET.
 *   - Admin autenticado (botão "Gerar agora" no painel) via sessão.
 *
 * A "hora determinada pela própria IA": cada execução do cron representa um
 * slot do dia (manhã/tarde/noite). A IA publica a próxima pauta da fila no
 * momento em que o slot é disparado, então o horário efetivo de publicação é
 * definido pela automação, não pelo administrador.
 */

import {
  claimNextTopic,
  countAiPublishedToday,
  createArticle,
  createShareLink,
  changeArticleStatus,
  markTopicDone,
  markTopicFailed,
  replaceSources,
} from "@/lib/news/newsService";
import { generateArticleFromTopic } from "@/lib/news/newsAiGenerator";
import {
  jsonResponse,
  requireNewsAdmin,
  validateNewsCron,
} from "@/lib/news/newsServer";
import { ARTICLE_STATUS } from "@/lib/news/newsUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DAILY_LIMIT = Number(process.env.NEWS_DAILY_LIMIT || 3);

async function authorize(request) {
  // 1) Cron autorizado por segredo (Bearer).
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    const cron = validateNewsCron(request);
    if (cron.ok) return { ok: true, mode: "cron", actor: null };
    // Se veio header mas não bate o segredo, tenta sessão admin abaixo.
  }
  // 2) Admin autenticado (acionamento manual).
  const admin = await requireNewsAdmin();
  if (admin.ok) return { ok: true, mode: "admin", actor: admin.actor };
  return { ok: false, response: admin.response };
}

async function runOnce(actor) {
  const published = await countAiPublishedToday();
  if (published >= DAILY_LIMIT) {
    return {
      status: "LIMIT_REACHED",
      publishedToday: published,
      dailyLimit: DAILY_LIMIT,
    };
  }

  const topic = await claimNextTopic();
  if (!topic) {
    return { status: "NO_TOPICS", publishedToday: published };
  }

  const result = await generateArticleFromTopic(topic);
  if (!result.ok) {
    await markTopicFailed(topic.id, result.error);
    return {
      status: "GENERATION_FAILED",
      topicId: topic.id,
      error: result.error,
    };
  }

  // Cria a matéria já publicada (o horário é definido pela automação).
  let article;
  try {
    article = await createArticle(
      {
        ...result.article,
        generation_job_id: null,
      },
      { actor: actor || { id: null, name: "Automação IA" } },
    );

    if (result.sources?.length) {
      await replaceSources(article.id, result.sources);
    }

    // Transição para PUBLICADO (define published_at).
    article = await changeArticleStatus(article.id, ARTICLE_STATUS.PUBLICADO, {
      actor: actor || { id: null, name: "Automação IA" },
    });

    // Cria o link curto de compartilhamento já na publicação.
    await createShareLink(article.id, { channel: "auto" });

    await markTopicDone(topic.id, article.id);
  } catch (error) {
    await markTopicFailed(topic.id, `PERSIST_FAILED: ${error.message}`);
    return {
      status: "PERSIST_FAILED",
      topicId: topic.id,
      error: error.message,
    };
  }

  return {
    status: "PUBLISHED",
    topicId: topic.id,
    articleId: article.id,
    slug: article.slug,
    editorialType: article.editorial_type,
    publishedToday: published + 1,
    dailyLimit: DAILY_LIMIT,
  };
}

export async function POST(request) {
  const auth = await authorize(request);
  if (!auth.ok) return auth.response;

  try {
    const result = await runOnce(auth.actor);
    const httpStatus =
      result.status === "PUBLISHED" ||
      result.status === "NO_TOPICS" ||
      result.status === "LIMIT_REACHED"
        ? 200
        : 422;
    return jsonResponse({ success: result.status === "PUBLISHED", ...result }, httpStatus);
  } catch (error) {
    console.error("[NewsGenerate] Erro inesperado:", error.message);
    return jsonResponse(
      { success: false, message: "Falha ao processar a fila de pautas." },
      500,
    );
  }
}

// Vercel Cron dispara via GET. Delegamos ao mesmo fluxo.
export async function GET(request) {
  const cron = validateNewsCron(request);
  if (!cron.ok) return cron.response;
  try {
    const result = await runOnce(null);
    return jsonResponse({ success: result.status === "PUBLISHED", ...result });
  } catch (error) {
    console.error("[NewsGenerate] Erro inesperado (GET):", error.message);
    return jsonResponse(
      { success: false, message: "Falha ao processar a fila de pautas." },
      500,
    );
  }
}