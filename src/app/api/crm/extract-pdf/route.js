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
import { isClientUuid } from "@/lib/lawyerClients/clientValidation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CAPTURE_BYTES = 15 * 1024 * 1024;
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

function safeFileName(value) {
  try {
    return decodeURIComponent(String(value || "arquivo.pdf"))
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, 180);
  } catch {
    return "arquivo.pdf";
  }
}

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

    const requestId = request.headers.get("x-request-id") || "";
    if (!isClientUuid(requestId)) {
      return clientJson(
        { success: false, message: "Identificador da solicitação inválido." },
        400,
      );
    }

    const contentType = request.headers.get("content-type") || "";
    let buffer;
    let fileType = "";
    let fileName = "arquivo.pdf";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (file && typeof file.arrayBuffer === "function") {
        buffer = Buffer.from(await file.arrayBuffer());
        fileType = file.type || "";
        fileName = safeFileName(file.name);
      }
    } else {
      buffer = Buffer.from(await request.arrayBuffer());
      fileType = contentType;
      fileName = safeFileName(request.headers.get("x-file-name"));
    }

    if (!buffer?.length) {
      return clientJson(
        { success: false, message: "Nenhum arquivo enviado." },
        400,
      );
    }
    if (buffer.length > MAX_CAPTURE_BYTES) {
      return clientJson(
        { success: false, message: "O arquivo deve possuir no máximo 15 MB." },
        413,
      );
    }

    const lowerName = fileName.toLowerCase();
    const isPDF =
      fileType.includes("application/pdf") || lowerName.endsWith(".pdf");
    const isImage =
      fileType.startsWith("image/") ||
      lowerName.endsWith(".png") ||
      lowerName.endsWith(".jpg") ||
      lowerName.endsWith(".jpeg") ||
      lowerName.endsWith(".webp");

    if (!isPDF && !isImage) {
      return clientJson(
        {
          success: false,
          message: "Formato não suportado. Envie PDF, JPG, PNG ou WEBP.",
        },
        400,
      );
    }

    let contextData = "";
    let imageBase64 = null;
    if (isPDF) {
      try {
        const { extractText, getDocumentProxy } = await import("unpdf");
        const pdf = await getDocumentProxy(new Uint8Array(buffer));
        const { text } = await extractText(pdf, { mergePages: true });
        contextData = String(text || "").trim();
        if (contextData.length < 10) {
          return clientJson(
            {
              success: false,
              message:
                "Este PDF parece ser um scan. Envie uma foto clara do documento em JPG ou PNG.",
            },
            400,
          );
        }
      } catch (pdfError) {
        console.error("[CRM/PDF] Falha na leitura:", pdfError);
        return clientJson(
          {
            success: false,
            message:
              "Não foi possível ler o PDF. Envie uma foto clara do documento em JPG ou PNG.",
          },
          400,
        );
      }
    } else {
      imageBase64 = buffer.toString("base64");
    }

    reservation = await reserveCrmAiCapture(
      access,
      requestId,
      CRM_AI_CAPTURE_MODES.PDF,
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

    const prompt = `Analise o documento e extraia somente os dados do cliente, autor ou contratante. Não invente informações. Retorne apenas JSON válido:\n{\n  "nome_completo": "",\n  "tipo": "Pessoa Física" ou "Pessoa Jurídica",\n  "cpf_cnpj": "",\n  "rg_ie": "",\n  "estado_civil": "",\n  "profissao": "",\n  "telefone": "",\n  "endereco_completo": "",\n  "email": "",\n  "notas_internas": "Breve resumo objetivo do documento."\n}`;
    const messages = [
      {
        role: "system",
        content:
          "Você é um extrator de dados para um CRM jurídico brasileiro. Responda somente JSON válido.",
      },
    ];

    if (isImage && imageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${fileType};base64,${imageBase64}` },
          },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `${prompt}\n\nTEXTO EXTRAÍDO:\n${contextData.slice(0, 15000)}`,
      });
    }

    const completion = await openai.chat.completions.create({
      model: isImage ? process.env.OPENAI_MODEL || "gpt-4.1-mini" : process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages,
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
          mode: "PDF",
          operation_id: reservation.operationId,
          plan_type: reservation.planType,
          juris_charged: Number(reservation.jurisCharged || 0),
          file_type: isImage ? "IMAGE" : "PDF",
        },
      });
    } catch (auditError) {
      console.error("[CRM/PDF] Falha não bloqueante na auditoria:", auditError);
    }

    return clientJson({
      success: true,
      data: extractedData,
      usage: serializeCrmAiUsage(reservation),
      message:
        Number(reservation.jurisCharged || 0) > 0
          ? `${reservation.jurisCharged} Juris utilizados na extração inteligente.`
          : "Extração inteligente incluída no plano PRO.",
    });
  } catch (error) {
    const refund =
      access && reservation?.operationId
        ? await refundCrmAiCapture(
            access,
            reservation.operationId,
            error?.code || "PDF_FAILED",
          )
        : null;
    const wasRefunded = refund?.status === "REFUNDED";
    console.error("[CRM/PDF] Erro no processamento:", error);
    const failure = clientFailure(error, "Não foi possível processar o documento.");
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
