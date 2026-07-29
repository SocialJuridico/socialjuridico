/**
 * Utilitários puros da Central de Notícias.
 * Sem dependências de rede/DB — facilmente testáveis via Jest.
 */

export const EDITORIAL_TYPES = Object.freeze({
  NOTICIA_JURIDICA: "NOTICIA_JURIDICA",
  EDUCATIVO: "EDUCATIVO",
  NOVIDADE_PLATAFORMA: "NOVIDADE_PLATAFORMA",
});

export const ARTICLE_STATUS = Object.freeze({
  IDEIA: "IDEIA",
  COLETANDO_FONTES: "COLETANDO_FONTES",
  GERANDO: "GERANDO",
  RASCUNHO_IA: "RASCUNHO_IA",
  AGUARDANDO_REVISAO: "AGUARDANDO_REVISAO",
  APROVADO: "APROVADO",
  AGENDADO: "AGENDADO",
  PUBLICADO: "PUBLICADO",
  PAUSADO: "PAUSADO",
  REJEITADO: "REJEITADO",
  ARQUIVADO: "ARQUIVADO",
  FALHA: "FALHA",
});

/**
 * Transições de status permitidas (máquina de estados editorial).
 */
export const STATUS_TRANSITIONS = Object.freeze({
  IDEIA: ["COLETANDO_FONTES", "GERANDO", "RASCUNHO_IA", "REJEITADO", "ARQUIVADO"],
  COLETANDO_FONTES: ["GERANDO", "RASCUNHO_IA", "FALHA", "REJEITADO", "ARQUIVADO"],
  GERANDO: ["RASCUNHO_IA", "FALHA", "ARQUIVADO"],
  RASCUNHO_IA: ["AGUARDANDO_REVISAO", "REJEITADO", "ARQUIVADO"],
  AGUARDANDO_REVISAO: ["APROVADO", "REJEITADO", "RASCUNHO_IA", "ARQUIVADO"],
  APROVADO: ["AGENDADO", "PUBLICADO", "AGUARDANDO_REVISAO", "ARQUIVADO"],
  AGENDADO: ["PUBLICADO", "APROVADO", "PAUSADO", "ARQUIVADO"],
  PUBLICADO: ["PAUSADO", "ARQUIVADO"],
  PAUSADO: ["PUBLICADO", "ARQUIVADO"],
  REJEITADO: ["RASCUNHO_IA", "ARQUIVADO"],
  ARQUIVADO: [],
  FALHA: ["GERANDO", "RASCUNHO_IA", "ARQUIVADO"],
});

export function canTransition(from, to) {
  if (from === to) return true;
  const allowed = STATUS_TRANSITIONS[from];
  return Array.isArray(allowed) && allowed.includes(to);
}

const ACCENT_MAP = {
  á: "a", à: "a", ã: "a", â: "a", ä: "a",
  é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i",
  ó: "o", ò: "o", õ: "o", ô: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u",
  ç: "c", ñ: "n",
};

/**
 * Gera um slug seguro para URL a partir de um título.
 */
