/**
 * Gerador de matérias por IA da Central de Notícias.
 *
 * Reutiliza o mesmo provedor de IA do Social Jurídico (OpenAI, configurado por
 * OPENAI_API_KEY / OPENAI_MODEL), seguindo o padrão de documentationAi.js e
 * das demais integrações do projeto (response_format json_object, sem fallback
 * silencioso de chave, sem logar segredos).
 *
 * A partir de uma PAUTA (título + tipo editorial + briefing), a IA pesquisa
 * com seu conhecimento, redige a matéria completa em HTML e devolve os metadados
 * editoriais/SEO. O resultado ainda passa pela sanitização e checagem de
 * compliance existentes (newsUtils) antes de ser persistido.
 */

import OpenAI from "openai";

import {
  EDITORIAL_TYPES,
  checkComplianceRisks,
  sanitizeEditorialHtml,
} from "@/lib/news/newsUtils";

export const NEWS_AI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
export const NEWS_PROMPT_VERSION = "news-generator-v1";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    })
  : null;

/**
 * Orientações editoriais por tipo de matéria (as 3 prioridades do produto).
 */
const EDITORIAL_GUIDANCE = {
  NOTICIA_JURIDICA: `Tipo: NOTÍCIA JURÍDICA REAL.
Escreva sobre novidades reais do mundo jurídico: mudanças legislativas,
jurisprudências relevantes (STF, STJ, TST), súmulas, decisões de impacto e
atualizações normativas. Contextualize a fonte (tribunal, lei, data) de forma
verificável. NÃO invente números de processo, datas específicas ou citações
textuais que você não tenha certeza — prefira descrever o entendimento de forma
geral e correta. Explique o impacto prático para o cidadão comum.`,
  EDUCATIVO: `Tipo: MATÉRIA EDUCATIVA E INFORMATIVA.
Explique um direito ou procedimento usando um EXEMPLO FICTÍCIO e didático
(ex.: "Fulana, grávida, foi demitida ao voltar da licença-maternidade"). Deixe
claro que o personagem é fictício e ilustrativo. Foque em orientar: quais são os
direitos, o que a lei prevê e como proceder (passo a passo). Linguagem acessível.`,
  NOVIDADE_PLATAFORMA: `Tipo: NOVIDADE DA PLATAFORMA SOCIAL JURÍDICO.
Escreva sobre um recurso, atualização ou funcionalidade da plataforma Social
Jurídico (conectar cidadãos a advogados, publicar casos, oportunidades para
advogados etc.). Tom de comunicado/anúncio, destacando o benefício para o
usuário. Não prometa resultados jurídicos.`,
};

function buildSystemPrompt() {
  return `Você é o editor-chefe da Central de Notícias do Social Jurídico, uma
plataforma brasileira que conecta cidadãos a advogados. Você escreve em
português do Brasil, com clareza, precisão jurídica e tom acessível.

REGRAS DE COMPLIANCE (obrigatórias — Código de Ética da OAB):
- NUNCA prometa ou garanta resultados ("ganho certo", "100% de êxito", "sucesso garantido").
- NÃO faça captação indevida de clientela nem mercantilize a advocacia.
- NÃO dê consulta jurídica individual; forneça informação de caráter geral.
- Sempre inclua um aviso (legal_notice) de que o conteúdo é informativo e não
  substitui a orientação de um advogado.
- Seja factual. Não invente leis, artigos ou decisões inexistentes.

FORMATO DO CONTEÚDO (campo content):
- HTML semântico usando apenas: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>,
  <em>, <blockquote>, <a>. NÃO use <script>, <style>, <img> ou atributos de evento.
- Entre 500 e 900 palavras, com subtítulos (<h2>) organizando a leitura.

Responda SOMENTE com um objeto JSON válido no schema solicitado.`;
}

