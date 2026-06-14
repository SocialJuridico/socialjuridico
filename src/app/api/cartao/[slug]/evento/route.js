import {
  digitalCardJson,
  getPublicDigitalCardBySlug,
  recordPublicDigitalCardEvent,
} from "@/lib/lawyerDigitalCard/digitalCardServer";
import { slugifyDigitalCard } from "@/lib/lawyerDigitalCard/digitalCardValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request, context) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = slugifyDigitalCard(rawSlug);
    const origin = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin
    ).replace(/\/+$/, "");
    const card = await getPublicDigitalCardBySlug(slug, origin);
    if (!card) {
      return digitalCardJson({ success: false, message: "Cartão não encontrado." }, 404);
    }
    const body = await request.json().catch(() => ({}));
    const eventType = String(body.eventType || "").toUpperCase();
    if (!["VIEW", "CLICK", "SHARE"].includes(eventType)) {
      return digitalCardJson({ success: false, message: "Evento inválido." }, 400);
    }
    const result = await recordPublicDigitalCardEvent(request, card, {
      eventType,
      linkKey: typeof body.linkKey === "string" ? body.linkKey.slice(0, 80) : null,
      metadata: {
        source: typeof body.source === "string" ? body.source.slice(0, 60) : "PUBLIC_CARD",
      },
    });
    return digitalCardJson({ success: true, recorded: result.inserted === true });
  } catch (error) {
    console.error("[Cartão Digital Público][Evento] Erro:", error);
    return digitalCardJson({ success: false, message: "Não foi possível registrar o evento." }, 500);
  }
}
