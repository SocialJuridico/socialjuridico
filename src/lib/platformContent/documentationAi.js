import OpenAI from "openai";
import { PDFDocument } from "pdf-lib";

import {
  normalizeDocumentationSchema,
  normalizePlatformText,
  slugifyPlatformContent,
} from "./contentValidation";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL })
  : null;

export const MAX_DOCUMENTATION_PDF_BYTES = 30 * 1024 * 1024;
export const MAX_DOCUMENTATION_PAGES = 100;
export const MAX_PRESENTATION_PAGES = 60;
export const PRESENTATION_PREVIEW_WIDTH = 1200;
export const PRESENTATION_SLIDE_WIDTH = 1600;

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

function normalizeFileTitle(fileName) {
  return normalizePlatformText(
    String(fileName || "Apresentação")
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " "),
    180,
  );
}

export async function extractDocumentationPdf(buffer) {
  const pdfDocument = await PDFDocument.load(buffer, { updateMetadata: false });
  const pageCount = pdfDocument.getPageCount();
  if (!pageCount || pageCount > MAX_DOCUMENTATION_PAGES) {
    const error = new Error(
      pageCount > MAX_DOCUMENTATION_PAGES
        ? `O PDF deve possuir no máximo ${MAX_DOCUMENTATION_PAGES} páginas.`
        : "Não foi possível identificar as páginas do PDF.",
    );
    error.status = pageCount > MAX_DOCUMENTATION_PAGES ? 413 : 422;
    throw error;
  }

  const pageInfo = pdfDocument.getPages().map((page, index) => {
    const size = page.getSize();
    return {
      page: index + 1,
      width: Number(size.width || 0),
      height: Number(size.height || 0),
    };
  });

  let pages = Array.from({ length: pageCount }, (_, index) => ({
    page: index + 1,
    text: "",
  }));

  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const proxy = await getDocumentProxy(new Uint8Array(buffer));
    const extracted = await extractText(proxy, { mergePages: false });
    const rawPages = Array.isArray(extracted?.text)
      ? extracted.text
      : String(extracted?.text || "").split("\f");
    pages = Array.from({ length: pageCount }, (_, index) => ({
      page: index + 1,
      text: normalizePlatformText(rawPages[index], 12000),
    }));
    await proxy?.destroy?.();
  } catch (error) {
    console.warn("[DocumentationAI] PDF sem camada textual utilizável:", {
      message: error?.message || "unknown",
    });
  }

  const usefulPages = pages.filter((item) => item.text.length > 5);
  const landscapePages = pageInfo.filter(
    (page) => page.width > page.height * 1.2,
  ).length;
  const landscapeRatio = pageCount ? landscapePages / pageCount : 0;

  return {
    pageCount,
    pageInfo,
    pages,
    usefulPages,
    hasUsefulText: usefulPages.length > 0,
    requiresVisualClassification:
      usefulPages.length === 0 || landscapeRatio >= 0.6,
  };
}

function buildVisualClassificationPrompt({ fileName, pageCount, pageInfo }) {
  const landscapePages = (pageInfo || []).filter(
    (page) => Number(page.width) > Number(page.height) * 1.2,
  ).length;

  return `Classifique visualmente este PDF administrativo do Social Jurídico.

Considere APRESENTAÇÃO quando o arquivo for composto por slides, com narrativa visual, títulos grandes, diagramas, telas, infográficos ou páginas em formato de apresentação. O texto pode estar incorporado apenas nas imagens.

Considere DOCUMENTO_TEXTUAL quando for artigo, manual, regulamento, guia corrido, contrato ou documento cujo conteúdo deva ser transformado em uma página de documentação.

Se for APRESENTAÇÃO:
- extraia somente o título principal da capa;
- extraia somente o subtítulo da capa, quando existir;
- não crie resumo;
- não reescreva os slides.

Responda somente JSON válido:
{
  "kind": "PRESENTATION" ou "TEXT_DOCUMENT",
  "title": "",
  "subtitle": ""
}

Arquivo: ${normalizePlatformText(fileName, 180)}
Páginas: ${pageCount}
Páginas em paisagem: ${landscapePages}`;
}

