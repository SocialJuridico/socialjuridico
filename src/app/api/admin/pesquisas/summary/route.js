import OpenAI from "openai";
import {
  CLIENT_QUESTION_KEYS,
  LAWYER_QUESTION_KEYS,
  PLATFORM_UPDATE_QUESTION_KEYS,
  calculateSurveyAverage,
  fetchSurveyData,
  json,
  requireAdminAccess,
} from "../adminSurveys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });
}

function formatFeedbacks(items, role, questionKeys) {
  return items
    .filter((item) => String(item.feedback || "").trim())
    .map((item) => {
      const average = calculateSurveyAverage(item, questionKeys).toFixed(1);
      const feedback = String(item.feedback).trim();
      return `[${role} - Nota Geral Média: ${average}]: "${feedback}"`;
    });
}

function buildPrompt(context) {
  return `Você é um diretor de marketing e copywriter especialista em SaaS B2B jurídico.
Analise os feedbacks reais fornecidos pelos usuários da plataforma Social Jurídico.
Gere insights úteis para marketing, anúncios e landing pages sem inventar depoimentos ou benefícios.

DADOS DAS PESQUISAS:
${JSON.stringify(context, null, 2)}

Responda estritamente com um JSON válido contendo:
- "summary": resumo geral em 3 a 4 frases;
- "strengths": exatamente 3 pontos fortes sustentados pelos dados;
- "quotes": até 3 feedbacks curtos existentes nos dados, apenas com correções leves de escrita;
- "marketingHooks": exatamente 3 ganchos de marketing baseados nos feedbacks.

Não inclua explicações antes ou depois do JSON.`;
}

function normalizeSummary(value) {
  return {
    summary: String(value?.summary || "").trim(),
    strengths: Array.isArray(value?.strengths)
      ? value.strengths.slice(0, 3).map(String)
      : [],
    quotes: Array.isArray(value?.quotes)
      ? value.quotes.slice(0, 3).map(String)
      : [],
    marketingHooks: Array.isArray(value?.marketingHooks)
      ? value.marketingHooks.slice(0, 3).map(String)
      : [],
  };
}

export async function POST() {
  try {
    const access = await requireAdminAccess();
    if (!access.ok) return access.response;

    const openai = getOpenAIClient();
    if (!openai) {
      return json(
        {
          success: false,
          message: "A integração de inteligência artificial não está configurada.",
        },
        503,
      );
    }

    const data = await fetchSurveyData(access.db, { includeUsers: false });
    const lawyerFeedbacks = formatFeedbacks(
      data.advogados,
      "Advogado",
      LAWYER_QUESTION_KEYS,
    );
    const clientFeedbacks = formatFeedbacks(
      data.clientes,
      "Cliente",
      CLIENT_QUESTION_KEYS,
    );
    const platformUpdateFeedbacks = formatFeedbacks(
      data.atualizacao || [],
      "Atualizacao da plataforma",
      PLATFORM_UPDATE_QUESTION_KEYS,
    );

    if (
      !lawyerFeedbacks.length &&
      !clientFeedbacks.length &&
      !platformUpdateFeedbacks.length
    ) {
      return json(
        {
          success: false,
          message: "Ainda não existem comentários suficientes para gerar o resumo.",
        },
        422,
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: "Você analisa pesquisas e retorna somente JSON válido.",
        },
        {
          role: "user",
          content: buildPrompt({
            totalAdvogados: data.advogados.length,
            totalClientes: data.clientes.length,
            totalAtualizacao: data.atualizacao?.length || 0,
            feedbacksAdvogados: lawyerFeedbacks,
            feedbacksClientes: clientFeedbacks,
            feedbacksAtualizacao: platformUpdateFeedbacks,
          }),
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const resultText = completion.choices?.[0]?.message?.content;
    if (!resultText) throw new Error("A IA retornou uma resposta vazia.");

    const summary = normalizeSummary(JSON.parse(resultText));
    if (!summary.summary) throw new Error("Resumo da IA inválido.");

    return json({ success: true, data: summary });
  } catch (error) {
    console.error("[Admin/Pesquisas/Resumo][POST] Erro:", error);
    return json(
      {
        success: false,
        message: "Não foi possível gerar o resumo inteligente das pesquisas.",
      },
      500,
    );
  }
}
