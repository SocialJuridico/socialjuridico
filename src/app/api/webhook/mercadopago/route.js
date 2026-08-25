import { NextResponse } from "next/server";

import {
  fulfillMercadoPagoPayment,
  syncMercadoPagoSubscription,
} from "@/lib/billing/fulfillmentServer";
import {
  fulfillMercadoPagoOrder,
  isMercadoPagoOrderApproved,
  normalizedMercadoPagoOrderStatus,
} from "@/lib/billing/mercadoPagoOrderServer";
import {
  isSubscriptionChargeFailure,
  rollbackProvisionalPlanAccess,
  subscriptionInvoicePaymentStatus,
} from "@/lib/billing/subscriptionProvisioningServer";
import {
  getMercadoPagoAuthorizedPayment,
  getMercadoPagoOrder,
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

async function referenceFromAuthorizedPayment(invoice) {
  const direct = String(invoice?.external_reference || "").trim();
  if (direct) return direct;

  const subscriptionId = String(invoice?.preapproval_id || "").trim();
  if (!subscriptionId) return "";

  const subscription = await getMercadoPagoSubscription(subscriptionId);
  return String(subscription?.external_reference || "").trim();
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

    if (type === "order") {
      const order = await getMercadoPagoOrder(dataId);
      const result = isMercadoPagoOrderApproved(order)
        ? await fulfillMercadoPagoOrder(order)
        : { handled: true };

      return json({
        success: true,
        handled: result?.handled !== false,
        status: normalizedMercadoPagoOrderStatus(order),
        duplicate: Boolean(result?.duplicate),
      });
    }

    if (type === "payment") {
      // Cobranças da API de Assinaturas também materializam objetos da Payments
      // API. O objeto é sempre buscado novamente no Mercado Pago antes de agir.
      const payment = await getMercadoPagoPayment(dataId);
      const result = await fulfillMercadoPagoPayment(payment);
      const reference = String(payment?.external_reference || "").trim();

      if (
        reference &&
        result?.status !== "approved" &&
        isSubscriptionChargeFailure(payment?.status)
      ) {
        await rollbackProvisionalPlanAccess({
          reference,
          failureStatus: payment.status,
        });
      }

      return json({
        success: true,
        handled: result?.handled !== false,
        status: payment?.status || null,
        duplicate: Boolean(result?.duplicate),
      });
    }

    if (type === "subscription_authorized_payment") {
      // Evento específico das faturas de assinatura. Ele permite ligar a
      // primeira cobrança ao preapproval sem depender apenas de uma busca por
      // external_reference.
      const invoice = await getMercadoPagoAuthorizedPayment(dataId);
      const subscriptionId = String(invoice?.preapproval_id || "").trim();
      const linkedPaymentId = String(invoice?.payment?.id || "").trim();
      const reference = await referenceFromAuthorizedPayment(invoice);
      let result = { handled: true };
      let status = subscriptionInvoicePaymentStatus(invoice);

      if (linkedPaymentId) {
        const payment = await getMercadoPagoPayment(linkedPaymentId);
        status = String(payment?.status || status || "").toLowerCase();
        result = await fulfillMercadoPagoPayment(payment, {
          subscriptionId: subscriptionId || null,
        });
      }

      if (
        reference &&
        result?.status !== "approved" &&
        isSubscriptionChargeFailure(status)
      ) {
        await rollbackProvisionalPlanAccess({
          reference,
          failureStatus: status,
        });
      }

      return json({
        success: true,
        handled: result?.handled !== false,
        status: status || null,
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
      const subscriptionStatus = String(subscription?.status || "").toLowerCase();
      const reference = String(subscription?.external_reference || "").trim();

      if (
        reference &&
        ["cancelled", "canceled"].includes(subscriptionStatus)
      ) {
        await rollbackProvisionalPlanAccess({
          reference,
          failureStatus: subscriptionStatus,
        });
      }

      return json({
        success: true,
        handled: result?.handled !== false,
        status: subscription?.status || null,
      });
    }

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
    checkoutApi: "ORDERS",
    subscriptions: "PREAPPROVAL",
    webhook: "ready",
  });
}
