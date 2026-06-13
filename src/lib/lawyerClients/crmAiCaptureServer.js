import { checkAndNotifyLowBalance } from "@/lib/jurisHelper";

import { isClientUuid } from "./clientValidation";

export { getCrmAiCapturePolicy } from "./crmAiCapturePolicy";

export const CRM_AI_CAPTURE_MODES = Object.freeze({
  VOICE: "VOICE",
  PDF: "PDF",
});

export async function reserveCrmAiCapture(access, requestId, mode) {
  if (!isClientUuid(requestId)) {
    return {
      success: false,
      code: "INVALID_REQUEST",
      message: "Identificador da solicitação inválido.",
      status: 400,
    };
  }
  if (!Object.values(CRM_AI_CAPTURE_MODES).includes(mode)) {
    return {
      success: false,
      code: "INVALID_MODE",
      message: "Modo de captura inteligente inválido.",
      status: 400,
    };
  }

  const { data, error } = await access.db.rpc("reserve_crm_ai_capture", {
    p_lawyer_id: access.user.id,
    p_request_id: requestId,
    p_mode: mode,
  });
  if (error) throw error;

  const reservation = data || {};
  if (!reservation.success) {
    const statusByCode = {
      INVALID_REQUEST: 400,
      LAWYER_NOT_FOUND: 404,
      UPGRADE_REQUIRED: 403,
      AI_LIMIT_REACHED: 429,
      INSUFFICIENT_JURIS: 402,
    };
    return {
      ...reservation,
      status: statusByCode[reservation.code] || 403,
    };
  }

  return { ...reservation, status: 200 };
}

export async function completeCrmAiCapture(access, operationId) {
  if (!isClientUuid(operationId)) return null;
  const { data, error } = await access.db.rpc("complete_crm_ai_capture", {
    p_lawyer_id: access.user.id,
    p_operation_id: operationId,
  });
  if (error) throw error;
  return data || null;
}

export async function refundCrmAiCapture(access, operationId, errorCode) {
  if (!isClientUuid(operationId)) return null;
  const { data, error } = await access.db.rpc("refund_crm_ai_capture", {
    p_lawyer_id: access.user.id,
    p_operation_id: operationId,
    p_error_code: String(errorCode || "PROCESSING_FAILED").slice(0, 80),
  });
  if (error) {
    console.error("[CRM/IA] Falha ao estornar reserva:", error);
    return null;
  }
  return data || null;
}

export async function notifyCrmAiBalance(access, reservation) {
  const charged = Number(reservation?.jurisCharged || 0);
  if (charged <= 0) return;
  const newBalance = Number(reservation?.balance || 0);
  const oldBalance = newBalance + charged;
  await checkAndNotifyLowBalance(access.user.id, oldBalance, newBalance);
}

export function serializeCrmAiUsage(reservation) {
  const jurisCharged = Number(reservation?.jurisCharged || 0);
  return {
    planType: reservation?.planType || "FREE",
    used: Number(reservation?.used || 0),
    limit: Number(reservation?.limit || 0),
    remaining: Math.max(
      Number(reservation?.limit || 0) - Number(reservation?.used || 0),
      0,
    ),
    balance: Number(reservation?.balance || 0),
    jurisCost: Number(reservation?.jurisCost ?? jurisCharged),
    jurisCharged,
  };
}
