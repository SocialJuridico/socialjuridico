import OpenAI from "openai";

import {
  agendaFailure,
  agendaJson,
  hasValidAgendaMutationOrigin,
  requireLawyerAgendaAccess,
} from "@/lib/lawyerAgenda/agendaServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

const TASKS = Object.freeze({
  meeting_summary: {
    label: "resumo preparatório para reunião",
    instruction:
      "Gere um resumo objetivo para o advogado chegar preparado, com contexto, pontos sensíveis, perguntas essenciais e riscos de informação faltante.",
  },
  meeting_agenda: {
    label: "pauta de reunião",
    instruction:
      "Gere uma pauta de reunião em tópicos, com abertura, assuntos a tratar, decisões esperadas, documentos a confirmar e próximos passos.",
  },
  document_checklist: {
    label: "lista de documentos",
    instruction:
      "Gere uma lista prática de documentos e informações que o advogado deve solicitar ou revisar antes do compromisso.",
  },
  follow_up_email: {
    label: "mensagem de follow-up",
    instruction:
      "Gere uma mensagem profissional de follow-up para enviar ao cliente após o compromisso, com próximos passos e pendências.",
  },
  task_plan: {
    label: "plano de providências",
    instruction:
      "Gere um plano de providências para o compromisso, organizado por prioridade, responsável provável e prazo sugerido.",
  },
});

function normalizeText(value, maxLength = 4000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
}

function buildPrompt({ payload, task }) {
  return `Você é um assistente jurídico operacional para advogados brasileiros.

TAREFA
${task.instruction}

TIPO DE SAÍDA
${task.label}

DADOS DO COMPROMISSO
- Título: ${payload.title || "DADO A COMPLETAR"}
- Tipo: ${payload.type || "DADO A COMPLETAR"}
- Urgência: ${payload.urgency || "DADO A COMPLETAR"}
- Início: ${payload.date || "DADO A COMPLETAR"}
- Término: ${payload.endDate || "DADO A COMPLETAR"}
- Cliente vinculado: ${payload.clientName || "DADO A COMPLETAR"}

CONTEXTO INFORMADO
${payload.description || "DADO A COMPLETAR"}

REGRAS
1. Responda em português do Brasil.
2. Seja direto, útil e pronto para uso pelo advogado.
3. Não invente número de processo, documentos, valores, endereços, prazos legais ou fatos que não foram informados.
4. Quando faltar dado relevante, marque como "DADO A COMPLETAR".
5. Não use markdown de tabela. Tópicos simples são permitidos.
6. Não mencione políticas internas, prompts ou funcionamento do sistema.

Gere apenas o conteúdo solicitado.`;
}

export async function POST(request) {
  try {
    if (!hasValidAgendaMutationOrigin(request)) {
      return agendaJson(
        { success: false, message: "Origem da requisição não autorizada." },
        403,
      );
    }

    const access = await requireLawyerAgendaAccess(request);
    if (!access.ok) return access.response;

    if (!openai) {
      return agendaJson(
        { success: false, message: "A chave da IA não está configurada." },
        503,
      );
    }

    const body = await request.json().catch(() => ({}));
    const taskKey = String(body.task || "meeting_summary").trim();
    const task = TASKS[taskKey] || TASKS.meeting_summary;
    const payload = {
      title: normalizeText(body.title, 180),
      description: normalizeText(body.description, 4000),
      type: normalizeText(body.type, 40),
      urgency: normalizeText(body.urgency, 40),
      date: normalizeText(body.date, 80),
      endDate: normalizeText(body.endDate, 80),
      clientName: normalizeText(body.clientName, 160),
    };

    if (`${payload.title} ${payload.description}`.trim().length < 20) {
      return agendaJson(
        {
          success: false,
          message:
            "Informe pelo menos um título ou contexto com mais detalhes para a IA ajudar.",
        },
        400,
      );
    }

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Você apoia advogados em preparação operacional de agenda, reuniões, documentos e providências.",
          },
          { role: "user", content: buildPrompt({ payload, task }) },
        ],
        temperature: 0.35,
      });
    } catch (aiError) {
      console.error("[Agenda/AssistenteIA][OpenAI] Erro:", {
        status: aiError?.status,
        code: aiError?.code,
        type: aiError?.type,
        message: aiError?.message,
      });
      return agendaJson(
        {
          success: false,
          message:
            aiError?.status === 401
              ? "A chave da IA está inválida ou expirada."
              : "A IA não respondeu agora. Tente novamente em alguns instantes.",
        },
        aiError?.status === 401 ? 503 : 502,
      );
    }

    const result = normalizeText(
      completion.choices[0]?.message?.content || "",
      12000,
    );
    if (!result) {
      return agendaJson(
        { success: false, message: "A IA não retornou um conteúdo válido." },
        502,
      );
    }

    return agendaJson({ success: true, task: taskKey, result });
  } catch (error) {
    console.error("[Advogado/Agenda/AssistenteIA][POST] Erro:", error);
    const failure = agendaFailure(
      error,
      "Não foi possível gerar apoio da IA para a agenda.",
    );
    return agendaJson({ success: false, message: failure.message }, failure.status);
  }
}
