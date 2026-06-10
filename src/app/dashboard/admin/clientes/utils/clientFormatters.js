export function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("55") && digits.length >= 12) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 11) return `+55${digits}`;

  return `+${digits}`;
}

export function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("pt-BR");
}

export function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("pt-BR");
}

export function getLastAccessLabel(client) {
  if (!client?.last_sign_in_at) return "Nunca acessou";

  return formatDateTime(client.last_sign_in_at);
}

export function getInactiveDays(client) {
  if (!client?.last_sign_in_at) return null;

  const date = new Date(client.last_sign_in_at);

  if (Number.isNaN(date.getTime())) return null;

  return Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

export function getClientStatus(client) {
  if (!client?.last_sign_in_at) {
    return {
      label: "Nunca acessou",
      tone: "warning",
    };
  }

  const inactiveDays = getInactiveDays(client);

  if (inactiveDays !== null && inactiveDays >= 30) {
    return {
      label: `Inativo há ${inactiveDays} dias`,
      tone: "danger",
    };
  }

  if (inactiveDays !== null && inactiveDays >= 7) {
    return {
      label: `Sem acesso há ${inactiveDays} dias`,
      tone: "warning",
    };
  }

  return {
    label: "Ativo recentemente",
    tone: "success",
  };
}
