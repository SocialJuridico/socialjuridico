import {
  jsonResponse,
  requireNewsAdmin,
} from "@/lib/news/newsServer";
import { listCategories } from "@/lib/news/newsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/news/categories — lista categorias (admin)
export async function GET() {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const categories = await listCategories({ activeOnly: false });
    return jsonResponse({ success: true, categories });
  } catch (error) {
    console.error("[Admin News] Falha ao listar categorias:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível listar as categorias." },
      500,
    );
  }
}