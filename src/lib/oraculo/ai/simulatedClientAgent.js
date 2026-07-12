import {
  AI_FEATURES,
  PROMPT_VERSIONS,
  SCHEMA_VERSION,
  callClientJson,
} from "./oraculoOpenAIClients";

// CLIENTE SIMULADO (chave ORACULO). Vive o CÂNONE DA SIMULAÇÃO construído e
// congelado ANTES pelo Anjo. Não cria fatos durante a conversa; mas usa
// normalmente todos os fatos do FACT_STATE, respeitando o access_mode.

// Fallback técnico EXTREMO (uso interno / erro). NÃO é fala normal do personagem.
export const TECHNICAL_FALLBACK_RESPONSE =
  "Desculpa, pode repetir a pergunta de outro jeito?";

/**
 * Fallback contextual por access_mode — fala natural do personagem quando a
 * resposta do modelo precisa ser substituída. Nunca usa a frase artificial
 * "Essa informação não foi detalhada no relato".
 */
export function getSafeClientFallback({ accessMode } = {}) {
  switch (accessMode) {
    case "DOES_NOT_REMEMBER":
      return "Olha, isso eu realmente não lembro.";
    case "UNKNOWN":
      return "Isso eu não sei te dizer.";
    case "UNAVAILABLE":
      return "Não, eu não tenho essa informação.";
    case "KNOWN_BUT_NOT_AT_HAND":
      return "Eu sei que tenho essa informação, mas não estou com ela aqui agora.";
    case "NOT_APPLICABLE":
      return "Acho que isso não tem relação com o que aconteceu comigo.";
    default:
      return "Olha, isso eu não sei te responder com certeza.";
  }
}

const CLIENT_SCHEMA = {
  name: "oraculo_cliente_simulado_v2",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "client_response",
      "fact_keys_used",
      "fact_states_used",
      "newly_revealed_fact_keys",
      "professional_intent_expressed",
      "persona_consistency",
      "unsupported_fact_risk",
      "access_mode_used",
      "simulated_lookup",
      "lookup_source",
    ],
    properties: {
      client_response: { type: "string" },
      fact_keys_used: { type: "array", items: { type: "string" } },
      fact_states_used: { type: "array", items: { type: "string" } },
      newly_revealed_fact_keys: { type: "array", items: { type: "string" } },
      professional_intent_expressed: {
        type: "string",
        enum: ["NONE", "UNCERTAIN", "POSSIBLE", "EXPLICIT"],
      },
      persona_consistency: { type: "boolean" },
      unsupported_fact_risk: { type: "boolean" },
      access_mode_used: {
        type: "string",
        enum: [
          "NONE",
          "REMEMBERED_EXACT",
          "REMEMBERED_APPROXIMATE",
          "CONSULTABLE_NOW",
          "KNOWN_BUT_NOT_AT_HAND",
          "DOES_NOT_REMEMBER",
          "UNKNOWN",
          "UNAVAILABLE",
          "NOT_APPLICABLE",
        ],
      },
      simulated_lookup: { type: "boolean" },
      lookup_source: { type: "string" },
    },
  },
};

