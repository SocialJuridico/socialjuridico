import { jsonResponse, requireNewsAdmin } from "@/lib/news/newsServer";
import { deleteTopic } from "@/lib/news/newsService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE /api/admin/news/topics/[id] — remove uma pauta da fila (admin)
export async function DELETE(_request, { params }) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    await deleteTopic(id);
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("[Admin News Topics] Falha ao remover:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível remover a pauta." },
      500,
    );
  }
}