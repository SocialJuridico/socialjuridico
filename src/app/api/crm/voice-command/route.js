import OpenAI from "openai";

import {
  clientFailure,
  clientJson,
  hasValidClientMutationOrigin,
  recordClientAudit,
  requireLawyerClientAccess,
} from "@/lib/lawyerClients/clientServer";
import {
  completeCrmAiCapture,
  CRM_AI_CAPTURE_MODES,
  notifyCrmAiBalance,
  refundCrmAiCapture,
  reserveCrmAiCapture,
  serializeCrmAiUsage,
} from "@/lib/lawyerClients/crmAiCaptureServer";
import {
  isClientUuid,
  normalizeClientText,
} from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

export async function POST(request) {
  let access = null;
  let reservation = null;
  try {
    if (!hasValidClientMutationOrigin(request)) {
      return clientJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    access = await requireLawyerClientAccess(request);
    if (!access.ok) return access.response;
    if (!openai) {
      return clientJson(
        { success: false, message: "Serviço de IA temporariamente indisponível." },
        503,
      );
    }

    const body = await request.json();
    const requestId = String(body.requestId || "");
    const text = normalizeClientText(body.text, 8000);
    if (!isClientUuid(requestId)) {
      return clientJson(
        { success: false, message: "Identificador da solicitação inválido." },
        400,
      );
    }
    if (text.length < 5) {
      return clientJson(
        { success: false, message: "Fale os dados do cliente antes de processar." },
        400,
      );
    }

    reservation = await reserveCrmAiCapture(
      access,
      requestId,
      CRM_AI_CAPTURE_MODES.VOICE,
    );
    if (!reservation.success) {
      return clientJson(
        {
          success: false,
          code: reservation.code,
          message: reservation.message,
          insufficientJuris: reservation.code === "INSUFFICIENT_JURIS",
          limitReached: reservation.code === "AI_LIMIT_REACHED",
          upgradeRequired: reservation.code === "UPGRADE_REQUIRED",
          usage: serializeCrmAiUsage(reservation),
        },
        reservation.status,
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "Você é um extrator de dados para um CRM jurídico brasileiro. Não invente informações. Responda somente JSON válido.",
        },
        {
          role: "user",
          content: `Extraia os dados do cliente a partir da transcrição abaixo. Preencha com string vazia quando a informação não tiver sido dita.\n\nTRANSCRIÇÃO:\n${text}\n\nFORMATO OBRIGATÓRIO:\n{\n  "nome_completo": "",\n  "tipo": "Pessoa Física" ou "Pessoa Jurídica",\n  "cpf_cnpj": "",\n  "rg_ie": "",\n  "estado_civil": "",\n  "profissao": "",\n  "telefone": "",\n  "endereco_completo": "",\n  "email": "",\n  "notas_internas": "Resumo objetivo dos fatos do caso e demais observações ditas."\n}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const extractedData = JSON.parse(
      completion.choices[0]?.message?.content || "{}",
    );
    await completeCrmAiCapture(access, reservation.operationId);
    await notifyCrmAiBalance(access, reservation);
    try {
      await recordClientAudit(access, request, {
        requestId,
        action: "USE_AI_CAPTURE",
        metadata: {
          mode: "VOICE",
          operation_id: reservation.operationId,
          plan_type: reservation.planType,
          juris_charged: Number(reservation.jurisCharged || 0),
        },
      });
    } catch (auditError) {
      console.error("[CRM/Voz] Falha não bloqueante na auditoria:", auditError);
    }

    return clientJson({
      success: true,
      data: extractedData,
      usage: serializeCrmAiUsage(reservation),
      message:
        Number(reservation.jurisCharged || 0) > 0
          ? `${reservation.jurisCharged} Juris utilizados no processamento por voz.`
          : "Processamento por voz incluído no plano PRO.",
    });
  } catch (error) {
    const refund =
      access && reservation?.operationId
        ? await refundCrmAiCapture(
            access,
            reservation.operationId,
            error?.code || "VOICE_FAILED",
          )
        : null;
    const wasRefunded = refund?.status === "REFUNDED";
    console.error("[CRM/Voz] Erro no processamento:", error);
    const failure = clientFailure(
      error,
      "Não foi possível processar o comando de voz.",
    );
    return clientJson(
      {
        success: false,
        refunded: wasRefunded,
        message:
          wasRefunded && Number(reservation?.jurisCharged || 0) > 0
            ? `${failure.message} Os Juris reservados foram devolvidos.`
            : failure.message,
      },
      failure.status,
    );
  }
}