function buildUserPrompt({
  title,
  editorialType,
  briefing,
  legalSpecialty,
  referenceUrl,
}) {
  const guidance =
    EDITORIAL_GUIDANCE[editorialType] || EDITORIAL_GUIDANCE.NOTICIA_JURIDICA;

  const referenceBlock = referenceUrl
    ? `\nFONTE DE REFERÊNCIA (use como base factual desta matéria): ${referenceUrl}
Baseie os fatos, datas e citações no conteúdo dessa fonte. Inclua-a no array
"sources" (com a url exata). Se algum dado não estiver claro na fonte, descreva
de forma geral em vez de inventar.`
    : "";

  return `PAUTA DEFINIDA PELO ADMINISTRADOR
Título/assunto: "${title}"
${legalSpecialty ? `Especialidade jurídica sugerida: ${legalSpecialty}` : ""}
${briefing ? `Briefing adicional: ${briefing}` : ""}
${referenceBlock}

${guidance}

Gere a matéria completa. O schema JSON esperado é:
{
  "title": "título final otimizado (pode refinar o do admin)",
  "subtitle": "linha de apoio curta",
  "content": "corpo em HTML conforme as regras",
  "excerpt": "resumo de até 160 caracteres",
  "seo_title": "título SEO até 60 caracteres",
  "seo_description": "meta description até 155 caracteres",
  "primary_keyword": "palavra-chave principal",
  "secondary_keywords": ["3 a 6 termos"],
  "legal_specialty": "área do direito predominante",
  "legal_notice": "aviso informativo/disclaimer",
  "faq": [{"question": "...", "answer": "..."}],
  "sources": [{"title": "...", "organization": "...", "url": "", "evidence_summary": "..."}]
}`;
}

function isAiAvailable() {
  return Boolean(openai);
}

/**
 * Gera a matéria a partir de uma pauta. Retorna:
 *   { ok: true, article, usage } | { ok: false, error, compliance? }
 */
export async function generateArticleFromTopic(topic) {
  if (!isAiAvailable()) {
    return { ok: false, error: "AI_UNAVAILABLE" };
  }

  const editorialType = Object.values(EDITORIAL_TYPES).includes(
    topic.editorial_type,
  )
    ? topic.editorial_type
    : EDITORIAL_TYPES.NOTICIA_JURIDICA;

  let completion;
  try {
    completion = await openai.chat.completions.create({
      model: NEWS_AI_MODEL,
      response_format: { type: "json_object" },
      temperature: 0.5,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: buildUserPrompt({
            title: topic.title,
            editorialType,
            briefing: topic.briefing,
            legalSpecialty: topic.legal_specialty,
            referenceUrl: topic.reference_url,
          }),
        },
      ],
    });
  } catch (error) {
    return { ok: false, error: `AI_REQUEST_FAILED: ${error.message}` };
  }

  const raw = completion?.choices?.[0]?.message?.content;
  if (!raw) return { ok: false, error: "AI_EMPTY_RESPONSE" };

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: "AI_INVALID_JSON" };
  }

  if (!parsed.title || !parsed.content) {
    return { ok: false, error: "AI_MISSING_FIELDS" };
  }

  // Sanitiza o HTML gerado, reaproveitando a política de tags do módulo.
  const safeContent = sanitizeEditorialHtml(parsed.content);

  // Checagem de compliance: bloqueia conteúdo com risco antes de publicar.
  const compliance = checkComplianceRisks(`${parsed.title} ${safeContent}`);
  if (!compliance.ok) {
    return { ok: false, error: "COMPLIANCE_BLOCKED", compliance };
  }

  const usage = completion.usage || {};

  return {
    ok: true,
    article: {
      title: String(parsed.title).trim(),
      subtitle: parsed.subtitle ? String(parsed.subtitle).trim() : null,
      content: safeContent,
      content_format: "HTML",
      excerpt: parsed.excerpt ? String(parsed.excerpt).trim().slice(0, 200) : null,
      editorial_type: editorialType,
      legal_specialty: parsed.legal_specialty || topic.legal_specialty || null,
      category_id: topic.category_id || null,
      seo_title: parsed.seo_title || null,
      seo_description: parsed.seo_description || null,
      primary_keyword: parsed.primary_keyword || null,
      secondary_keywords: Array.isArray(parsed.secondary_keywords)
        ? parsed.secondary_keywords.slice(0, 8)
        : null,
      legal_notice:
        parsed.legal_notice ||
        "Este conteúdo tem caráter meramente informativo e não substitui a orientação de um advogado.",
      faq: Array.isArray(parsed.faq) ? parsed.faq.slice(0, 8) : [],
      ai_generated: true,
      ai_model: NEWS_AI_MODEL,
      author_name: "Redação Social Jurídico (IA)",
    },
    sources: Array.isArray(parsed.sources)
      ? parsed.sources.slice(0, 6).map((s) => ({
          title: s.title || null,
          organization: s.organization || null,
          url: s.url || null,
          evidence_summary: s.evidence_summary || null,
          source_type: "IA",
        }))
      : [],
    usage: {
      tokens_input: usage.prompt_tokens || null,
      tokens_output: usage.completion_tokens || null,
      model: NEWS_AI_MODEL,
      prompt_version: NEWS_PROMPT_VERSION,
    },
  };
}