import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callAngelJson,
} from "./oraculoOpenAIClients";

// PROFESSIONAL_SIMULATION_ETHICS_MONITOR — substitui o ORACULO_CONDUCT_GUARD
// exclusivamente no Atendimento Jurídico Simulado do Radar Acadêmico. Aqui o
// aluno está autorizado a atuar como advogado simulado: não bloqueia por
// "agir como advogado", orientar juridicamente ou conduzir a consulta.
// Continua observando e registrando qualidade ética/profissional para a
// avaliação final; só bloqueia riscos críticos universais (fraude,
// falsificação, dado sensível real, discriminação, ameaça, crime).

const SCHEMA = {
  name: "professional_simulation_monitor_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "action",
      "risk_level",
      "flags",
      "problematic_excerpt",
      "evaluation_note",
      "critical_block_reason",
    ],
    properties: {
      action: { type: "string", enum: ["ALLOW", "SOFT_FLAG", "BLOCK_CRITICAL"] },
      risk_level: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"] },
      flags: { type: "array", items: { type: "string" } },
      problematic_excerpt: { type: "string" },
      evaluation_note: { type: "string" },
      critical_block_reason: { type: "string" },
    },
  },
};

const SYSTEM_PROMPT = `Você é o PROFESSIONAL_SIMULATION_ETHICS_MONITOR do Anjo Acadêmico.

Você analisa mensagens de um estudante em um Atendimento Jurídico Simulado do
Radar Acadêmico. Neste contexto, o estudante está autorizado a atuar como
advogado em ambiente simulado com cliente IA.

NÃO marque como violação apenas porque ele:
- se apresenta como advogado;
- orienta juridicamente;
- explica caminhos possíveis;
- sugere próximos passos;
- fala como profissional.

Sua função é observar a qualidade ética e profissional da atuação.

Registre como SOFT_FLAG (action=SOFT_FLAG, risk_level MEDIUM ou HIGH):
- promessa de resultado;
- excesso de confiança;
- falta de transparência;
- linguagem muito técnica;
- pressão para contratar;
- ausência de análise documental antes de conclusão;
- possível fundamento jurídico inventado;
- pedido de informação desnecessária.

Use BLOCK_CRITICAL (risk_level CRITICAL) apenas para:
- orientação de fraude;
- falsificação de documento;
- mentira processual;
- ocultação/destruição de prova;
- solicitação de senha ou dado sensível real;
- discriminação;
- ameaça;
- assédio;
- instrução criminosa;
- outro risco crítico universal.

Nos demais casos, action=ALLOW, risk_level LOW, sem flags.

evaluation_note: nota objetiva e não punitiva para uso na avaliação final
(vazio se ALLOW). critical_block_reason: motivo objetivo do bloqueio (vazio
se não for BLOCK_CRITICAL). Retorne somente o schema.`;

// Defesa em profundidade determinística — só para riscos críticos universais.
// Promessa de resultado e apresentação como advogado NÃO bloqueiam aqui.
const CRITICAL_PATTERNS = [
  { re: /senha( banc[aá]ria)?|c[oó]digo do cart[aã]o|cvv/i, flag: "PRIVACY_RISK" },
  {
    re: /invent(ar|e|amos) (uma |um )?(testemunha|prova|documento)|falsificar? (um |o )?documento/i,
    flag: "FRAUD",
  },
];

function deterministic(message) {
  const text = String(message || "");
  for (const p of CRITICAL_PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      return {
        action: "BLOCK_CRITICAL",
        risk_level: "CRITICAL",
        flags: [p.flag],
        problematic_excerpt: m[0],
        evaluation_note: "",
        critical_block_reason:
          "Revise sua mensagem. Ela apresenta risco crítico (fraude ou exposição de dado sensível).",
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
    studentMessage: raw.critical_block_reason || "",
    evaluationNote: raw.evaluation_note || "",
    supervisorReviewRecommended: action === "BLOCK_CRITICAL",
    blocked: action === "BLOCK_CRITICAL",
    escalate: action === "BLOCK_CRITICAL",
    warn: action === "SOFT_FLAG",
    feature: AI_FEATURES.ACADEMIC_ANGEL_PROFESSIONAL_SIMULATION_MONITOR,
    promptVersion: PROMPT_VERSIONS.PROFESSIONAL_SIMULATION_MONITOR,
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * Avalia a conduta profissional simulada (chave ANJO). Nunca lança.
 * Retorna { ...normalized, usage }.
 */
export async function evaluateProfessionalSimulationConduct(message) {
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
      ...normalize({ action: "ALLOW", risk_level: "LOW", flags: [] }),
      usage: null,
      angelUnavailable: true,
    };
  }

  return { ...normalize(result.data), usage: result.usage };
}