export function slugify(input) {
  if (typeof input !== "string") return "";
  const lower = input.trim().toLowerCase();
  const replaced = lower.replace(/[áàãâäéèêëíìîïóòõôöúùûüçñ]/g, (ch) => ACCENT_MAP[ch] || ch);
  return replaced
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

/**
 * Garante unicidade de slug ao anexar sufixo incremental quando necessário.
 * `existingSlugs` é um Set/Array com os slugs já ocupados.
 */
export function ensureUniqueSlug(baseSlug, existingSlugs = []) {
  const taken = existingSlugs instanceof Set ? existingSlugs : new Set(existingSlugs);
  const base = slugify(baseSlug) || "materia";
  if (!taken.has(base)) return base;

  let counter = 2;
  let candidate = `${base}-${counter}`;
  while (taken.has(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`;
  }
  return candidate;
}

/**
 * Calcula o tempo de leitura estimado em minutos (225 palavras/min).
 * Aceita HTML ou texto puro.
 */
export function estimateReadingTime(content) {
  if (typeof content !== "string" || !content.trim()) return 1;
  const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return Math.max(1, Math.round(words / 225));
}

/**
 * Gera um resumo (excerpt) a partir do conteúdo, respeitando limite de caracteres.
 */
export function buildExcerpt(content, maxLength = 160) {
  if (typeof content !== "string") return "";
  const text = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return `${(lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated).trim()}…`;
}

/**
 * Gera um código curto alfanumérico para links compartilháveis.
 */
export function generateShareCode(length = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "u", "b", "i", "ul", "ol", "li",
  "h2", "h3", "h4", "blockquote", "a", "figure", "figcaption", "img", "hr",
]);

/**
 * Sanitização leve de HTML editorial: remove scripts, iframes, handlers inline
 * e tags não permitidas. Não substitui uma sanitização server-side robusta,
 * mas garante um piso de segurança para conteúdo gerado por IA/admin.
 */
export function sanitizeEditorialHtml(html) {
  if (typeof html !== "string") return "";
  let output = html;
  // Remove blocos perigosos por completo.
  output = output.replace(/<script[\s\S]*?<\/script>/gi, "");
  output = output.replace(/<style[\s\S]*?<\/style>/gi, "");
  output = output.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  output = output.replace(/<object[\s\S]*?<\/object>/gi, "");
  output = output.replace(/<embed[\s\S]*?>/gi, "");
  // Remove handlers de eventos inline e protocolos perigosos.
  output = output.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  output = output.replace(/javascript:/gi, "");
  // Remove tags não permitidas mantendo o texto interno.
  output = output.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tag) => {
    return ALLOWED_TAGS.has(tag.toLowerCase()) ? match : "";
  });
  return output.trim();
}

/**
 * Valida um payload de matéria antes de persistir.
 * Retorna { valid, errors[] }.
 */
export function validateArticlePayload(payload = {}) {
  const errors = [];

  if (!payload.title || String(payload.title).trim().length < 8) {
    errors.push("O título deve ter ao menos 8 caracteres.");
  }
  if (payload.title && String(payload.title).length > 160) {
    errors.push("O título deve ter no máximo 160 caracteres.");
  }
  if (
    payload.editorial_type &&
    !Object.values(EDITORIAL_TYPES).includes(payload.editorial_type)
  ) {
    errors.push("Tipo editorial inválido.");
  }
  if (
    payload.status &&
    !Object.values(ARTICLE_STATUS).includes(payload.status)
  ) {
    errors.push("Status inválido.");
  }
  if (payload.seo_description && String(payload.seo_description).length > 300) {
    errors.push("A meta description deve ter no máximo 300 caracteres.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Regras de guarda editorial de compliance jurídico.
 * Bloqueia promessa de resultado, aconselhamento individual e alarmismo.
 */
const RISKY_PATTERNS = [
  /garant(o|ia|ido|imos)\s+(o\s+)?(ganho|sucesso|vitória|resultado)/i,
  /voc[êe]\s+(com certeza|certamente)\s+(vai\s+)?(ganha|receb|vence)/i,
  /\bprocure\s+urgente\b/i,
  /\bnão\s+perca\s+tempo\b.*\bprocesso\b/i,
];

export function checkComplianceRisks(text) {
  if (typeof text !== "string") return { ok: true, flags: [] };
  const flags = [];
  RISKY_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(text)) flags.push(`RISK_PATTERN_${index + 1}`);
  });
  return { ok: flags.length === 0, flags };
}

export const DEFAULT_LEGAL_NOTICE =
  "Este conteúdo tem caráter informativo e não constitui aconselhamento jurídico " +
  "individual. Para orientação sobre o seu caso, consulte um advogado.";