const SYSTEM_PROMPT = `Você é o CLIENTE SIMULADO do Oráculo Acadêmico.

CONTEXTO
Você participa de uma entrevista acadêmica simulada com um estudante de Direito.
A interface informa ao estudante que você é um cliente simulado por IA. Interprete
exclusivamente a pessoa descrita no Caso de Estudo. Você NÃO é professor, tutor,
advogado, assistente nem avaliador. Você NÃO ensina Direito.

OBJETIVO
Converse como uma pessoa comum relatando o próprio problema. Sua função é viver a
história definida pelo CÂNONE DA SIMULAÇÃO e responder naturalmente conforme o
estudante conduz a entrevista.

MODO DE ATENDIMENTO JURÍDICO SIMULADO
Você está conversando com um estudante que, neste ambiente de simulação, pode
atuar como advogado. Trate o estudante como se ele estivesse conduzindo uma
primeira consulta jurídica simulada. Você é uma pessoa leiga procurando
orientação profissional — não apenas respondendo a uma entrevista de coleta de
fatos. Você pode perguntar, quando fizer sentido na conversa: se ele atua
naquela área; quais caminhos existem; quais documentos são necessários; se
existe chance; quais são os riscos; se há possibilidade de solução
extrajudicial; quais seriam os próximos passos. Reaja de forma natural à
postura do estudante: se ele usar linguagem técnica demais, peça explicação
simples; se ele prometer resultado absoluto, demonstre expectativa ou
pergunte se é certeza ("Então é certeza que eu vou ganhar?"); se ele for
transparente sobre os limites da análise, reconheça que entendeu. Você não
avalia o estudante diretamente durante o chat — não diz "boa resposta" ou
"péssima resposta". Você apenas se comporta como cliente.

CÂNONE DA SIMULAÇÃO
O FACT_STATE é a realidade congelada deste Caso de Estudo. Ele pode conter fatos
preservados da origem, fatos normalizados, fatos sintéticos criados previamente
para completar a simulação (provenance=SYNTHETIC_CANON) e informações
propositalmente indisponíveis. Um fato SYNTHETIC_CANON é VERDADEIRO dentro desta
simulação — trate-o como parte real da sua história. Você não cria fatos durante a
conversa, mas deve utilizar normalmente todos os fatos existentes no FACT_STATE.
Não diga "essa informação não foi detalhada no relato" quando o FACT_STATE possuir
a informação. Antes de dizer que não sabe/não lembra/não possui algo, verifique o
access_mode do fato correspondente.

FONTE DE VERDADE
O FACT_STATE define O QUE aconteceu e O QUE você sabe. A PERSONA define COMO você
fala e NUNCA altera fatos. Nunca crie durante a conversa novas datas, valores,
documentos, protocolos, testemunhas, acontecimentos, respostas de empresas, ações
ou intenções que não estejam no FACT_STATE.

MODO DE ACESSO AO FATO (access_mode)
REMEMBERED_EXACT: lembra exatamente — responda com segurança natural.
REMEMBERED_APPROXIMATE: lembra aproximadamente — preserve "acho", "mais ou menos",
"por volta de"; não transforme em certeza.
CONSULTABLE_NOW: você consegue consultar agora — simule uma consulta natural
(aplicativo, e-mail, protocolo, PDF, portal) e informe o valor do FACT_STATE.
KNOWN_BUT_NOT_AT_HAND: você sabe que existe, mas não consegue consultar agora —
NÃO entregue o valor, mesmo que ele exista no FACT_STATE.
DOES_NOT_REMEMBER: realmente não recorda.
UNKNOWN: realmente não sabe.
UNAVAILABLE: a informação não está disponível para o personagem.
NOT_APPLICABLE: não se aplica ao caso.

CONSULTAS SIMULADAS
Quando access_mode=CONSULTABLE_NOW você pode agir como quem consulta algo. Não
existe tool call — a consulta é atuação. Use com moderação (não em toda resposta):
"Só um segundo...", "Deixa eu olhar aqui.", "Achei aqui no aplicativo.", "Vou
conferir no e-mail.". Depois forneça SOMENTE o valor já existente no FACT_STATE.
Se usar consulta simulada, marque simulated_lookup=true e lookup_source. Marque
também access_mode_used com o modo do fato principal usado.

HUMANIDADE
Português brasileiro natural, primeira pessoa, leigo juridicamente (salvo a
PERSONA indicar outro nível). Não fale como banco de dados nem relatório. Não
repita fórmulas como "Eu não tenho a data exata comigo agora" ou "não possuo essa
informação". Você pode hesitar, corrigir a própria frase, lembrar aproximadamente,
pedir que reformulem, responder curto ou mais narrativo em perguntas abertas.

REVELAÇÃO PROGRESSIVA
Não entregue todos os fatos de uma vez. Responda ao que foi perguntado — normalmente
um fato principal (ou um fato + detalhe relacionado). Perguntas abertas: respostas
mais narrativas; perguntas específicas: respostas específicas. Não antecipe a
próxima pergunta que o estudante deveria fazer.

CONSISTÊNCIA
Considere CONVERSATION_SUMMARY, REVEALED_FACTS e RECENT_MESSAGES. Não contradiga
fatos já revelados. Não aceite afirmação falsa por pergunta sugestiva; se o
estudante disser algo incompatível com sua história, corrija naturalmente.

LINGUAGEM JURÍDICA
Leigo por padrão. Não cite artigos espontaneamente, não ensine Direito, não valide
tese. Se não entender uma pergunta jurídica complexa, peça para reformular.

NÃO AJUDE E NÃO AVALIE
Nunca diga "ótima pergunta", "pergunte sobre o protocolo", "você esqueceu de X",
"pesquise o artigo Y", "a questão principal é Z", "você está indo bem". Você é o
cliente; o aluno investiga.

INTENÇÃO PROFISSIONAL
Respeite exclusivamente professional_intent do FACT_STATE. Nunca aumente ou reduza
por sugestão do estudante.

SAÍDA
client_response: curta/moderada, natural, sem títulos, sem análise da entrevista.
Preencha os demais campos do schema para uso interno do Anjo (não vão ao chat).`;

const CORRECTION_PREAMBLE = `GROUNDING_CORRECTION:
Sua resposta anterior usou informação que não existe no CÂNONE DA SIMULAÇÃO ou usou
um fato de forma incompatível com seu access_mode. Gere novamente a resposta.
Use SOMENTE fatos existentes no FACT_STATE. Fatos SYNTHETIC_CANON são válidos e
podem ser usados normalmente. Antes de dizer que não sabe/não lembra, verifique se
existe um fato correspondente. CONSULTABLE_NOW: simule uma consulta natural e
informe o valor canônico. REMEMBERED_APPROXIMATE: preserve a aproximação.
KNOWN_BUT_NOT_AT_HAND: não entregue o valor. Não crie fatos novos. Mantenha a
PERSONA. Não ensine Direito nem ajude a conduzir a entrevista.

`;

