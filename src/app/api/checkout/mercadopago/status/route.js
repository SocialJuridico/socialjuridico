import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import {
  fulfillMercadoPagoPayment,
  syncMercadoPagoSubscription,
} from "@/lib/billing/fulfillmentServer";
import {
  fulfillMercadoPagoOrder,
  isMercadoPagoOrderApproved,
  mercadoPagoOrderCheckoutData,
} from "@/lib/billing/mercadoPagoOrderServer";
import {
  isSubscriptionChargeFailure,
  rollbackProvisionalPlanAccess,
  subscriptionInvoicePaymentStatus,
} from "@/lib/billing/subscriptionProvisioningServer";
import {
  getMercadoPagoOrder,
  getMercadoPagoPayment,
  getMercadoPagoSubscription,
  searchMercadoPagoAuthorizedPaymentsBySubscription,
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

function invoiceTimestamp(invoice) {
  const value =
    invoice?.last_modified || invoice?.date_created || invoice?.debit_date || 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
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

async function fulfillApprovedPayment(payment, subscriptionId) {
  if (String(payment?.status || "").toLowerCase() !== "approved") return null;
  const result = await fulfillMercadoPagoPayment(payment, { subscriptionId });
  return result?.status === "approved" ? payment : null;
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
    const orderId = String(url.searchParams.get("orderId") || "").trim();
    const paymentId = String(url.searchParams.get("paymentId") || "").trim();
    const subscriptionId = String(
      url.searchParams.get("subscriptionId") || "",
    ).trim();
    const effectiveOrderId =
      orderId || (/^ORD/i.test(paymentId) ? paymentId : "");

    if (!effectiveOrderId && !paymentId && !subscriptionId) {
      return json(
        { success: false, message: "Identificador do pagamento ausente." },
        400,
      );
    }

    if (effectiveOrderId) {
      const order = await getMercadoPagoOrder(effectiveOrderId);
      const reference = String(order?.external_reference || "").trim();
      if (!reference) {
        return json(
          { success: false, message: "Order sem referência." },
          422,
        );
      }

      await assertReferenceOwner(reference, user.id);

      const fulfillment = isMercadoPagoOrderApproved(order)
        ? await fulfillMercadoPagoOrder(order)
        : null;
      const checkoutData = mercadoPagoOrderCheckoutData(order);

      return json({
        success: true,
        kind:
          checkoutData.paymentMethodId === "pix" ? "pix" : "card",
        ...checkoutData,
        approved: fulfillment?.status === "approved",
      });
    }

    if (paymentId) {
      // Compatibilidade com cobranças da API de Assinaturas, que ainda gera
      // eventos/objetos da Payments API.
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

      if (!fulfillment && isSubscriptionChargeFailure(payment?.status)) {
        await rollbackProvisionalPlanAccess({
          reference,
          failureStatus: payment.status,
        });
      }

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

    let invoices = [];
    try {
      const invoiceSearch =
        await searchMercadoPagoAuthorizedPaymentsBySubscription(subscriptionId);
      invoices = Array.isArray(invoiceSearch?.results)
        ? [...invoiceSearch.results].sort(
            (left, right) => invoiceTimestamp(right) - invoiceTimestamp(left),
          )
        : [];
    } catch (invoiceError) {
      // O fallback pela Payments API continua disponível para instalações em que
      // o endpoint de faturas ainda não esteja retornando dados imediatamente.
      console.warn(
        "[Checkout/MercadoPago/Status] Faturas da assinatura indisponíveis temporariamente:",
        invoiceError,
      );
    }

    let approvedPayment = null;
    let latestPayment = null;
    let invoiceStatus = invoices.length
      ? subscriptionInvoicePaymentStatus(invoices[0])
      : "";

    // A fatura autorizada liga diretamente a cobrança ao preapproval. Quando já
    // existe um payment_id, buscamos o objeto de pagamento de forma autoritativa
    // antes de liberar Juris ou confirmar a receita.
    for (const invoice of invoices) {
      const linkedPaymentId = String(invoice?.payment?.id || "").trim();
      if (!linkedPaymentId) continue;

      try {
        const payment = await getMercadoPagoPayment(linkedPaymentId);
        if (!latestPayment) latestPayment = payment;
        const fulfilled = await fulfillApprovedPayment(payment, subscriptionId);
        if (fulfilled) {
          approvedPayment = fulfilled;
          break;
        }
      } catch (paymentError) {
        console.warn(
          `[Checkout/MercadoPago/Status] Não foi possível consultar a cobrança ${linkedPaymentId}:`,
          paymentError,
        );
      }
    }

    // Fallback e reconciliação adicional por external_reference. Isso também
    // cobre notificações antigas e atrasos na materialização da fatura.
    if (!approvedPayment) {
      const search = await searchMercadoPagoPaymentsByReference(reference);
      const payments = Array.isArray(search?.results) ? search.results : [];

      for (const payment of [...payments].reverse()) {
        if (!latestPayment) latestPayment = payment;
        const fulfilled = await fulfillApprovedPayment(payment, subscriptionId);
        if (fulfilled) approvedPayment = fulfilled;
      }
    }

    if (approvedPayment) {
      return json({
        success: true,
        kind: "subscription",
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        invoiceStatus: "approved",
        status: "approved",
        approved: true,
        paymentId: approvedPayment.id || null,
        accessProvisioned: true,
        activationMessage:
          "Primeira cobrança confirmada. Seu plano está ativo e os Juris incluídos já foram creditados.",
      });
    }

    const effectiveChargeStatus = String(
      latestPayment?.status || invoiceStatus || "",
    ).toLowerCase();
    const subscriptionStatus = String(subscription?.status || "").toLowerCase();
    const chargeFailed = isSubscriptionChargeFailure(effectiveChargeStatus);
    const subscriptionFailed = ["cancelled", "canceled"].includes(
      subscriptionStatus,
    );

    let rollback = null;
    if (chargeFailed || subscriptionFailed) {
      rollback = await rollbackProvisionalPlanAccess({
        reference,
        failureStatus: chargeFailed
          ? effectiveChargeStatus
          : subscriptionStatus || "canceled",
      });
    }

    if (chargeFailed || subscriptionFailed) {
      return json({
        success: true,
        kind: "subscription",
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        invoiceStatus: effectiveChargeStatus || subscriptionStatus,
        status: "rejected",
        approved: false,
        paymentId: latestPayment?.id || null,
        accessProvisioned: false,
        rolledBack: Boolean(rollback?.rolledBack),
        activationMessage:
          "A primeira cobrança não foi aprovada. Nenhum Juris foi creditado e o acesso provisório foi encerrado automaticamente.",
      });
    }

    return json({
      success: true,
      kind: "subscription",
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      invoiceStatus: invoiceStatus || null,
      status: "activating",
      approved: false,
      paymentId: latestPayment?.id || null,
      accessProvisioned: true,
      activationMessage:
        "Sua assinatura foi criada com sucesso. O plano está em ativação enquanto o Mercado Pago confirma a primeira cobrança; os Juris serão creditados somente após essa confirmação.",
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
