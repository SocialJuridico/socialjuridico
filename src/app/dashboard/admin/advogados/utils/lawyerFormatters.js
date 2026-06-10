export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;
  return `+${digits}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

export function getInactiveDays(lawyer) {
  if (!lawyer?.last_sign_in_at) return null;
  const date = new Date(lawyer.last_sign_in_at);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

export function getActivityStatus(lawyer) {
  if (!lawyer?.last_sign_in_at) return { label: "Nunca acessou", tone: "warning" };
  const days = getInactiveDays(lawyer);
  if (days !== null && days >= 30) return { label: `Inativo há ${days} dias`, tone: "danger" };
  if (days !== null && days >= 7) return { label: `Sem acesso há ${days} dias`, tone: "warning" };
  return { label: "Ativo recentemente", tone: "success" };
}

export function getOabStatus(lawyer) {
  const status = lawyer?.oab_verification_status || "PENDING";
  if (status === "VERIFIED") return { label: "Verificada", tone: "success" };
  if (status === "ERROR") return { label: "Com pendência", tone: "danger" };
  return { label: "Pendente", tone: "warning" };
}

export function getPlanType(lawyer) {
  if (lawyer?.plan_type) return lawyer.plan_type;
  return lawyer?.is_premium ? "PRO" : "FREE";
}

export function getPlanStatus(lawyer) {
  const plan = getPlanType(lawyer);
  if (plan === "PRO") return { label: "PRO", tone: "gold" };
  if (plan === "START") return { label: "START", tone: "blue" };
  return { label: "FREE", tone: "muted" };
}

export function getPlanExpirationStatus(lawyer) {
  const planType = getPlanType(lawyer);
  const hasPaidPlan = planType === "START" || planType === "PRO" || Boolean(lawyer?.is_premium);
  const value = lawyer?.premium_expires_at;

  if (!hasPaidPlan) {
    return {
      label: "Plano gratuito",
      detail: "Sem data de expiração",
      tone: "muted",
      expired: false,
      inconsistent: false,
    };
  }

  if (!value) {
    return {
      label: "Sem data de expiração",
      detail: "Plano ativo sem vencimento registrado",
      tone: "warning",
      expired: false,
      inconsistent: true,
    };
  }

  const expirationDate = new Date(value);

  if (Number.isNaN(expirationDate.getTime())) {
    return {
      label: "Data inválida",
      detail: "Revise o vencimento deste plano",
      tone: "danger",
      expired: false,
      inconsistent: true,
    };
  }

  const differenceMs = expirationDate.getTime() - Date.now();
  const differenceDays = Math.ceil(differenceMs / 86_400_000);
  const formattedDate = formatDateTime(value);

  if (differenceMs < 0) {
    const expiredDays = Math.max(1, Math.floor(Math.abs(differenceMs) / 86_400_000));
    return {
      label: `Expirado há ${expiredDays} dia${expiredDays === 1 ? "" : "s"}`,
      detail: `Vencimento: ${formattedDate}`,
      tone: "danger",
      expired: true,
      inconsistent: Boolean(lawyer?.is_premium) || planType !== "FREE",
    };
  }

  if (differenceDays <= 1) {
    return {
      label: "Expira hoje",
      detail: `Vencimento: ${formattedDate}`,
      tone: "warning",
      expired: false,
      inconsistent: false,
    };
  }

  return {
    label: `Vigente por mais ${differenceDays} dias`,
    detail: `Vencimento: ${formattedDate}`,
    tone: differenceDays <= 7 ? "warning" : "success",
    expired: false,
    inconsistent: false,
  };
}
