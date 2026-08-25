import { NextResponse } from "next/server";

import {
  fulfillMercadoPagoPayment,
  syncMercadoPagoSubscription,
} from "@/lib/billing/fulfillmentServer";
import {
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  validateMercadoPagoWebhookSignature,
} from "@/lib/mercadopago/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(payload, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => null);
    const url = new URL(request.url);
    const dataId = String(
      url.searchParams.get("data.id") || payload?.data?.id || "",
    ).trim();
    const xSignature = request.headers.get("x-signature");
    const xRequestId = request.headers.get("x-request-id");

    if (!dataId || !xSignature || !xRequestId) {
      return json({ success: false, message: "Notificação incompleta." }, 400);
    }

    const validSignature = validateMercadoPagoWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
    });

    if (!validSignature) {
      console.warn("[Webhook/MercadoPago] Assinatura inválida", {
        dataId,
        type: payload?.type,
      });
      return json({ success: false, message: "Assinatura inválida." }, 401);
    }

    const type = String(payload?.type || "").trim().toLowerCase();

    if (type === "payment") {
      const payment = await getMercadoPagoPayment(dataId);
      const result = await fulfillMercadoPagoPayment(payment);

      return json({
        success: true,
        handled: result?.handled !== false,
        status: payment?.status || null,
        duplicate: Boolean(result?.duplicate),
      });
    }

    if (
      type === "subscription_preapproval" ||
      type === "preapproval" ||
      type === "subscription"
    ) {
      const subscription = await getMercadoPagoSubscription(dataId);
      const result = await syncMercadoPagoSubscription(subscription);

      return json({
        success: true,
        handled: result?.handled !== false,
        status: subscription?.status || null,
      });
    }

    // As cobranças autorizadas da assinatura também geram evento `payments`.
    // Esse evento de pagamento é o gatilho financeiro que efetivamente entrega
    // o plano/Juris, portanto os demais tópicos podem ser reconhecidos aqui sem
    // duplicar crédito.
    return json({
      success: true,
      handled: false,
      ignoredType: type || "unknown",
    });
  } catch (error) {
    console.error("[Webhook/MercadoPago] Erro:", error);
    return json(
      {
        success: false,
        message: "Falha temporária ao processar a notificação.",
      },
      500,
    );
  }
}

export async function GET() {
  return json({
    success: true,
    provider: "MERCADOPAGO",
    webhook: "ready",
  });
}
