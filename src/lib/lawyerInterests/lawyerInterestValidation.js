import { clampInteger, normalizeSearch } from "../lawyerOpportunities/opportunityValidation";

export const INTEREST_STATUSES = ["PENDING", "NEGOTIATING", "HIRED", "DECLINED"];
export const INTEREST_STATUS_FILTERS = ["ACTIVE", "ALL", ...INTEREST_STATUSES];

export const INTEREST_STATUS_LABELS = {
  ACTIVE: "Ativos",
  ALL: "Todos",
  PENDING: "Aguardando cliente",
  NEGOTIATING: "Em negociação",
  HIRED: "Contratado",
  DECLINED: "Recusado",
};

export function normalizeInterestStatus(value, fallback = "ACTIVE") {
  const status = String(value || "").trim().toUpperCase();
  return INTEREST_STATUS_FILTERS.includes(status) ? status : fallback;
}

export function resolveInterestStatusList(status) {
  const normalized = normalizeInterestStatus(status);
  if (normalized === "ALL") return INTEREST_STATUSES;
  if (normalized === "ACTIVE") return ["PENDING", "NEGOTIATING"];
  return [normalized];
}

export function normalizeInterestFilters(searchParams) {
  const q = normalizeSearch(searchParams.get("q"), 120);
  const status = normalizeInterestStatus(searchParams.get("status"));
  const page = clampInteger(searchParams.get("page"), 1, 1, 1000);
  const limit = clampInteger(searchParams.get("limit"), 10, 5, 30);

  return { q, status, page, limit };
}

export function createEmptyInterestSummary() {
  return {
    total: 0,
    active: 0,
    pending: 0,
    negotiating: 0,
    hired: 0,
    declined: 0,
  };
}

export function buildInterestSummary(items = []) {
  return items.reduce((summary, item) => {
    const status = String(item?.status || "").toUpperCase();
    summary.total += 1;
    if (status === "PENDING") {
      summary.pending += 1;
      summary.active += 1;
    }
    if (status === "NEGOTIATING") {
      summary.negotiating += 1;
      summary.active += 1;
    }
    if (status === "HIRED") summary.hired += 1;
    if (status === "DECLINED") summary.declined += 1;
    return summary;
  }, createEmptyInterestSummary());
}

export function getInterestStatusLabel(status) {
  return INTEREST_STATUS_LABELS[String(status || "").toUpperCase()] || "Interesse";
}

export function canCancelInterest(status) {
  return String(status || "").toUpperCase() === "PENDING";
}

export function canOpenNegotiation(status) {
  return String(status || "").toUpperCase() === "NEGOTIATING";
}
