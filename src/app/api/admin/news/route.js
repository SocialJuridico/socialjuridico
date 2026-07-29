import {
  jsonResponse,
  requireNewsAdmin,
} from "@/lib/news/newsServer";
import {
  createArticle,
  listArticlesAdmin,
} from "@/lib/news/newsService";
import {
  sanitizeEditorialHtml,
  validateArticlePayload,
} from "@/lib/news/newsUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/news — lista matérias (admin)
export async function GET(request) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const result = await listArticlesAdmin({
      status: searchParams.get("status") || null,
      editorialType: searchParams.get("editorialType") || null,
      categoryId: searchParams.get("categoryId") || null,
      search: searchParams.get("search") || null,
      page: Number(searchParams.get("page") || 1),
      pageSize: Math.min(Number(searchParams.get("pageSize") || 20), 100),
    });
    return jsonResponse({ success: true, ...result });
  } catch (error) {
    console.error("[Admin News] Falha ao listar:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível listar as matérias." },
      500,
    );
  }
}

// POST /api/admin/news — cria matéria (admin)
export async function POST(request) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const validation = validateArticlePayload(body);
    if (!validation.valid) {
      return jsonResponse(
        { success: false, message: "Dados inválidos.", errors: validation.errors },
        400,
      );
    }

    const payload = { ...body };
    if (payload.content) payload.content = sanitizeEditorialHtml(payload.content);

    const article = await createArticle(payload, { actor: guard.actor });
    return jsonResponse({ success: true, article }, 201);
  } catch (error) {
    console.error("[Admin News] Falha ao criar:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível criar a matéria." },
      500,
    );
  }
}