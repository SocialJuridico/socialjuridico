import {
  clampInteger,
  normalizeSearch,
} from "../lawyerOpportunities/opportunityValidation";

export const SERVICE_AD_CATEGORIES = [
  "PREPOSTOS",
  "DILIGENCIAS",
  "OUTROS",
];

export const SERVICE_AD_CATEGORY_LABELS = {
  ALL: "Todos os serviços",
  PREPOSTOS: "Prepostos",
  DILIGENCIAS: "Diligências",
  OUTROS: "Outros serviços",
};

export function normalizeServiceAdCategory(value, fallback = "ALL") {
  const normalized = String(value || "").trim().toUpperCase();
  return ["ALL", ...SERVICE_AD_CATEGORIES].includes(normalized)
    ? normalized
    : fallback;
}

export function normalizeServiceAdFeatured(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return ["ALL", "FEATURED", "STANDARD"].includes(normalized)
    ? normalized
    : "ALL";
}

export function normalizeServiceAdSort(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return ["RELEVANCE", "RECENT"].includes(normalized)
    ? normalized
    : "RELEVANCE";
}

export function normalizeServiceAdFilters(searchParams) {
  return {
    q: normalizeSearch(searchParams.get("q"), 120),
    category: normalizeServiceAdCategory(searchParams.get("categoria")),
    featured: normalizeServiceAdFeatured(searchParams.get("destaque")),
    sort: normalizeServiceAdSort(searchParams.get("ordem")),
    page: clampInteger(searchParams.get("page"), 1, 1, 1000),
    limit: clampInteger(searchParams.get("limit"), 12, 6, 30),
  };
}

export function normalizeServiceAdText(value, maxLength = 3000) {
  return String(value || "")
    .replace(/[\u0000\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function normalizeServiceAdPhone(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 15);
}

export function isValidServiceAdPhone(value) {
  const digits = normalizeServiceAdPhone(value);
  return digits.length >= 10 && digits.length <= 15;
}

export function normalizeServiceAdWhatsAppPhone(value) {
  const digits = normalizeServiceAdPhone(value);
  if (!isValidServiceAdPhone(digits)) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function buildServiceAdWhatsAppUrl(phone, title) {
  const digits = normalizeServiceAdWhatsAppPhone(phone);
  if (!digits) return null;

  const message = normalizeServiceAdText(
    `Olá! Encontrei o anúncio “${title || "Serviço jurídico"}” no Social Jurídico e gostaria de mais informações.`,
    500,
  );

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function getServiceAdCategoryLabel(category) {
  return (
    SERVICE_AD_CATEGORY_LABELS[
      normalizeServiceAdCategory(category, "OUTROS")
    ] || SERVICE_AD_CATEGORY_LABELS.OUTROS
  );
}

export function matchesServiceAdSearch(ad, query) {
  const normalizedQuery = normalizeServiceAdText(query, 120)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (!normalizedQuery) return true;

  const haystack = [
    ad?.title,
    ad?.description,
    ad?.category,
    ad?.categoryLabel,
    ad?.advertiser?.name,
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function buildServiceAdSummary(items = []) {
  return items.reduce(
    (summary, item) => {
      summary.total += 1;
      if (item?.featured) summary.featured += 1;
      if (item?.category === "PREPOSTOS") summary.prepostos += 1;
      if (item?.category === "DILIGENCIAS") summary.diligencias += 1;
      if (item?.category === "OUTROS") summary.outros += 1;
      if (item?.advertiser?.id) summary.advertiserIds.add(item.advertiser.id);
      return summary;
    },
    {
      total: 0,
      featured: 0,
      prepostos: 0,
      diligencias: 0,
      outros: 0,
      advertiserIds: new Set(),
    },
  );
}

export function serializeServiceAdSummary(summary) {
  return {
    total: Number(summary?.total || 0),
    featured: Number(summary?.featured || 0),
    prepostos: Number(summary?.prepostos || 0),
    diligencias: Number(summary?.diligencias || 0),
    outros: Number(summary?.outros || 0),
    advertisers: summary?.advertiserIds?.size || 0,
  };
}
