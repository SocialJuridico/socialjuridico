export function normalizePlanType(profile = {}) {
  const raw = String(profile.plan_type || "FREE").toUpperCase();
  if (profile.is_premium === true && raw === "FREE") return "PRO";
  return raw;
}

export function formatLimit(value) {
  if (value === null || value === undefined) return "Ilimitado";
  if (!Number.isFinite(Number(value))) return "Ilimitado";
  return Number(value).toLocaleString("pt-BR");
}

export function buildUsageItem(id, label, data = {}, unit = "") {
  const used = Number(data.used || 0);
  const hasLimit = Object.prototype.hasOwnProperty.call(data, "limit");
  const hasMax = Object.prototype.hasOwnProperty.call(data, "max");
  const rawLimit = hasLimit ? data.limit : hasMax ? data.max : 0;
  const unlimited = rawLimit === null || !Number.isFinite(Number(rawLimit));
  const limit = unlimited ? null : Number(rawLimit || 0);
  const remaining = unlimited
    ? null
    : Math.max(Number(data.remaining ?? limit - used), 0);
  const percentage =
    unlimited || !limit
      ? 0
      : Math.min(100, Math.round((used / limit) * 100));

  return {
    id,
    label,
    used,
    limit,
    remaining,
    percentage,
    unlimited,
    unit,
  };
}

export function buildCaseReport(cases = [], summary = {}) {
  const areaCounts = new Map();
  const stateCounts = new Map();
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  let recent = 0;

  for (const item of cases) {
    const area = item.practiceArea || "Direito Geral";
    areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
    const state = item.state || "Não informado";
    stateCounts.set(state, (stateCounts.get(state) || 0) + 1);
    const created = new Date(item.createdAt || 0).getTime();
    if (Number.isFinite(created) && now - created <= sevenDays) recent += 1;
  }

  const topAreas = [...areaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));
  const topStates = [...stateCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  return {
    available: Number(summary.available || 0),
    negotiating: Number(summary.negotiating || 0),
    recent,
    loaded: cases.length,
    topAreas,
    topStates,
  };
}

export function formatDate(value) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
