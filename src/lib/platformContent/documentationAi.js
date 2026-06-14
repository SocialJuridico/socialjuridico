import OpenAI from "openai";

import {
  normalizeDocumentationSchema,
  normalizePlatformText,
  slugifyPlatformContent,
} from "./contentValidation";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const MAX_DOCUMENTATION_PDF_BYTES = 30 * 1024 * 1024;
export const MAX_DOCUMENTATION_PAGES = 100;

export function validateDocumentationPdf(file, buffer) {
  if (!file || typeof file.arrayBuffer !== "function" || !buffer?.length) {
    return { success: false, status: 400, message: "Nenhum PDF válido foi enviado." };
  }
  if (buffer.length > MAX_DOCUMENTATION_PDF_BYTES) {
    return { success: false, status: 413, message: "O PDF deve possuir no máximo 30 MB." };
  }
  if (file.type !== "application/pdf") {
    return { success: false, status: 415, message: "Envie um arquivo PDF válido." };
  }
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    return {
      success: false,
      status: 415,
      message: "O conteúdo do arquivo não corresponde a um PDF válido.",
    };
  }
  return { success: true };
}

export async function extractDocumentationPdf(buffer) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const pageCount = Number(pdf?.numPages || 0);
  if (!pageCount || pageCount > MAX_DOCUMENTATION_PAGES) {
    const error = new Error(
      pageCount > MAX_DOCUMENTATION_PAGES
        ? `O PDF deve possuir no máximo ${MAX_DOCUMENTATION_PAGES} páginas.`
        : "Não foi possível identificar as páginas do PDF.",
    );
    error.status = pageCount > MAX_DOCUMENTATION_PAGES ? 413 : 422;
    throw error;
  }

  const extracted = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(extracted?.text)
    ? extracted.text.map((text, index) => ({
        page: index + 1,
        text: normalizePlatformText(text, 12000),
      }))
    : String(extracted?.text || "")
        .split("\f")
        .map((text, index) => ({
          page: index + 1,
          text: normalizePlatformText(text, 12000),
        }));

  const usefulPages = pages.filter((item) => item.text.length > 5);
  if (!usefulPages.length) {
    const error = new Error(
      "O PDF não possui texto legível. Envie um PDF pesquisável, não apenas imagens escaneadas.",
    );
    error.status = 422;
    throw error;
  }

  return { pageCount, pages: usefulPages };
}

function buildPrompt({ fileName, pages }) {
  const source = pages
    .map((item) => `--- PÁGINA ${item.page} ---\n${item.text}`)
    .join("\n\n")
    .slice(0, 55000);

  return `Transforme o PDF administrativo abaixo em documentação oficial da plataforma Social Jurídico.

Regras obrigatórias:
- Não invente funcionalidades, números, resultados, garantias ou informações ausentes.
- Preserve o sentido do documento.
- Identifique se é ARTICLE, GUIDE, PRESENTATION, MANUAL ou REFERENCE.
- Se o material parecer apresentação, gere um bloco "slide" para cada página relevante, mantendo títulos, textos e tópicos.
- Para outros materiais use somente: heading, paragraph, list, callout, steps, table, quote.
- Não gere HTML, Markdown, URLs, scripts, iframes ou estilos.
- Gere título, subtítulo e resumo objetivos em português brasileiro.
- Responda somente JSON válido no formato:
{
  "title":"",
  "subtitle":"",
  "summary":"",
  "contentType":"ARTICLE",
  "blocks":[
    {"type":"heading","title":"","text":""},
    {"type":"paragraph","title":"","text":""},
    {"type":"list","title":"","items":[""]},
    {"type":"callout","title":"","text":""},
    {"type":"steps","title":"","steps":[{"title":"","text":""}]},
    {"type":"table","title":"","headers":[""],"rows":[[""]]},
    {"type":"quote","title":"","text":""},
    {"type":"slide","eyebrow":"Página 1","title":"","text":"","bullets":[""]}
  ]
}

Arquivo: ${normalizePlatformText(fileName, 180)}

CONTEÚDO EXTRAÍDO:
${source}`;
}

export async function generateDocumentationFromPdf({ fileName, pages }) {
  if (!openai) {
    const error = new Error("Serviço de IA temporariamente indisponível.");
    error.status = 503;
    throw error;
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Você estrutura documentação de produto com fidelidade ao material de origem e responde somente JSON válido.",
      },
      { role: "user", content: buildPrompt({ fileName, pages }) },
    ],
  });

  let parsed;
  try {
    parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch {
    const error = new Error("A IA retornou uma estrutura inválida. Tente processar novamente.");
    error.status = 422;
    throw error;
  }

  const title = normalizePlatformText(parsed.title, 180);
  if (title.length < 3) {
    const error = new Error("A IA não conseguiu identificar um título confiável.");
    error.status = 422;
    throw error;
  }

  const allowedTypes = new Set(["ARTICLE", "GUIDE", "PRESENTATION", "MANUAL", "REFERENCE"]);
  const contentType = String(parsed.contentType || "ARTICLE").toUpperCase();
  const schema = normalizeDocumentationSchema({ version: 1, blocks: parsed.blocks });
  if (!schema.blocks.length) {
    const error = new Error("A IA não conseguiu estruturar o conteúdo do PDF.");
    error.status = 422;
    throw error;
  }

  return {
    title,
    slug: slugifyPlatformContent(title),
    subtitle: normalizePlatformText(parsed.subtitle, 260),
    summary: normalizePlatformText(parsed.summary, 1200),
    contentType: allowedTypes.has(contentType) ? contentType : "ARTICLE",
    contentSchema: schema,
    model: "gpt-4o-mini",
  };
}
