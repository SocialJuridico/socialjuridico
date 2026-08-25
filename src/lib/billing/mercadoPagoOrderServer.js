import { fulfillMercadoPagoPayment } from "@/lib/billing/fulfillmentServer";

function firstPayment(order) {
  const payments = order?.transactions?.payments;
  return Array.isArray(payments) && payments.length ? payments[0] : null;
}

export function isMercadoPagoOrderApproved(order) {
  const payment = firstPayment(order);
  const orderStatus = String(order?.status || "").toLowerCase();
  const orderDetail = String(order?.status_detail || "").toLowerCase();
  const paymentStatus = String(payment?.status || "").toLowerCase();
  const paymentDetail = String(payment?.status_detail || "").toLowerCase();

  return (
    (orderStatus === "processed" && orderDetail === "accredited") ||
    (paymentStatus === "processed" && paymentDetail === "accredited")
  );
}

export function normalizedMercadoPagoOrderStatus(order) {
  if (isMercadoPagoOrderApproved(order)) return "approved";

  const status = String(
    firstPayment(order)?.status || order?.status || "pending",
  ).toLowerCase();

  if (["failed", "rejected"].includes(status)) return "rejected";
  if (["cancelled", "canceled"].includes(status)) return "cancelled";
  if (status === "refunded") return "refunded";
  if (["processing", "created", "action_required"].includes(status)) {
    return "pending";
  }

  return status || "pending";
}

export function mercadoPagoOrderCheckoutData(order) {
  const payment = firstPayment(order);
  const paymentMethod = payment?.payment_method || {};

  return {
    orderId: order?.id || null,
    paymentId: order?.id || null,
    status: normalizedMercadoPagoOrderStatus(order),
    statusDetail:
      payment?.status_detail || order?.status_detail || null,
    paymentMethodId: paymentMethod.id || null,
    paymentMethodType: paymentMethod.type || null,
    qrCode: paymentMethod.qr_code || null,
    qrCodeBase64: paymentMethod.qr_code_base64 || null,
    ticketUrl: paymentMethod.ticket_url || null,
  };
}

export function normalizeMercadoPagoOrderForFulfillment(order) {
  const payment = firstPayment(order);

  return {
    id: order?.id || payment?.id || null,
    external_reference: order?.external_reference || null,
    status: normalizedMercadoPagoOrderStatus(order),
    status_detail: payment?.status_detail || order?.status_detail || null,
    transaction_amount: Number(payment?.amount || order?.total_amount || 0),
    currency_id: "BRL",
    payment_method_id: payment?.payment_method?.id || null,
  };
}

export async function fulfillMercadoPagoOrder(order) {
  return fulfillMercadoPagoPayment(normalizeMercadoPagoOrderForFulfillment(order));
}
