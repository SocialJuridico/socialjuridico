import { requireLawyerDigitalCardAccess } from "@/lib/lawyerDigitalCard/digitalCardServer";
import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const access = await requireLawyerDigitalCardAccess(request);
    if (!access.ok) return access.response;
    const value = new URL(request.url).searchParams.get("value") || "";
    let target;
    try {
      target = new URL(value);
    } catch {
      return new Response("URL inválida.", { status: 400 });
    }
    const appHost = new URL(resolvePublicAppOrigin(request)).host;
    if (target.host !== appHost || !target.pathname.startsWith("/cartao/")) {
      return new Response("URL não autorizada.", { status: 403 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const providerUrl = new URL("https://quickchart.io/qr");
    providerUrl.searchParams.set("text", target.toString());
    providerUrl.searchParams.set("size", "360");
    providerUrl.searchParams.set("margin", "2");
    providerUrl.searchParams.set("ecLevel", "M");
    providerUrl.searchParams.set("format", "png");
    const response = await fetch(providerUrl, {
      signal: controller.signal,
      headers: { Accept: "image/png" },
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!response.ok) return new Response("QR indisponível.", { status: 502 });
    const bytes = await response.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[Cartão Digital][QR] Erro:", error);
    return new Response("QR indisponível.", { status: 502 });
  }
}
