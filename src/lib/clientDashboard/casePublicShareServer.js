import OpenAI from "openai";

const CLASSIFY_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

const SHARE_SCHEMA = {
  name: "descricao_publica_caso_socialjuridico",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["descricao"],
    properties: {
      descricao: { type: "string" },
    },
  },
};

const SYSTEM_PROMPT = `Você reescreve o relato de um caso jurídico para um card PÚBLICO de divulgação em redes sociais, endereçado a atrair advogados para a plataforma Social Jurídico.

REGRAS OBRIGATÓRIAS:
1. NUNCA inclua nomes próprios — do cliente, de terceiros, de menores de idade, de empresas específicas.
2. NUNCA inclua endereço, bairro, rua, telefone, CPF, RG ou qualquer identificador pessoal. Cidade/estado já são exibidos separadamente, não repita.
3. Se envolver menor de idade, vítima de violência ou situação de vulnerabilidade, generalize sem detalhes que permitam identificação (ex.: "menor de idade" em vez de nome e idade exata, salvo quando a idade for juridicamente relevante para a tese).
4. 2 a 3 frases, tom sério e direto, sem sensacionalismo, que desperte a atenção profissional de um advogado.
5. NÃO invente fatos que não estejam no relato original.
6. Responda somente no schema solicitado.`;

function clampText(value, max) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function fallbackDescription({ area, cidade, estado }) {
  const local = [cidade, estado].filter(Boolean).join("/");
  const areaLabel = area || "Direito Geral";
  return local
    ? `Caso de ${areaLabel} em ${local}. Detalhes completos disponíveis após login na plataforma.`
    : `Caso de ${areaLabel}. Detalhes completos disponíveis após login na plataforma.`;
}

/**
 * Gera uma descrição pública anonimizada (sem PII) para compartilhamento
 * externo de uma oportunidade. Nunca lança: em qualquer falha retorna um
 * texto genérico e seguro baseado só em área/cidade/estado.
 *
 * @param {object} params
 * @param {string} [params.titulo]
 * @param {string} [params.descricao]
 * @param {string} [params.area]
 * @param {string} [params.cidade]
 * @param {string} [params.estado]
 */
export async function generatePublicShareDescription({
  titulo,
  descricao,
  area,
  cidade,
  estado,
}) {
  const fallback = fallbackDescription({ area, cidade, estado });

  if (!openai) return { descricao: fallback, meta: { classifierError: "AI_UNAVAILABLE" } };

  const relato = clampText(descricao || titulo, 3000);
  if (!relato) return { descricao: fallback, meta: { classifierError: "EMPTY_INPUT" } };

  try {
    const completion = await openai.chat.completions.create({
      model: CLASSIFY_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `ÁREA JURÍDICA: ${area || "não informada"}\nRELATO ORIGINAL:\n${relato}`,
        },
      ],
      response_format: { type: "json_schema", json_schema: SHARE_SCHEMA },
    });

    let parsed = {};
    try {
      parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
    } catch {
      parsed = {};
    }

    const descricaoPublica = clampText(parsed.descricao, 500);
    if (!descricaoPublica) {
      return { descricao: fallback, meta: { classifierError: "AI_INVALID_RESPONSE" } };
    }

    return { descricao: descricaoPublica, meta: { classifierError: null } };
  } catch (error) {
    console.error("[CasoIA/DescricaoPublica] Falha não fatal:", {
      status: error?.status,
      message: error?.message,
    });
    return { descricao: fallback, meta: { classifierError: "AI_REQUEST_FAILED" } };
  }
}