export async function analyzeDocumentationPdfVisual({
  fileName,
  buffer,
  pageCount,
  pageInfo,
}) {
  if (!openai) {
    const error = new Error("Serviço de IA temporariamente indisponível.");
    error.status = 503;
    throw error;
  }

  const response = await openai.responses.create({
    model: "gemini-2.5-flash",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            filename: normalizePlatformText(fileName, 180) || "documentacao.pdf",
            file_data: `data:application/pdf;base64,${buffer.toString("base64")}`,
          },
          {
            type: "input_text",
            text: buildVisualClassificationPrompt({ fileName, pageCount, pageInfo }),
          },
        ],
      },
    ],
  });

  let parsed;
  try {
    parsed = JSON.parse(response.output_text || "{}");
  } catch {
    const error = new Error("A IA retornou uma classificação visual inválida.");
    error.status = 422;
    throw error;
  }

  const isPresentation = String(parsed.kind || "").toUpperCase() === "PRESENTATION";
  return {
    isPresentation,
    title:
      normalizePlatformText(parsed.title, 180) ||
      normalizeFileTitle(fileName) ||
      "Apresentação",
    subtitle: normalizePlatformText(parsed.subtitle, 260),
    model: "gemini-2.5-flash",
  };
}

export async function renderDocumentationPages(
  buffer,
  { desiredWidth = PRESENTATION_SLIDE_WIDTH } = {},
) {
  if (desiredWidth === PRESENTATION_PREVIEW_WIDTH) {
    return [{ page: 1, width: 0, height: 0, data: Buffer.alloc(0), sourcePdf: buffer }];
  }
  return [];
}

export async function analyzePresentationPdf({
  fileName,
  pageCount,
  pageInfo,
  screenshots,
}) {
  const buffer = screenshots?.[0]?.sourcePdf;
  if (!buffer) {
    const error = new Error("Não foi possível preparar o PDF para análise visual.");
    error.status = 422;
    throw error;
  }
  return analyzeDocumentationPdfVisual({ fileName, buffer, pageCount, pageInfo });
}

export function createPresentationSchema(value) {
  const pageCount = Number.isInteger(value) ? value : 0;
  return {
    version: 1,
    blocks: [
      {
        id: "presentation-pdf",
        type: "presentation_pdf",
        title: "Apresentação completa",
        pageCount,
      },
    ],
  };
}

function buildTextPrompt({ fileName, pages }) {
  const source = pages
    .map((item) => `--- PÁGINA ${item.page} ---\n${item.text}`)
    .join("\n\n")
    .slice(0, 55000);

  return `Transforme o PDF textual abaixo em documentação oficial da plataforma Social Jurídico.

Regras obrigatórias:
- Não invente funcionalidades, números, resultados, garantias ou informações ausentes.
- Preserve o sentido do documento.
- Este fluxo é exclusivo para documentos textuais, não para apresentações de slides.
- Identifique o tipo entre ARTICLE, GUIDE, MANUAL ou REFERENCE.
- Crie um resumo profissional, objetivo e fiel ao documento.
- Use somente: heading, paragraph, list, callout, steps, table e quote.
- Não gere HTML, Markdown, URLs, scripts, iframes ou estilos.
- Gere título, subtítulo e resumo em português brasileiro.
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
    {"type":"quote","title":"","text":""}
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
  if (!Array.isArray(pages) || !pages.length) {
    const error = new Error("O PDF textual não possui conteúdo suficiente para documentação.");
    error.status = 422;
    throw error;
  }

  const completion = await openai.chat.completions.create({
    model: "gemini-2.5-flash",
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "Você estrutura documentação textual de produto com fidelidade ao material de origem e responde somente JSON válido.",
      },
      { role: "user", content: buildTextPrompt({ fileName, pages }) },
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

  const allowedTypes = new Set(["ARTICLE", "GUIDE", "MANUAL", "REFERENCE"]);
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
    model: "gemini-2.5-flash",
  };
}