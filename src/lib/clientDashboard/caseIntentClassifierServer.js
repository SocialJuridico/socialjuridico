import OpenAI from "openai";

import {
  TRIAGE_QUESTIONS,
  computeFallbackIntentScore,
} from "./caseIntentQuestions";

const CLASSIFY_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

const INTENT_SCHEMA = {
  name: "intencao_fechamento_socialjuridico",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["intencaoFechamento", "justificativa"],
    properties: {
      intencaoFechamento: { type: "integer", minimum: 0, maximum: 100 },
      justificativa: { type: "string" },
    },
  },
};

function clampText(value, max) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function describeAnswers(respostas) {
  const answers = respostas && typeof respostas === "object" ? respostas : {};

  return TRIAGE_QUESTIONS.map((question) => {
    const chosen = answers[question.id];
    const option = question.options.find((item) => item.value === chosen);
    return `- ${question.question}\n  Resposta: ${
      option ? option.label : "Não respondida"
    }`;
  }).join("\n");
}

function buildPrompt({ respostas, area, descricao }) {
  return `Você é um analista de qualificação de leads jurídicos do SocialJurídico.
Com base nas respostas de triagem do cliente e no resumo do caso, calcule um
ÍNDICE DE INTENÇÃO DE FECHAMENTO de 0 a 100, representando a probabilidade de
este cliente efetivamente avançar e contratar um advogado — NÃO é uma
garantia de pagamento, é uma leitura das intenções declaradas.

REGRAS:
1. Priorize o que o cliente declarou explicitamente nas respostas abaixo.
2. Cliente que só busca informação, que já tem advogado contratado, ou que
   não pretende contratar agora deve pontuar baixo (abaixo de 40).
3. Cliente que quer conduzir a situação agora, sem advogado, disponível para
   conversar imediatamente, deve pontuar alto (80 ou mais).
4. Responda somente no schema solicitado. justificativa deve ter 1 a 2
   frases objetivas.

RESPOSTAS DA TRIAGEM:
${describeAnswers(respostas)}

ÁREA JURÍDICA: ${area || "não informada"}
RESUMO DO CASO: ${clampText(descricao, 2000) || "não informado"}`;
}

function fallbackResult(respostas, classifierError = null) {
  return {
    intencaoFechamento: computeFallbackIntentScore(respostas),
    meta: {
      justificativa: "",
      classifierError,
    },
  };
}

/**
 * Classifica a intenção de fechamento (0-100) a partir das respostas da
 * triagem do cliente. Nunca lança: em qualquer falha retorna o score
 * determinístico calculado por computeFallbackIntentScore.
 *
 * @param {object} params
 * @param {object} params.respostas mapa { questionId: optionValue }
 * @param {string} [params.area]
 * @param {string} [params.descricao]
 */
export async function classifyClosingIntent({ respostas, area, descricao }) {
  if (!openai) return fallbackResult(respostas, "AI_UNAVAILABLE");

  try {
    const completion = await openai.chat.completions.create({
      model: CLASSIFY_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Você responde somente JSON válido para qualificação de leads jurídicos. Seja objetivo e conservador.",
        },
        { role: "user", content: buildPrompt({ respostas, area, descricao }) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: INTENT_SCHEMA,
      },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = {};
    }

    const score = Number(parsed.intencaoFechamento);
    if (!Number.isFinite(score)) {
      return fallbackResult(respostas, "AI_INVALID_RESPONSE");
    }

    return {
      intencaoFechamento: Math.max(0, Math.min(100, Math.round(score))),
      meta: {
        justificativa: clampText(parsed.justificativa, 500),
        classifierError: null,
      },
    };
  } catch (error) {
    console.error("[CasoIA/IntençãoFechamento] Falha não fatal:", {
      status: error?.status,
      message: error?.message,
    });
    return fallbackResult(respostas, "AI_REQUEST_FAILED");
  }
}
