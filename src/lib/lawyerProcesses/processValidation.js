import crypto from "node:crypto";

const CNJ_DIGITS = /^\d{20}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PARTY_TYPES = Object.freeze([
  "pessoa_fisica",
  "pessoa_juridica",
  "nao_informado",
]);

export function normalizeProcessNumber(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 20);
}

export function formatProcessNumber(value) {
  const digits = normalizeProcessNumber(value);
  if (digits.length !== 20) return value || "";
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

export function isProcessNumber(value) {
  return CNJ_DIGITS.test(normalizeProcessNumber(value));
}

export function isUuid(value) {
  return UUID_PATTERN.test(String(value || ""));
}

export function normalizeProcessText(value, max = 500) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function normalizePartyType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["pf", "fisica", "física", "pessoa física", "pessoa_fisica"].includes(normalized)) {
    return "pessoa_fisica";
  }
  if (["pj", "juridica", "jurídica", "pessoa jurídica", "pessoa_juridica"].includes(normalized)) {
    return "pessoa_juridica";
  }
  return PARTY_TYPES.includes(normalized) ? normalized : "nao_informado";
}

export function normalizePartyPayload(value = {}) {
  const nome =
    normalizeProcessText(value.nome || value.name || value.razao_social || value.razaoSocial, 180);
  const tipo = normalizePartyType(value.tipo || value.type);
  const documento = normalizeProcessText(value.documento || value.cpf_cnpj || value.document || "", 30);
  const email = normalizeProcessText(value.email || "", 254).toLowerCase();
  const telefone = normalizeProcessText(value.telefone || value.phone || "", 30);
  const observacoes = normalizeProcessText(value.observacoes || value.notes || "", 1000);

  return {
    nome,
    tipo,
    documento,
    email,
    telefone,
    observacoes,
  };
}

export function partyTypeToCrmType(value) {
  const tipo = normalizePartyType(value);
  if (tipo === "pessoa_juridica") return "Pessoa Jurídica";
  return "Pessoa Física";
}

export function partyToCrmPayload(party = {}) {
  const normalized = normalizePartyPayload(party);
  return {
    name: normalized.nome,
    type: partyTypeToCrmType(normalized.tipo),
    cpfCnpj: normalized.documento,
    email: normalized.email,
    phone: normalized.telefone,
    notes: normalized.observacoes,
    status: "Ativo",
  };
}

export function makeRequestId(value) {
  return isUuid(value) ? String(value) : crypto.randomUUID();
}

export function validateSearchPayload(payload = {}) {
  const numeroProcesso = normalizeProcessNumber(
    payload.numero_processo || payload.numeroProcesso || payload.numero_cnj || payload.numeroCnj,
  );

  if (!isProcessNumber(numeroProcesso)) {
    return {
      valid: false,
      status: 400,
      message: "Informe um número CNJ válido com 20 dígitos.",
    };
  }

  return { valid: true, numeroProcesso };
}

export function validateDownloadPayload(payload = {}) {
  const base = validateSearchPayload(payload);
  if (!base.valid) return base;

  const clienteManual = normalizePartyPayload(payload.cliente || payload.clienteManual || {});
  const parteContrariaManual = normalizePartyPayload(
    payload.parte_contraria || payload.parteContraria || payload.parteContrariaManual || {},
  );
  const selectedDatajudParty = normalizePartyPayload(
    payload.parte_cliente || payload.parteCliente || payload.selectedParty || {},
  );
  const existingClientId = payload.cliente_id || payload.clientId || null;
  const requestId = makeRequestId(payload.requestId);

  if (existingClientId && !isUuid(existingClientId)) {
    return {
      valid: false,
      status: 400,
      message: "Cliente selecionado inválido.",
    };
  }

  if (!existingClientId && !clienteManual.nome && !selectedDatajudParty.nome) {
    return {
      valid: false,
      status: 400,
      message: "Selecione ou informe o cliente antes de importar o processo.",
    };
  }

  return {
    valid: true,
    numeroProcesso: base.numeroProcesso,
    existingClientId,
    clienteManual,
    selectedDatajudParty,
    parteContrariaManual,
    requestId,
  };
}
