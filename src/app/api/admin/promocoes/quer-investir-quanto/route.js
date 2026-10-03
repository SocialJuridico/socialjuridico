import { NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { PROMO_INVEST_MAX_PURCHASES, PROMO_INVEST_TYPE } from "@/lib/billing/promoInvest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (payload, status = 200) => NextResponse.json(payload, { status, headers: { "Cache-Control": "no-store" } });
// O Pix da promoção expira em 1h; tentativas antigas sem consulta posterior
// continuam "pending" no banco e são exibidas como expiradas.
const PIX_TTL_MS = 60 * 60 * 1000;

function paymentStatus(row) {
  if (row.status === "paid") return "PAID";
  if (["cancelled", "canceled"].includes(row.status)) return "CANCELLED";
  if (row.status === "expired" || Date.now() - new Date(row.created_at).getTime() > PIX_TTL_MS) return "EXPIRED";
  return "PENDING";
}

export async function GET() {
  try {
    const auth = await getAuthenticatedAdmin();
    if (!auth.ok) return json({ success: false, message: auth.message }, auth.status);
    if (!supabaseAdmin) return json({ success: false, message: "Serviço financeiro indisponível no servidor." }, 503);

    const { data, error } = await supabaseAdmin
      .from("billing_checkouts")
      .select("id, advogado_id, status, product, provider_id, created_at, advogado:advogados(name, email, oab, estado, plan_type, premium_expires_at), receipts:billing_receipts(provider_key, amount_cents, created_at)")
      .eq("product->>type", PROMO_INVEST_TYPE)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    const items = (data || []).map((row) => {
      const receipt = row.receipts?.[0] || null;
      return {
        id: row.id,
        lawyerId: row.advogado_id,
        name: row.advogado?.name || "Sem nome",
        email: row.advogado?.email || "",
        oab: [row.advogado?.oab, row.advogado?.estado].filter(Boolean).join("/"),
        planType: row.advogado?.plan_type || null,
        planExpiresAt: row.advogado?.premium_expires_at || null,
        amountCents: row.product?.priceInCents || 0,
        purchaseNumber: row.product?.purchaseNumber || null,
        status: paymentStatus(row),
        orderId: row.provider_id,
        paymentReference: receipt?.provider_key || null,
        createdAt: row.created_at,
        paidAt: receipt?.created_at || null,
      };
    });

    const paid = items.filter((item) => item.status === "PAID");
    const buyers = new Set(paid.map((item) => item.lawyerId));
    const renewals = new Set(paid.filter((item) => item.purchaseNumber >= 2).map((item) => item.lawyerId));
    const completed = new Set(paid.filter((item) => item.purchaseNumber >= PROMO_INVEST_MAX_PURCHASES).map((item) => item.lawyerId));
    const totalCents = paid.reduce((sum, item) => sum + item.amountCents, 0);

    return json({
      success: true,
      summary: {
        buyers: buyers.size,
        renewals: renewals.size,
        completed: completed.size,
        confirmedPayments: paid.length,
        pendingPayments: items.filter((item) => item.status === "PENDING").length,
        totalCents,
        averageCents: paid.length ? Math.round(totalCents / paid.length) : 0,
      },
      items,
    });
  } catch (error) {
    console.error("[Admin/PromoInvest] Falha:", error);
    return json({ success: false, message: "Não foi possível carregar a promoção." }, 500);
  }
}
