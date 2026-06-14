const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const AGENDA_TYPES = Object.freeze([
  { value: "PRAZO", label: "Prazo processual" },
  { value: "AUDIENCIA", label: "Audiência" },
  { value: "REUNIAO", label: "Reunião" },
  { value: "TAREFA", label: "Tarefa" },
  { value: "OUTRO", label: "Outro" },
]);

export const AGENDA_URGENCIES = Object.freeze([
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
]);

export const AGENDA_STATUSES = Object.freeze([
  { value: "PENDING", label: "Pendente" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Cancelado" },
]);

const TYPE_ALIASES = new Map([
  ["PRAZO", "PRAZO"],
  ["PRAZO_PROCESSUAL", "PRAZO"],
  ["JUDICIAL", "PRAZO"],
  ["PROCESSUAL", "PRAZO"],
  ["AUDIENCIA", "AUDIENCIA"],
  ["REUNIAO", "REUNIAO"],
  ["TAREFA", "TAREFA"],
  ["PESSOAL", "TAREFA"],
  ["COMPROMISSO", "TAREFA"],
  ["OUTRO", "OUTRO"],
]);
const URGENCY_ALIASES = new Map([
  ["LOW", "LOW"],
  ["BAIXA", "LOW"],
  ["MEDIUM", "MEDIUM"],
  ["MEDIA", "MEDIUM"],
  ["HIGH", "HIGH"],
  ["ALTA", "HIGH"],
  ["CRITICA", "HIGH"],
  ["URGENTE", "HIGH"],
]);
const STATUS_ALIASES = new Map([
  ["PENDING", "PENDING"],
  ["PENDENTE", "PENDING"],
  ["OPEN", "PENDING"],
  ["COMPLETED", "COMPLETED"],
  ["CONCLUIDO", "COMPLETED"],
  ["CONCLUIDA", "COMPLETED"],
  ["DONE", "COMPLETED"],
  ["CANCELLED", "CANCELLED"],
  ["CANCELED", "CANCELLED"],
  ["CANCELADO", "CANCELLED"],
  ["CANCELADA", "CANCELLED"],
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function fold(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isAgendaUuid(value) {
  return UUID_PATTERN.test(String(value || "").trim());
}

export function normalizeAgendaText(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function normalizeAgendaType(value, fallback = "OUTRO") {
  return TYPE_ALIASES.get(fold(value)) || fallback;
}

export function normalizeAgendaUrgency(value, fallback = "MEDIUM") {
  return URGENCY_ALIASES.get(fold(value)) || fallback;
}

export function normalizeAgendaStatus(value, fallback = "PENDING") {
  return STATUS_ALIASES.get(fold(value)) || fallback;
}

function normalizeDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function readPage(value, fallback, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export function normalizeAgendaQuery(searchParams) {
  const get = (key) => searchParams?.get?.(key) ?? searchParams?.[key];
  const memberId = normalizeAgendaText(get("memberId") || get("lawyerId"), 64);
  const clientId = normalizeAgendaText(get("clientId"), 64);
  const from = normalizeDate(get("from"));
  const to = normalizeDate(get("to"));
  return {
    q: normalizeAgendaText(get("q"), 120).toLocaleLowerCase("pt-BR"),
    status: get("status") ? normalizeAgendaStatus(get("status"), "") : "",
    type: get("type") ? normalizeAgendaType(get("type"), "") : "",
    urgency: get("urgency") ? normalizeAgendaUrgency(get("urgency"), "") : "",
    memberId: isAgendaUuid(memberId) ? memberId : "",
    clientId: isAgendaUuid(clientId) ? clientId : "",
    from,
    to,
    page: readPage(get("page"), 1, 100000),
    pageSize: readPage(get("pageSize"), 20, 50),
  };
}

export function validateAgendaMutation(input, { partial = false } = {}) {
  const source = input && typeof input === "object" ? input : {};
  const data = {};
  const errors = {};

  if (!partial || hasOwn(source, "title")) {
    const title = normalizeAgendaText(source.title, 160);
    if (title.length < 3) errors.title = "Informe um título com pelo menos 3 caracteres.";
    else data.title = title;
  }

  if (!partial || hasOwn(source, "description")) {
    data.description = normalizeAgendaText(source.description, 3000);
  }

  if (!partial || hasOwn(source, "date") || hasOwn(source, "startAt")) {
    const date = normalizeDate(source.date ?? source.startAt);
    if (!date) errors.date = "Informe uma data e hora válidas.";
    else data.date = date;
  }

  if (!partial || hasOwn(source, "endDate") || hasOwn(source, "endAt")) {
    const rawEnd = source.endDate ?? source.endAt;
    if (rawEnd === null || rawEnd === undefined || rawEnd === "") data.endDate = null;
    else {
      const endDate = normalizeDate(rawEnd);
      if (!endDate) errors.endDate = "Informe uma data final válida.";
      else data.endDate = endDate;
    }
  }

  if (!partial || hasOwn(source, "type")) {
    const normalized = normalizeAgendaType(source.type, "");
    if (!normalized) errors.type = "Selecione um tipo de compromisso válido.";
    else data.type = normalized;
  }

  if (!partial || hasOwn(source, "urgency")) {
    const normalized = normalizeAgendaUrgency(source.urgency, "");
    if (!normalized) errors.urgency = "Selecione uma urgência válida.";
    else data.urgency = normalized;
  }

  if (!partial || hasOwn(source, "status")) {
    const normalized = normalizeAgendaStatus(source.status, "");
    if (!normalized) errors.status = "Selecione um status válido.";
    else data.status = normalized;
  }

  for (const [inputKey, outputKey] of [
    ["clientId", "clientId"],
    ["client_id", "clientId"],
    ["lawyerId", "lawyerId"],
    ["lawyer_id", "lawyerId"],
  ]) {
    if (!hasOwn(source, inputKey) || hasOwn(data, outputKey)) continue;
    const value = source[inputKey];
    if (value === null || value === undefined || value === "") data[outputKey] = null;
    else if (!isAgendaUuid(value)) errors[outputKey] = "Identificador inválido.";
    else data[outputKey] = String(value);
  }

  if (hasOwn(source, "requestId") || hasOwn(source, "request_id")) {
    const requestId = source.requestId ?? source.request_id;
    if (!isAgendaUuid(requestId)) errors.requestId = "Chave de idempotência inválida.";
    else data.requestId = String(requestId);
  }

  if (data.date && data.endDate) {
    const start = new Date(data.date).getTime();
    const end = new Date(data.endDate).getTime();
    if (end <= start) errors.endDate = "O término deve ocorrer após o início.";
    if (end - start > 7 * 24 * 60 * 60 * 1000) {
      errors.endDate = "A duração máxima de um compromisso é de 7 dias.";
    }
  }

  if (partial && Object.keys(data).length === 0 && Object.keys(errors).length === 0) {
    errors.form = "Nenhum campo válido foi informado para atualização.";
  }

  return { success: Object.keys(errors).length === 0, data, errors };
}

export function getAgendaDateKey(value, timeZone = "America/Sao_Paulo") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

export function matchesAgendaFilters(item, filters) {
  if (filters.status && item.status !== filters.status) return false;
  if (filters.type && item.type !== filters.type) return false;
  if (filters.urgency && item.urgency !== filters.urgency) return false;
  if (filters.memberId && item.lawyerId !== filters.memberId) return false;
  if (filters.clientId && item.clientId !== filters.clientId) return false;
  const timestamp = new Date(item.date).getTime();
  if (filters.from && timestamp < new Date(filters.from).getTime()) return false;
  if (filters.to && timestamp > new Date(filters.to).getTime()) return false;
  if (filters.q) {
    const haystack = [
      item.title,
      item.description,
      item.clientName,
      item.lawyerName,
      item.type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");
    if (!haystack.includes(filters.q)) return false;
  }
  return true;
}

export function buildAgendaMetrics(items, now = new Date()) {
  const nowMs = now.getTime();
  const todayKey = getAgendaDateKey(now);
  const sevenDaysMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  return (items || []).reduce(
    (metrics, item) => {
      const timestamp = new Date(item.date).getTime();
      const pending = item.status === "PENDING";
      metrics.total += 1;
      if (pending) metrics.pending += 1;
      if (item.status === "COMPLETED") metrics.completed += 1;
      if (pending && getAgendaDateKey(item.date) === todayKey) metrics.today += 1;
      if (pending && timestamp >= nowMs && timestamp <= sevenDaysMs) metrics.nextSevenDays += 1;
      if (pending && timestamp < nowMs) metrics.overdue += 1;
      if (pending && item.urgency === "HIGH") metrics.critical += 1;
      return metrics;
    },
    { total: 0, pending: 0, completed: 0, today: 0, nextSevenDays: 0, overdue: 0, critical: 0 },
  );
}
