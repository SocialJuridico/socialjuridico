import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";
import { createPromoInvestCheckout, promoInvestEligibility } from "@/lib/billing/promoInvestServer";

const json = (data, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A consulta de status e o cancelamento do Pix usam /api/checkout/hybrid,
// pois a promoção é gravada em billing_checkouts como qualquer Pix híbrido.
export async function GET() {
  try {
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) return json({ message: "Não autorizado." }, 401);
    return json({ success: true, ...(await promoInvestEligibility(user)) });
  } catch (error) {
    console.error("[PromoInvest] Elegibilidade falhou", { code: error.code || "ELIGIBILITY_FAILED" });
    return json({ success: false, message: error.status ? error.message : "Não foi possível consultar a promoção." }, error.status || 503);
  }
}

export async function POST(request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== new URL(request.url).host &&
      new URL(origin).host !== request.headers.get("x-forwarded-host")) return json({ message: "Origem não autorizada." }, 403);
    const { data: { user } } = await createClient().auth.getUser();
    if (!user) return json({ message: "Não autorizado." }, 401);
    return json(await createPromoInvestCheckout(user, await request.json()));
  } catch (error) {
    console.error("[PromoInvest] Falha", { code: error.code || "CHECKOUT_FAILED", status: error.status || 503 });
    return json({ success: false, code: error.code || "CHECKOUT_FAILED", previousCheckout: error.previousCheckout,
      message: error.status ? error.message : "Não foi possível gerar o Pix. Tente novamente em instantes." }, error.status || 503);
  }
}
