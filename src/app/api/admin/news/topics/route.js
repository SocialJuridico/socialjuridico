import { jsonResponse, requireNewsAdmin } from "@/lib/news/newsServer";
import { createTopic, listTopics } from "@/lib/news/newsService";
import { EDITORIAL_TYPES } from "@/lib/news/newsUtils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/news/topics — lista a fila de pautas (admin)
export async function GET(request) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const topics = await listTopics({
      status: searchParams.get("status") || null,
      limit: Math.min(Number(searchParams.get("limit") || 100), 200),
    });
    return jsonResponse({ success: true, topics });
  } catch (error) {
    console.error("[Admin News Topics] Falha ao listar:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível listar as pautas." },
      500,
    );
  }
}

// POST /api/admin/news/topics — cadastra uma pauta (assunto) para a IA (admin)
export async function POST(request) {
  const guard = await requireNewsAdmin();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    if (title.length < 5) {
      return jsonResponse(
        { success: false, message: "Informe um título/assunto com ao menos 5 caracteres." },
        400,
      );
    }

    const editorialType = Object.values(EDITORIAL_TYPES).includes(
      body.editorial_type,
    )
      ? body.editorial_type
      : EDITORIAL_TYPES.NOTICIA_JURIDICA;

    // Link de referência (opcional): valida como URL http(s) quando informado.
    let referenceUrl = String(body.reference_url || "").trim() || null;
    if (referenceUrl) {
      try {
        const parsed = new URL(referenceUrl);
        if (!/^https?:$/.test(parsed.protocol)) {
          throw new Error("protocolo inválido");
        }
        referenceUrl = parsed.toString();
      } catch {
        return jsonResponse(
          { success: false, message: "O link de referência deve ser uma URL http(s) válida." },
          400,
        );
      }
    }

    // Prioridade default coerente com o tipo (1 real, 2 educativo, 3 plataforma).
    const defaultPriority =
      editorialType === EDITORIAL_TYPES.NOTICIA_JURIDICA
        ? 1
        : editorialType === EDITORIAL_TYPES.EDUCATIVO
          ? 2
          : 3;

    const topic = await createTopic(
      {
        title,
        editorial_type: editorialType,
        priority: Number.isFinite(body.priority) ? body.priority : defaultPriority,
        briefing: body.briefing || null,
        legal_specialty: body.legal_specialty || null,
        reference_url: referenceUrl,
        category_id: body.category_id || null,
      },
      { actor: guard.actor },
    );

    return jsonResponse({ success: true, topic }, 201);
  } catch (error) {
    console.error("[Admin News Topics] Falha ao criar:", error.message);
    return jsonResponse(
      { success: false, message: "Não foi possível cadastrar a pauta." },
      500,
    );
  }
}