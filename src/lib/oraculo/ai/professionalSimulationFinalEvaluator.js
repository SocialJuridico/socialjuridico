import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// PROFESSIONAL_SIMULATION_FINAL_EVALUATOR — avalia a atuação do estudante
// como advogado simulado ao final de um Atendimento Jurídico Simulado do
// Radar Acadêmico. Substitui o INTERVIEW_FINAL_EVALUATOR (6 indicadores de
// limites de aluno) exclusivamente nesse fluxo: aqui o aluno é avaliado como
// profissional em treinamento, não penalizado por agir como advogado.

const AXIS_PROPERTIES = {
  type: "object",
  additionalProperties: false,
  required: ["score", "level", "feedback"],
  properties: {
    score: { type: "integer", minimum: 0, maximum: 100 },
    level: {
      type: "string",
      enum: ["Insuficiente", "Precisa desenvolver", "Adequado com ressalvas", "Bom", "Excelente"],
    },
    feedback: { type: "string" },
  },
};

const SCHEMA = {
  name: "professional_simulation_evaluation_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "specialty_focus",
      "first_consultation_transparency",
      "ethics_and_knowledge",
      "overall_score",
      "summary",
      "strengths",
      "development_points",
      "critical_flags",
    ],
    properties: {
      specialty_focus: AXIS_PROPERTIES,
      first_consultation_transparency: AXIS_PROPERTIES,
      ethics_and_knowledge: AXIS_PROPERTIES,
      overall_score: { type: "integer", minimum: 0, maximum: 100 },
      summary: { type: "string" },
      strengths: { type: "array", items: { type: "string" } },
      development_points: { type: "array", items: { type: "string" } },
      critical_flags: { type: "array", items: { type: "string" } },
    },
  },
};

const SYSTEM_PROMPT = `Você é o PROFESSIONAL_SIMULATION_FINAL_EVALUATOR do Anjo Acadêmico.

Sua função é avaliar a atuação do estudante em um Atendimento Jurídico
Simulado com cliente IA. Este atendimento ocorreu em caso do Radar Acadêmico.
Neste contexto, o estudante estava autorizado a atuar como advogado em
ambiente simulado.

Portanto, NÃO penalize o estudante simplesmente por: se apresentar como
advogado; orientar juridicamente; explicar caminhos possíveis; conduzir
consulta; sugerir próximos passos; demonstrar estratégia jurídica.

Avalie a qualidade da atuação profissional simulada.

EIXOS DE AVALIAÇÃO

1. ESPECIALIDADE E FOCO DE ATUAÇÃO
Avalie se o estudante: identificou corretamente a área jurídica predominante;
manteve foco compatível com o caso; fez perguntas relacionadas à
especialidade; delimitou o escopo da atuação; percebeu necessidade de outra
especialidade, se aplicável; evitou generalidades vazias.

2. TRANSPARÊNCIA NA PRIMEIRA CONSULTA
Avalie se o estudante: explicou limites da primeira consulta; evitou
promessa de resultado; explicou necessidade de análise documental;
diferenciou possibilidade de certeza; falou sobre riscos; apresentou
próximos passos com honestidade; não pressionou contratação; não criou
expectativa irreal.

3. ÉTICA E CONHECIMENTO
Avalie se o estudante: demonstrou conhecimento jurídico compatível; não
inventou fundamento; não citou lei falsa; preservou ética; não orientou
fraude; não sugeriu ocultação de fatos; não solicitou dados desnecessários;
manteve respeito; identificou documentos e provas relevantes; usou
linguagem acessível.

IMPORTANTE
Use somente a conversa analisada como evidência. Não invente mensagens. Não
atribua nota por quantidade de mensagens. Não premie excesso de confiança.
Não confunda atuação firme com promessa de resultado. Não confunda cautela
com falta de conhecimento. Quando houver ponto negativo ou positivo, reflita
isso no feedback do eixo correspondente, com linguagem pedagógica, técnica e
respeitosa. overall_score pode ser a média ponderada dos três eixos
(especialidade 30%, transparência 35%, ética e conhecimento 35%).
critical_flags: liste apenas riscos graves confirmados na conversa (vazio se
nenhum). Retorne somente o objeto estruturado solicitado, em português.`;

function transcript(messages) {
  return (messages || [])
    .filter((m) => m.sender_type !== "SYSTEM")
    .map((m) => `${m.sender_type === "STUDENT" ? "ESTUDANTE" : "CLIENTE SIMULADO"}: ${m.content}`)
    .join("\n");
}

/**
 * Gera a avaliação final do atendimento jurídico simulado (chave ANJO).
 * Nunca lança. Retorna { ok, data, usage } ou { ok:false, error }.
 */
export async function generateProfessionalSimulationEvaluation(messages) {
  const result = await callAngelJson({
    system: SYSTEM_PROMPT,
    user: `CONVERSA DO ATENDIMENTO JURÍDICO SIMULADO:\n"""${transcript(messages).slice(0, 12000)}"""`,
    schema: SCHEMA,
    temperature: 0,
    maxTokens: 900,
  });

  if (!result.ok) {
    return { ok: false, error: result.error || "AI_INVALID_RESPONSE" };
  }

  return {
    ok: true,
    usage: result.usage,
    promptVersion: PROMPT_VERSIONS.PROFESSIONAL_SIMULATION_EVALUATOR,
    schemaVersion: SCHEMA_VERSION,
    feature: AI_FEATURES.ACADEMIC_ANGEL_PROFESSIONAL_SIMULATION_EVALUATION,
    data: result.data,
  };
}
