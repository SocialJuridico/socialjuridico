import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import {
  fulfillMercadoPagoPayment,
  syncMercadoPagoSubscription,
} from "@/lib/billing/fulfillmentServer";
import {
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  searchMercadoPagoPaymentsByReference,
} from "@/lib/mercadopago/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function assertReferenceOwner(reference, userId) {
  const { data, error } = await supabaseAdmin
    .from("transacoes")
    .select("advogado_id")
    .eq("stripe_session_id", reference)
    .maybeSingle();

  if (error || !data || data.advogado_id !== userId) {
    const ownershipError = new Error("Pagamento não localizado para este usuário.");
    ownershipError.status = 404;
    throw ownershipError;
  }
}

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return json(
        { success: false, message: "Serviço financeiro indisponível." },
        503,
      );
    }

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return json({ success: false, message: "Não autorizado." }, 401);
    }

    const url = new URL(request.url);
    const paymentId = String(url.searchParams.get("paymentId") || "").trim();
    const subscriptionId = String(
      url.searchParams.get("subscriptionId") || "",
    ).trim();

    if (!paymentId && !subscriptionId) {
      return json(
        { success: false, message: "Identificador do pagamento ausente." },
        400,
      );
    }

    if (paymentId) {
      const payment = await getMercadoPagoPayment(paymentId);
      const reference = String(payment?.external_reference || "").trim();
      if (!reference) {
        return json(
          { success: false, message: "Pagamento sem referência." },
          422,
        );
      }

      await assertReferenceOwner(reference, user.id);

      const fulfillment =
        String(payment.status || "").toLowerCase() === "approved"
          ? await fulfillMercadoPagoPayment(payment)
          : null;
      const transactionData =
        payment?.point_of_interaction?.transaction_data || {};

      return json({
        success: true,
        kind: payment.payment_method_id === "pix" ? "pix" : "card",
        paymentId: payment.id,
        status: payment.status,
        statusDetail: payment.status_detail || null,
        approved: fulfillment?.status === "approved",
        qrCode: transactionData.qr_code || null,
        qrCodeBase64: transactionData.qr_code_base64 || null,
      });
    }

    const subscription = await getMercadoPagoSubscription(subscriptionId);
    const reference = String(subscription?.external_reference || "").trim();
    if (!reference) {
      return json(
        { success: false, message: "Assinatura sem referência." },
        422,
      );
    }

    await assertReferenceOwner(reference, user.id);
    await syncMercadoPagoSubscription(subscription);

    const search = await searchMercadoPagoPaymentsByReference(reference);
    const payments = Array.isArray(search?.results) ? search.results : [];
    let approvedPayment = null;

    // Processa todos os pagamentos aprovados encontrados. A entrega é idempotente,
    // então isto também recupera uma eventual notificação perdida. O ID explícito
    // da assinatura evita qualquer ambiguidade durante upgrade START -> PRO.
    for (const payment of [...payments].reverse()) {
      if (String(payment?.status || "").toLowerCase() !== "approved") continue;
      const result = await fulfillMercadoPagoPayment(payment, {
        subscriptionId,
      });
      if (result?.status === "approved") approvedPayment = payment;
    }

    return json({
      success: true,
      kind: "subscription",
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      status: approvedPayment ? "approved" : subscription.status,
      approved: Boolean(approvedPayment),
      paymentId: approvedPayment?.id || null,
    });
  } catch (error) {
    console.error("[Checkout/MercadoPago/Status] Erro:", error);
    const status = Number(error?.status) || 500;
    return json(
      {
        success: false,
        message:
          status < 500
            ? error.message
            : "Não foi possível verificar o pagamento no Mercado Pago.",
      },
      status,
    );
  }
}
