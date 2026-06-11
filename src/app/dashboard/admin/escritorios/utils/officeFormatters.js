import { OFFICE_PLANS } from "./officeConstants";

export function formatCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatCep(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8);
  return digits.length <= 5 ? digits : `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

export function getPlanOption(plan) {
  return OFFICE_PLANS.find((item) => item.value === plan) || OFFICE_PLANS[0];
}

export function getPlanDisplayName(plan) {
  return getPlanOption(plan).label;
}

export function getPlanFamily(plan) {
  return getPlanOption(plan).family;
}

export function getOfficeInitials(name) {
  const words = String(name || "ES")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "ES";
}

export function getStaffCounts(staff = []) {
  return staff.reduce(
    (counts, member) => {
      if (member.cargo === "estagiario") counts.interns += 1;
      else counts.lawyers += 1;
      return counts;
    },
    { lawyers: 0, interns: 0 },
  );
}

export function getOfficeCapacityLabel(office) {
  return `${office.max_advogados || 0} adv. / ${office.max_estagiarios || 0} est.`;
}
