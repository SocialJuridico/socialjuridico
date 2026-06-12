export const EMPTY_SUMMARY = {
  totalAdvertisers: 0,
  activeAdvertisers: 0,
  suspendedAdvertisers: 0,
  totalAds: 0,
  activeAds: 0,
  archivedAds: 0,
  featuredAds: 0,
  supportMessages: 0,
};

export const AD_STATUS_LABELS = {
  ATIVO: "Ativo",
  ARQUIVADO: "Arquivado",
};

export const CATEGORY_LABELS = {
  PREPOSTOS: "Prepostos",
  DILIGENCIAS: "Diligências",
  OUTROS: "Outros",
};

export function formatDate(value) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Data indisponível";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
