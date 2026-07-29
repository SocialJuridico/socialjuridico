import {
  jsonResponse,
  requireNewsAdmin,
} from "@/lib/news/newsServer";
import {
  getArticleById,
  listSources,
  replaceSources,
  updateArticle,
} from "@/lib/news/newsService";
import {
  sanitizeEditorialHtml,
  validateArticlePayload,
} from "@/lib/news/newsUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/news/[id] — detalhe da matéria + fontes
export async function GET(request, { params }) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const article = await getArticleById(id);
    if (!article) {
      return jsonResponse({ success: false, message: "Matéria não encontrada." }, 404);
    }
    const sources = await listSources(id);
    return jsonResponse({ success: true, article, sources });
  } catch (error) {
    console.error("[Admin News] Falha ao obter:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível carregar a matéria." },
      500,
    );
  }
}

// PATCH /api/admin/news/[id] — atualiza matéria (e fontes, se enviadas)
export async function PATCH(request, { params }) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    if (body.title || body.editorial_type || body.status || body.seo_description) {
      const validation = validateArticlePayload({
        title: body.title || "título placeholder",
        editorial_type: body.editorial_type,
        status: body.status,
        seo_description: body.seo_description,
      });
      if (!validation.valid) {
        return jsonResponse(
          { success: false, message: "Dados inválidos.", errors: validation.errors },
          400,
        );
      }
    }

    const patch = { ...body };
    const sources = patch.sources;
    delete patch.sources;
    if (patch.content) patch.content = sanitizeEditorialHtml(patch.content);

    const article = await updateArticle(id, patch, { actor: guard.actor });

    let updatedSources;
    if (Array.isArray(sources)) {
      updatedSources = await replaceSources(id, sources);
    }

    return jsonResponse({ success: true, article, sources: updatedSources });
  } catch (error) {
    console.error("[Admin News] Falha ao atualizar:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível atualizar a matéria." },
      500,
    );
  }
}