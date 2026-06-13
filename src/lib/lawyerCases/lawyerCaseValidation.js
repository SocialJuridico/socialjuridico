import {
  clampInteger,
  normalizeSearch,
} from "../lawyerOpportunities/opportunityValidation";

export const LAWYER_CASE_STATUSES = [
  "ABERTO",
  "NEGOCIANDO",
  "CONTRATADO",
  "EM_ANDAMENTO",
  "FECHADO",
  "CANCELADO",
];

export const LAWYER_CASE_STATUS_LABELS = {
  ALL: "Todos",
  ACTIVE: "Ativos",
  CLOSED: "Encerrados",
  ABERTO: "Publicado",
  NEGOCIANDO: "Em negociação",
  CONTRATADO: "Contratado",
  EM_ANDAMENTO: "Em andamento",
  FECHADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export function normalizeLawyerCaseStatus(value, fallback = "ACTIVE") {
  const normalized = String(value || "").trim().toUpperCase();
  const allowed = ["ALL", "ACTIVE", "CLOSED", ...LAWYER_CASE_STATUSES];
  return allowed.includes(normalized) ? normalized : fallback;
}

export function resolveLawyerCaseStatuses(status) {
  const normalized = normalizeLawyerCaseStatus(status);
  if (normalized === "ALL") return LAWYER_CASE_STATUSES;
  if (normalized === "ACTIVE") {
    return ["ABERTO", "CONTRATADO", "EM_ANDAMENTO", "NEGOCIANDO"];
  }
  if (normalized === "CLOSED") return ["FECHADO", "CANCELADO"];
  return [normalized];
}

export function normalizeLawyerCaseFilters(searchParams) {
  return {
    q: normalizeSearch(searchParams.get("q"), 120),
    status: normalizeLawyerCaseStatus(searchParams.get("status")),
    page: clampInteger(searchParams.get("page"), 1, 1, 1000),
    limit: clampInteger(searchParams.get("limit"), 10, 5, 30),
  };
}

export function isClosedLawyerCase(status) {
  return ["FECHADO", "CANCELADO"].includes(
    String(status || "").toUpperCase(),
  );
}

export function canStartLawyerCaseChat(caseItem) {
  return Boolean(
    caseItem &&
      !caseItem.chatStarted &&
      !isClosedLawyerCase(caseItem.status),
  );
}

export function canOpenLawyerCaseChat(caseItem) {
  return Boolean(
    caseItem?.chatStarted &&
      String(caseItem.status || "").toUpperCase() !== "CANCELADO",
  );
}

export function buildLawyerCaseSummary(items = []) {
  return items.reduce(
    (summary, item) => {
      const status = String(item?.status || "").toUpperCase();
      summary.total += 1;
      if (["ABERTO", "CONTRATADO", "EM_ANDAMENTO", "NEGOCIANDO"].includes(status)) {
        summary.active += 1;
      }
      if (status === "CONTRATADO") summary.hired += 1;
      if (status === "EM_ANDAMENTO") summary.inProgress += 1;
      if (status === "FECHADO") summary.closed += 1;
      if (status === "CANCELADO") summary.cancelled += 1;
      if (item?.chatStarted) summary.chatReady += 1;
      summary.unread += Number(item?.unreadCount || 0);
      return summary;
    },
    {
      total: 0,
      active: 0,
      hired: 0,
      inProgress: 0,
      closed: 0,
      cancelled: 0,
      chatReady: 0,
      unread: 0,
    },
  );
}

export function getLawyerCaseStatusLabel(status) {
  return (
    LAWYER_CASE_STATUS_LABELS[String(status || "").toUpperCase()] ||
    "Caso jurídico"
  );
}
