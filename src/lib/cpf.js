// Validação e formatação de CPF (dígitos verificadores, algoritmo padrão da
// Receita Federal). Usado no cadastro do Oráculo Jurídico, que exige CPF.

export function normalizeCPF(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 11);
}

export function formatCPF(value) {
  const digits = normalizeCPF(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function calculateCheckDigit(digits) {
  let sum = 0;
  let weight = digits.length + 1;

  for (const digit of digits) {
    sum += Number(digit) * weight;
    weight -= 1;
  }

  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function isValidCPF(value) {
  const digits = normalizeCPF(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const firstCheck = calculateCheckDigit(digits.slice(0, 9).split(""));
  if (firstCheck !== Number(digits[9])) return false;

  const secondCheck = calculateCheckDigit(digits.slice(0, 10).split(""));
  if (secondCheck !== Number(digits[10])) return false;

  return true;
}
