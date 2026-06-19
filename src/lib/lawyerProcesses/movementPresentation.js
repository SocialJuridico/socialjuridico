function parseJsonValue(value) {
  let current = value;
  for (let depth = 0; depth < 3; depth += 1) {
    if (typeof current !== "string") break;
    const trimmed = current.trim();
    if (!trimmed || !["{", "[", '"'].includes(trimmed[0])) break;
    try {
      current = JSON.parse(trimmed);
    } catch {
      break;
    }
  }
  return current;
}

function objectValue(value) {
  const parsed = parseJsonValue(value);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
}

function readableText(value) {
  const parsed = parseJsonValue(value);
  if (typeof parsed !== "string") return "";
  const text = parsed.trim().replace(/\s+/g, " ");
  return text && !text.startsWith("{") && !text.startsWith("[") ? text : "";
}

function firstValue(sources, keys) {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = source[key];
      if (value !== undefined && value !== null && String(value).trim()) return value;
    }
  }
  return null;
}

export function presentLawyerProcessMovement(input) {
  const root = objectValue(input) || (input && typeof input === "object" ? input : {});
  const descriptionPayload = objectValue(root.description);
  const raw = objectValue(root.raw_payload) || objectValue(root.raw);
  const nestedRaw = objectValue(raw?.raw);
  const sources = [root, descriptionPayload, raw, nestedRaw].filter(Boolean);

  const date = firstValue(sources, [
    "data",
    "dataHora",
    "data_hora",
    "movement_date",
    "timestamp",
    "created_at",
    "createdAt",
  ]);
  const titleValue = firstValue(sources, ["nome", "titulo", "title", "movimento"]);
  const descriptionValue = firstValue(sources, ["descricao", "texto", "description"]);
  const complementValue = firstValue(sources, [
    "complemento",
    "detalhe",
    "detalhes",
    "observacao",
    "observações",
  ]);
  const code = firstValue(sources, ["codigo", "code", "movement_type"]);
  const courtValue = firstValue(sources, ["orgaoJulgador", "orgao_julgador", "court"]);
  const court = objectValue(courtValue);

  const title =
    readableText(titleValue) ||
    readableText(descriptionValue) ||
    readableText(input) ||
    "Movimentação processual";
  const description = readableText(descriptionValue);
  const complement = readableText(complementValue);
  const detail = complement || (description && description !== title ? description : "");

  return {
    date: date ? String(date) : null,
    title,
    detail,
    code: code !== null && code !== undefined ? String(code) : "",
    courtName:
      readableText(court?.nome) ||
      readableText(court?.name) ||
      (!court ? readableText(courtValue) : ""),
    courtCode: court ? String(court.codigo || court.code || "") : "",
  };
}

export function formatMovementDateTime(value) {
  if (!value) return { date: "Data não informada", time: "" };
  const normalized = String(value);
  if (/^\d{14}$/.test(normalized)) {
    return {
      date: `${normalized.slice(6, 8)}/${normalized.slice(4, 6)}/${normalized.slice(0, 4)}`,
      time: `${normalized.slice(8, 10)}:${normalized.slice(10, 12)}`,
    };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: normalized, time: "" };
  return {
    date: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed),
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed),
  };
}
