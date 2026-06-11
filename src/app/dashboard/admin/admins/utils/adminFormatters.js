export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value) {
  if (!value) return "Nunca acessou";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Nunca acessou"
    : date.toLocaleString("pt-BR");
}

export function getAdminInitials(name, email) {
  const source = String(name || email || "AD").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
