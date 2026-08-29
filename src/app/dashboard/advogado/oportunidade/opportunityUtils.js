export function formatOpportunityDate(value) {
  if (!value) return "Data não informada";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function getInitials(value, fallback = "AD") {
  const initials = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || fallback;
}

export function getSafeExternalUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanText(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function compactText(value) {
  return cleanText(value).replace(/\s+/g, " ").trim();
}

function uniqueStrings(values) {
  const seen = new Set();
  return values.filter((value) => {
    const normalized = compactText(value).toLocaleLowerCase("pt-BR");
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim()) || "";
}

function firstSentenceSummary(text, maxLength = 430) {
  const normalized = compactText(text);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  let result = "";
  for (const sentence of sentences) {
    const candidate = `${result}${result ? " " : ""}${sentence.trim()}`;
    if (candidate.length > maxLength && result) break;
    result = candidate;
    if (result.length >= Math.min(220, maxLength)) break;
  }

  if (!result || result.length > maxLength) {
    result = normalized.slice(0, maxLength).trimEnd();
  }
  return result.replace(/[,:;\s]+$/, "") + (result.length < normalized.length ? "…" : "");
}

function matchDateFromNarrative(text) {
  const patterns = [
    /(?:data\s+(?:do|da)\s+(?:fato|acidente|ocorr[eê]ncia)|acidente\s+(?:ocorrido|aconteceu)|fato\s+(?:ocorrido|aconteceu)|ocorrido\s+em)\s*[:\-]?\s*(\d{2}\/\d{2}\/\d{4})/i,
    /(?:em|no\s+dia)\s+(\d{2}\/\d{2}\/\d{4})(?=[,.;\s])/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function extractProcessReferences(text) {
  const references = [];
  const taggedProcessRegex =
    /(?:processo\s+de\s+execu[cç][aã]o\s+penal(?:\s*\(SEEU\))?|processo\s+criminal|processo)\s*[:#\-]?\s*(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/gi;
  const seenValues = new Set();
  let match;

  while ((match = taggedProcessRegex.exec(text)) !== null) {
    const descriptor = match[0].slice(0, match[0].indexOf(match[1])).toLocaleLowerCase("pt-BR");
    let label = "Processo";
    if (/execu[cç][aã]o\s+penal|seeu/.test(descriptor)) label = "Execução penal / SEEU";
    else if (/criminal/.test(descriptor)) label = "Processo criminal";

    references.push({ label, value: match[1] });
    seenValues.add(match[1]);
  }

  const processRegex = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g;
  while ((match = processRegex.exec(text)) !== null) {
    if (seenValues.has(match[0])) continue;
    const prefix = text
      .slice(Math.max(0, match.index - 100), match.index)
      .toLocaleLowerCase("pt-BR");
    let label = "Processo mencionado";
    if (/execu[cç][aã]o\s+penal|seeu/.test(prefix)) label = "Execução penal / SEEU";
    else if (/processo\s+criminal|criminal/.test(prefix)) label = "Processo criminal";
    else if (/processo/.test(prefix)) label = "Processo";

    references.push({ label, value: match[0] });
    seenValues.add(match[0]);
  }

  const boRegex =
    /(?:B\.?\s*O\.?|boletim\s+de\s+ocorr[eê]ncia)\s*(?:n[ºo°.]*)?\s*[:#\-]?\s*([A-Z0-9][A-Z0-9./-]{4,})/gi;
  while ((match = boRegex.exec(text)) !== null) {
    const value = match[1]?.replace(/[.,;]+$/, "");
    if (value && /\d/.test(value)) {
      references.push({ label: "Boletim de ocorrência", value });
    }
  }

  const seen = new Set();
  return references.filter((reference) => {
    const key = `${reference.label}:${reference.value}`.toLocaleLowerCase("pt-BR");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildKeyFacts(item, narrative) {
  const facts = [];
  const location = [item.city, item.state].filter(Boolean).join(" - ");
  const factDate = firstText(
    item.factDate,
    item.eventDate,
    item.occurrenceDate,
    item.dataFato,
    item.dataOcorrencia,
    matchDateFromNarrative(narrative),
  );

  if (factDate) facts.push({ label: "Data do fato", value: factDate });
  if (location) facts.push({ label: "Localidade", value: location });
  if (item.practiceArea) facts.push({ label: "Área jurídica", value: item.practiceArea });

  if (/embriagad[oa]|embriaguez/i.test(narrative)) {
    facts.push({ label: "Condição relatada", value: "Há menção a embriaguez do condutor" });
  }
  if (/perda\s+total/i.test(narrative)) {
    facts.push({ label: "Veículo / bem", value: "Perda total mencionada no relato" });
  }
  if (/financiad[oa]|financiamento/i.test(narrative)) {
    facts.push({ label: "Financiamento", value: "Financiamento relacionado ao fato foi informado" });
  }
  if (/\bIPVA\b/i.test(narrative)) {
    facts.push({ label: "IPVA", value: "Débitos de IPVA são mencionados no relato" });
  }
  if (/\bmultas?\b/i.test(narrative)) {
    facts.push({ label: "Multas", value: "Multas vinculadas ao episódio são mencionadas" });
  }
  if (/d[ií]vida\s+ativa/i.test(narrative)) {
    facts.push({ label: "Dívida ativa", value: "Inscrição em dívida ativa é mencionada" });
  }
  if (/boletim\s+de\s+ocorr[eê]ncia|\bB\.?\s*O\.?\b/i.test(narrative)) {
    facts.push({ label: "Boletim de ocorrência", value: "Informado pelo cliente" });
  }
  if (/processo\s+criminal/i.test(narrative)) {
    facts.push({ label: "Processo criminal", value: "Mencionado no relato" });
  }
  if (/condenad[oa]/i.test(narrative)) {
    facts.push({ label: "Condenação", value: "Há menção a condenação no relato do cliente" });
  }
  if (/tornozeleira\s+eletr[oô]nica/i.test(narrative)) {
    facts.push({ label: "Cumprimento de pena", value: "Tornozeleira eletrônica é mencionada" });
  }

  return facts.slice(0, 12);
}

function buildQuestions(narrative) {
  const questions = [];

  if (/indeniza[cç][aã]o|ressarcimento|ressarcir|preju[ií]zos?/i.test(narrative)) {
    questions.push("Possibilidade de ressarcimento ou indenização pelos prejuízos narrados.");
  }
  if (/prescri[cç][aã]o|prescricional|prescrev/i.test(narrative)) {
    questions.push("Prazo prescricional aplicável e marco inicial da contagem no caso concreto.");
  }
  if (/tr[aâ]nsito\s+em\s+julgado|condena[cç][aã]o|processo\s+criminal/i.test(narrative) && /prescri|prazo/i.test(narrative)) {
    questions.push("Relação entre o processo criminal/condenação mencionados e a análise do prazo cível.");
  }
  if (/financiamento|financiad[oa]/i.test(narrative)) {
    questions.push("Tratamento dos valores ligados ao financiamento mencionado pelo cliente.");
  }
  if (/\bIPVA\b|\bmultas?\b|d[ií]vida\s+ativa/i.test(narrative)) {
    questions.push("Possibilidade de recuperação dos valores de IPVA, multas e outros débitos vinculados ao episódio.");
  }
  if (/seguradora|terceir[oa]s?|respons[aá]ve(?:l|is)/i.test(narrative)) {
    questions.push("Identificação das partes que podem ser juridicamente responsáveis pelos danos narrados.");
  }
  if (/ainda\s+(?:posso|existe)|possibilidade\s+de\s+cobran[cç]a|cobrar\s+judicialmente/i.test(narrative)) {
    questions.push("Existência de medida judicial ou extrajudicial ainda cabível atualmente.");
  }

  return uniqueStrings(questions).slice(0, 7);
}

function buildMentionedDocuments(narrative) {
  const documents = [];
  const lower = narrative.toLocaleLowerCase("pt-BR");

  if (/boletim\s+de\s+ocorr[eê]ncia|\bB\.?\s*O\.?\b/i.test(narrative)) {
    documents.push("Boletim de ocorrência");
  }
  if (/contrato\s+(?:de|do)\s+financiamento|documentos?\s+(?:de|do)\s+financiamento/i.test(narrative)) {
    documents.push("Contrato/documentos do financiamento");
  }
  if (/documentos?\s+(?:de|do)\s+ve[ií]culo/i.test(narrative)) {
    documents.push("Documentos do veículo");
  }
  if (/documenta[cç][aã]o[^.]{0,120}(?:d[eé]bitos?|multas?)|(?:d[eé]bitos?|multas?)[^.]{0,120}document/i.test(lower)) {
    documents.push("Documentos ou comprovantes de débitos e multas");
  }
  if (/acesso\s+aos?\s+processos?|documentos?[^.]{0,80}processos?/i.test(narrative)) {
    documents.push("Acesso/documentação dos processos mencionados");
  }
  if (/comprovantes?\s+de\s+pagamento/i.test(narrative)) {
    documents.push("Comprovantes de pagamento");
  }

  return uniqueStrings(documents).slice(0, 7);
}

function buildAttentionPoints(narrative, references) {
  const points = [
    "Confirmar datas, documentos e números de referência antes de definir qualquer estratégia profissional.",
  ];

  if (/prescri[cç][aã]o|prescricional|prescrev/i.test(narrative)) {
    points.push(
      "A análise de prescrição deve considerar os marcos do caso concreto; esta ficha não conclui qual prazo é aplicável.",
    );
  }
  if (/processo\s+criminal|condena[cç][aã]o|tr[aâ]nsito\s+em\s+julgado/i.test(narrative)) {
    points.push(
      "Verificar documentalmente a relação entre o processo criminal mencionado e eventual pretensão cível, sem presumir efeitos automáticos.",
    );
  }
  if (/financiamento|\bIPVA\b|\bmultas?\b|d[ií]vida\s+ativa/i.test(narrative)) {
    points.push(
      "Separar e quantificar cada prejuízo alegado, identificando titularidade, período e comprovantes correspondentes.",
    );
  }
  if (references.length > 0) {
    points.push(
      "Conferir os processos e registros informados diretamente nas fontes oficiais antes de utilizá-los na análise.",
    );
  }

  return uniqueStrings(points).slice(0, 5);
}

function sanitizeSuggestedStep(step) {
  if (!step || typeof step !== "object") return step;
  let titulo = compactText(step.titulo);
  let descricao = cleanText(step.descricao);

  if (/prescri[cç][aã]o\s+quinquenal/i.test(`${titulo} ${descricao}`)) {
    titulo = "Analisar prazo prescricional";
    descricao =
      "Verificar o prazo prescricional aplicável ao caso concreto e eventuais causas de interrupção ou suspensão, com base nos documentos e marcos relevantes.";
  }

  if (/elaborar\s+e\s+ajuizar|redigir\s+a\s+peti[cç][aã]o\s+inicial/i.test(`${titulo} ${descricao}`)) {
    titulo = "Definir estratégia e medida cabível";
    descricao =
      "Após a análise documental e jurídica, avaliar eventual medida extrajudicial ou judicial e os pedidos que possam ser sustentados no caso concreto.";
  }

  return { ...step, titulo, descricao };
}

export function buildOpportunityDossier(item = {}) {
  const description = cleanText(item.description);
  const transcript = cleanText(item.transcript);
  const narrative = cleanText([description, transcript].filter(Boolean).join("\n\n"));
  const explicitSummary = firstText(
    item.summary,
    item.aiSummary,
    item.triageSummary,
    item.resumo,
    item.resumoIa,
  );
  const references = extractProcessReferences(narrative);
  const keyFacts = buildKeyFacts(item, narrative);
  const questions = buildQuestions(narrative);
  const mentionedDocuments = buildMentionedDocuments(narrative);
  const attentionPoints = buildAttentionPoints(narrative, references);
  const nextSteps = Array.isArray(item.nextSteps)
    ? item.nextSteps.map(sanitizeSuggestedStep).filter(Boolean)
    : [];

  return {
    summary: cleanText(explicitSummary) || firstSentenceSummary(description || transcript),
    narrative: description,
    keyFacts,
    questions,
    mentionedDocuments,
    references,
    attentionPoints,
    nextSteps,
  };
}
