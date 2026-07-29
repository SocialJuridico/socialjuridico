import {
  jsonResponse,
  requireNewsAdmin,
} from "@/lib/news/newsServer";
import {
  changeArticleStatus,
  getArticleById,
} from "@/lib/news/newsService";
import { ARTICLE_STATUS, canTransition } from "@/lib/news/newsUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/news/[id]/status — transição de status validada
export async function POST(request, { params }) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const nextStatus = String(body.status || "").trim();

    if (!Object.values(ARTICLE_STATUS).includes(nextStatus)) {
      return jsonResponse({ success: false, message: "Status inválido." }, 400);
    }

    const article = await getArticleById(id);
    if (!article) {
      return jsonResponse({ success: false, message: "Matéria não encontrada." }, 404);
    }

    if (!canTransition(article.status, nextStatus)) {
      return jsonResponse(
        {
          success: false,
          message: `Transição não permitida: ${article.status} → ${nextStatus}.`,
        },
        409,
      );
    }

    const updated = await changeArticleStatus(id, nextStatus, {
      actor: guard.actor,
    });
    return jsonResponse({ success: true, article: updated });
  } catch (error) {
    console.error("[Admin News] Falha ao mudar status:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível alterar o status." },
      500,
    );
  }
}