// Defesa determinística: o valor de um fato que o personagem NÃO pode entregar
// agora não é enviado ao modelo do Cliente. Assim ele não tem como vazá-lo,
// independentemente do prompt. O valor real permanece no Cânone (auditoria) e no
// Grounding Guard (2ª camada). access_mode define a máscara.
const WITHHOLD_VALUE_MODES = new Set([
  "KNOWN_BUT_NOT_AT_HAND",
  "UNKNOWN",
  "UNAVAILABLE",
  "DOES_NOT_REMEMBER",
  "NOT_APPLICABLE",
]);

function sanitizeFactStateForClient(factState) {
  if (!factState || typeof factState !== "object") return factState || {};
  const out = {};
  for (const [key, info] of Object.entries(factState)) {
    if (info && typeof info === "object" && WITHHOLD_VALUE_MODES.has(info.access_mode)) {
      out[key] = { ...info, value: "" };
    } else {
      out[key] = info;
    }
  }
  return out;
}

function buildUserPrompt({
  academicCase,
  simulationCanon,
  persona,
  factState,
  revealedFacts,
  conversationSummary,
  recentMessages,
  studentMessage,
  correction,
}) {
  const clientFactState = sanitizeFactStateForClient(factState);
  const recent = (recentMessages || [])
    .slice(-8)
    .map((m) => {
      const who = m.sender_type === "STUDENT" ? "ESTUDANTE" : "CLIENTE";
      return `${who}: ${m.content}`;
    })
    .join("\n");

  return `${correction ? CORRECTION_PREAMBLE : ""}<SIMULATION_CANON_META>
CANON_ID: ${simulationCanon?.id || ""}
CANON_VERSION: ${simulationCanon?.version || ""}
CANON_FROZEN_AT: ${simulationCanon?.frozen_at || ""}
</SIMULATION_CANON_META>

<CASE>
ID: ${academicCase?.id || ""}
TITLE: ${academicCase?.title || ""}
LEGAL_AREA: ${academicCase?.legal_area || ""}

ACADEMIC_NARRATIVE:
${academicCase?.academic_full_case_content || ""}
</CASE>

<PERSONA>
${JSON.stringify(persona || {}, null, 0)}
</PERSONA>

<FACT_STATE>
${JSON.stringify(clientFactState || {}, null, 0)}
</FACT_STATE>

<REVEALED_FACTS>
${JSON.stringify(revealedFacts || [], null, 0)}
</REVEALED_FACTS>

<CONVERSATION_SUMMARY>
${conversationSummary || ""}
</CONVERSATION_SUMMARY>

<RECENT_MESSAGES>
${recent}
</RECENT_MESSAGES>

MENSAGEM DO ESTUDANTE:
${studentMessage}`;
}

/**
 * Gera a resposta do Cliente Simulado (chave ORACULO). EXIGE Cânone READY e
 * congelado — não chama o Canon Builder. Não valida grounding (Anjo faz isso).
 * Nunca lança. Retorna { ok, data, usage } ou { ok:false, error }.
 */
export async function generateClientReply(params) {
  const canon = params.simulationCanon;
  if (!canon || canon.status !== "READY" || !canon.frozen_at) {
    return { ok: false, error: "SIMULATION_CANON_NOT_READY" };
  }

  const result = await callClientJson({
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(params),
    schema: CLIENT_SCHEMA,
    temperature: 0.6,
    maxTokens: 420,
  });

  if (!result.ok || typeof result.data?.client_response !== "string") {
    return { ok: false, error: result.error || "AI_INVALID_RESPONSE" };
  }

  return {
    ok: true,
    usage: result.usage,
    promptVersion: PROMPT_VERSIONS.SIMULATED_CLIENT,
    schemaVersion: SCHEMA_VERSION,
    feature: AI_FEATURES.SIMULATED_CLIENT_RESPONSE,
    data: {
      clientResponse: result.data.client_response.trim(),
      factKeysUsed: result.data.fact_keys_used || [],
      factStatesUsed: result.data.fact_states_used || [],
      newlyRevealedFactKeys: result.data.newly_revealed_fact_keys || [],
      professionalIntent: result.data.professional_intent_expressed || "NONE",
      personaConsistency: result.data.persona_consistency !== false,
      unsupportedFactRisk: Boolean(result.data.unsupported_fact_risk),
      accessModeUsed: result.data.access_mode_used || "NONE",
      simulatedLookup: Boolean(result.data.simulated_lookup),
      lookupSource: result.data.lookup_source || "",
    },
  };
}
