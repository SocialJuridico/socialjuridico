const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;
const HEX_PATTERN = /^#[0-9a-f]{6}$/i;
const ALLOWED_THEMES = new Set(["midnight", "graphite", "wine", "light"]);
const ALLOWED_BACKGROUNDS = new Set(["aurora", "solid", "mesh", "minimal"]);
const ALLOWED_LINK_ICONS = new Set([
  "link",
  "calendar",
  "briefcase",
  "book",
  "file",
  "globe",
  "message",
  "scale",
  "star",
]);

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

export function normalizeDigitalCardText(value, maxLength = 500) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function slugifyDigitalCard(value) {
  return normalizeDigitalCardText(value, 80)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export function isValidDigitalCardSlug(value) {
  return SLUG_PATTERN.test(String(value || ""));
}

export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 15);
}

export function normalizePublicUrl(value, { allowMailto = false, allowTel = false } = {}) {
  const input = normalizeDigitalCardText(value, 500);
  if (!input) return "";
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(input) ? input : `https://${input}`;
    const url = new URL(withProtocol);
    const allowed = new Set(["http:", "https:"]);
    if (allowMailto) allowed.add("mailto:");
    if (allowTel) allowed.add("tel:");
    if (!allowed.has(url.protocol)) return "";
    if (["http:", "https:"].includes(url.protocol) && !url.hostname) return "";
    return url.toString();
  } catch {
    return "";
  }
}

export function normalizeSocialUrl(value, network) {
  const input = normalizeDigitalCardText(value, 200);
  if (!input) return "";
  if (/^https?:\/\//i.test(input)) return normalizePublicUrl(input);
  const handle = input.replace(/^@/, "").replace(/^\/+|\/+$/g, "");
  const bases = {
    instagram: "https://instagram.com/",
    linkedin: "https://linkedin.com/in/",
    youtube: "https://youtube.com/@",
  };
  return bases[network] ? `${bases[network]}${handle}` : "";
}

export function normalizeCustomLinks(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const normalized = [];
  for (const item of value.slice(0, 8)) {
    const title = normalizeDigitalCardText(item?.title, 80);
    const url = normalizePublicUrl(item?.url);
    if (!title || !url) continue;
    const keyCandidate = slugifyDigitalCard(item?.key || title).slice(0, 40) || "link";
    let key = keyCandidate;
    let suffix = 2;
    while (seen.has(key)) key = `${keyCandidate}-${suffix++}`.slice(0, 40);
    seen.add(key);
    normalized.push({
      key,
      title,
      url,
      icon: ALLOWED_LINK_ICONS.has(item?.icon) ? item.icon : "link",
      enabled: item?.enabled !== false,
    });
  }
  return normalized;
}

export function validateDigitalCardMutation(input, { partial = false } = {}) {
  const source = input && typeof input === "object" ? input : {};
  const data = {};
  const errors = {};

  const textFields = {
    displayName: ["display_name", 100],
    headline: ["headline", 120],
    bio: ["bio", 700],
    avatarUrl: ["avatar_url", 500],
    publicEmail: ["public_email", 160],
    location: ["location", 120],
  };
  for (const [inputKey, [outputKey, limit]] of Object.entries(textFields)) {
    if (!partial || hasOwn(source, inputKey) || hasOwn(source, outputKey)) {
      data[outputKey] = normalizeDigitalCardText(source[inputKey] ?? source[outputKey], limit);
    }
  }

  if (!partial || hasOwn(source, "slug")) {
    const slug = slugifyDigitalCard(source.slug);
    if (!isValidDigitalCardSlug(slug)) errors.slug = "Use de 3 a 50 caracteres, apenas letras, números e hífens.";
    else data.slug = slug;
  }

  if (!partial || hasOwn(source, "phone")) data.phone = normalizePhone(source.phone);
  if (!partial || hasOwn(source, "whatsapp")) data.whatsapp = normalizePhone(source.whatsapp);

  if (!partial || hasOwn(source, "website")) {
    const website = normalizePublicUrl(source.website);
    if (source.website && !website) errors.website = "Informe uma URL válida.";
    data.website = website;
  }
  for (const network of ["instagram", "linkedin", "youtube"]) {
    if (!partial || hasOwn(source, network)) {
      const normalized = normalizeSocialUrl(source[network], network);
      if (source[network] && !normalized) errors[network] = "Informe um perfil válido.";
      data[network] = normalized;
    }
  }

  if (!partial || hasOwn(source, "theme")) {
    data.theme = ALLOWED_THEMES.has(source.theme) ? source.theme : "midnight";
  }
  if (!partial || hasOwn(source, "backgroundStyle") || hasOwn(source, "background_style")) {
    const value = source.backgroundStyle ?? source.background_style;
    data.background_style = ALLOWED_BACKGROUNDS.has(value) ? value : "aurora";
  }
  if (!partial || hasOwn(source, "accentColor") || hasOwn(source, "accent_color")) {
    const value = String(source.accentColor ?? source.accent_color ?? "").toUpperCase();
    if (!HEX_PATTERN.test(value)) errors.accentColor = "Informe uma cor hexadecimal válida.";
    else data.accent_color = value;
  }

  if (!partial || hasOwn(source, "customLinks") || hasOwn(source, "custom_links")) {
    data.custom_links = normalizeCustomLinks(source.customLinks ?? source.custom_links);
  }

  const booleanFields = {
    showEmail: "show_email",
    showPhone: "show_phone",
    showLocation: "show_location",
    showRating: "show_rating",
    showBrand: "show_brand",
    isPublished: "is_published",
  };
  for (const [inputKey, outputKey] of Object.entries(booleanFields)) {
    if (!partial || hasOwn(source, inputKey) || hasOwn(source, outputKey)) {
      const value = source[inputKey] ?? source[outputKey];
      data[outputKey] = value === true;
    }
  }

  if (data.public_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.public_email)) {
    errors.publicEmail = "Informe um e-mail válido.";
  }
  if (data.avatar_url && !normalizePublicUrl(data.avatar_url)) {
    errors.avatarUrl = "A foto precisa usar uma URL HTTP ou HTTPS válida.";
  }
  if (partial && Object.keys(data).length === 0 && Object.keys(errors).length === 0) {
    errors.form = "Nenhuma alteração válida foi informada.";
  }

  return { success: Object.keys(errors).length === 0, data, errors };
}

export function buildDigitalCardPublicUrl(origin, slug) {
  const safeOrigin = String(origin || "").replace(/\/+$/, "");
  return `${safeOrigin}/cartao/${encodeURIComponent(slug)}`;
}

export function getDigitalCardLinkMap(card) {
  const links = new Map();
  if (card.whatsapp) links.set("whatsapp", `https://wa.me/${card.whatsapp}`);
  if (card.phone && card.showPhone) links.set("phone", `tel:+${card.phone}`);
  if (card.publicEmail && card.showEmail) links.set("email", `mailto:${card.publicEmail}`);
  if (card.website) links.set("website", card.website);
  if (card.instagram) links.set("instagram", card.instagram);
  if (card.linkedin) links.set("linkedin", card.linkedin);
  if (card.youtube) links.set("youtube", card.youtube);
  for (const link of card.customLinks || []) {
    if (link.enabled !== false) links.set(`custom:${link.key}`, link.url);
  }
  return links;
}
