import {
  getPublicDigitalCardBySlug,
  recordPublicDigitalCardEvent,
} from "@/lib/lawyerDigitalCard/digitalCardServer";
import { slugifyDigitalCard } from "@/lib/lawyerDigitalCard/digitalCardValidation";
import {
  buildDigitalCardVcard,
  safeVcardFilename,
} from "@/lib/lawyerDigitalCard/digitalCardVcard";
import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request, context) {
  try {
    const { slug: rawSlug } = await context.params;
    const slug = slugifyDigitalCard(rawSlug);
    const card = await getPublicDigitalCardBySlug(
      slug,
      resolvePublicAppOrigin(request),
    );
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
