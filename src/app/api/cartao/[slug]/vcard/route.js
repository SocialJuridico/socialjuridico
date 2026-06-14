import {
  getPublicDigitalCardBySlug,
  recordPublicDigitalCardEvent,
} from "@/lib/lawyerDigitalCard/digitalCardServer";
import { slugifyDigitalCard } from "@/lib/lawyerDigitalCard/digitalCardValidation";
import {
  buildDigitalCardVcard,
  safeVcardFilename,
} from "@/lib/lawyerDigitalCard/digitalCardVcard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
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
      return new Response("Cartão não encontrado.", { status: 404 });
    }
    await recordPublicDigitalCardEvent(request, card, {
      eventType: "VCARD_DOWNLOAD",
      metadata: { source: "PUBLIC_CARD" },
    });
    return new Response(buildDigitalCardVcard(card), {
      status: 200,
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeVcardFilename(card.displayName)}"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Cartão Digital Público][vCard] Erro:", error);
    return new Response("Não foi possível gerar o contato.", { status: 500 });
  }
}
