import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// ORACULO_CONDUCT_GUARD — analisa a mensagem do estudante antes do envio.
// Atua na entrevista simulada (treino) e na real (proteção ativa).

const SCHEMA = {
  name: "oraculo_conduct_guard_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "risk_level",
      "action",
      "flags",
      "problematic_excerpt",
      "student_message",
      "supervisor_review_recommended",
    ],
    properties: {
      risk_level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      action: {
        type: "string",
        enum: ["ALLOW", "WARN", "BLOCK", "BLOCK_AND_ESCALATE"],
      },
      flags: { type: "array", items: { type: "string" } },
      problematic_excerpt: { type: "string" },
      student_message: { type: "string" },
      supervisor_review_recommended: { type: "boolean" },
    },
  },
};

const SYSTEM_PROMPT = `Você é o módulo ORACULO_CONDUCT_GUARD do Anjo Acadêmico.
Analise a mensagem que um estudante de Direito pretende enviar numa atividade
acadêmica. Você NÃO responde ao cliente, NÃO reescreve a mensagem como resposta
final e NÃO produz parecer jurídico. Você classifica risco comunicacional e de
extrapolação dos limites acadêmicos.

ANALISE se a mensagem contém: promessa de resultado; conclusão jurídica
definitiva; aconselhamento jurídico conclusivo; instrução processual definitiva;
afirmação de valor de indenização; pressão para contratar advogado; apresentação
indevida como advogado; linguagem agressiva; linguagem discriminatória; coleta
excessiva de dados pessoais; solicitação desnecessária de dados sensíveis; risco
à privacidade; linguagem coercitiva; certeza jurídica enganosa; outra
extrapolação relevante.

NÍVEIS
LOW: compatível com coleta de informações/esclarecimento/entrevista.
MEDIUM: formulação arriscada, conclusão prematura ou linguagem a revisar.
HIGH: extrapolação clara; não deve ser enviada.
CRITICAL: risco grave (dano, exposição de dados, fraude de identidade
profissional, coerção); bloqueio e possível escalada humana.

action: ALLOW (LOW), WARN (MEDIUM), BLOCK (HIGH), BLOCK_AND_ESCALATE (CRITICAL).
student_message: orientação objetiva e não punitiva ao estudante quando houver
intervenção (vazio se ALLOW).

SEJA PROPORCIONAL. Não marque pergunta factual simples como risco. Não puna
linguagem imperfeita. Explique objetivamente. Retorne somente o schema.`;

// Defesa em profundidade determinística (não depende da IA).
const CRITICAL_PATTERNS = [
  { re: /sou (seu|o) advogad[oa]|como (seu|um) advogad[oa]/i, flag: "LAWYER_IMPERSONATION" },
  { re: /senha( banc[aá]ria)?|c[oó]digo do cart[aã]o|cvv/i, flag: "PRIVACY_RISK" },
];
const HIGH_PATTERNS = [
  { re: /causa ganha|processo ganho|voc[eê] (vai|com certeza) ganh/i, flag: "PROMISE_OF_RESULT" },
  { re: /garant(o|ia|imos) (o |a |que )?(ganho|resultado|vit[oó]ria|indeniza)/i, flag: "PROMISE_OF_RESULT" },
  { re: /voc[eê] tem direito garantido/i, flag: "MISLEADING_CERTAINTY" },
];

function deterministic(message) {
  const text = String(message || "");
  for (const p of CRITICAL_PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      return {
        risk_level: "CRITICAL",
        action: "BLOCK_AND_ESCALATE",
        flags: [p.flag],
        problematic_excerpt: m[0],
        student_message:
          "Revise sua mensagem. Ela apresenta risco grave para a atividade acadêmica.",
        supervisor_review_recommended: true,
      };
    }
  }
  for (const p of HIGH_PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      return {
        risk_level: "HIGH",
        action: "BLOCK",
        flags: [p.flag],
        problematic_excerpt: m[0],
        student_message:
          "Revise sua mensagem. Ela transmite garantia de resultado jurídico ao cliente.",
        supervisor_review_recommended: false,
      };
    }
  }
  return null;
}

function normalize(raw) {
  const action = raw.action || "ALLOW";
  return {
    riskLevel: raw.risk_level || "LOW",
    action,
    flags: Array.isArray(raw.flags) ? raw.flags : [],
    excerpt: raw.problematic_excerpt || "",
    studentMessage: raw.student_message || "",
    supervisorReviewRecommended: Boolean(raw.supervisor_review_recommended),
    blocked: action === "BLOCK" || action === "BLOCK_AND_ESCALATE",
    escalate: action === "BLOCK_AND_ESCALATE",
    warn: action === "WARN",
    feature: AI_FEATURES.ACADEMIC_ANGEL_CONDUCT_GUARD,
    promptVersion: PROMPT_VERSIONS.CONDUCT_GUARD,
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Avalia a conduta da mensagem do estudante (chave ANJO). Nunca lança.
 * Retorna { ...normalized, usage }.
 */
export async function evaluateConduct(message) {
  const det = deterministic(message);
  if (det) {
    return { ...normalize(det), usage: null, deterministic: true };
  }

  const result = await callAngelJson({
    system: SYSTEM_PROMPT,
    user: `MENSAGEM DO ESTUDANTE:\n"""${String(message || "").slice(0, 1500)}"""`,
    schema: SCHEMA,
    temperature: 0,
    maxTokens: 320,
  });

  if (!result.ok) {
    // Falha do Anjo: não bloqueia por IA (só o determinístico bloqueia sem IA).
    return {
      ...normalize({ risk_level: "LOW", action: "ALLOW", flags: [] }),
      usage: null,
      angelUnavailable: true,
    };
  }

  return { ...normalize(result.data), usage: result.usage };
}
