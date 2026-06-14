export const DOCUMENT_MODES = Object.freeze([
  { id: "contract", label: "Contrato" },
  { id: "power-of-attorney", label: "Procuração" },
]);

export const CONTRACT_TYPES = Object.freeze([
  "Contrato de Honorários",
  "Contrato de Prestação de Serviços",
  "Contrato de Confidencialidade",
  "Contrato de Compra e Venda",
  "Contrato de Locação",
]);

export const DOCUMENT_TONES = Object.freeze([
  "Formal",
  "Técnico",
  "Conciliador",
  "Agressivo",
]);

export const EMPTY_PARTY = Object.freeze({
  name: "",
  document: "",
  civilStatus: "",
  profession: "",
  address: "",
});

export function createEmptyContract() {
  return {
    type: CONTRACT_TYPES[0],
    tone: "Técnico",
    partyOne: { ...EMPTY_PARTY },
    partyTwo: { ...EMPTY_PARTY },
    purpose: "",
    jurisdiction: "",
    city: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

export function createEmptyPowerOfAttorney(profile = {}) {
  return {
    tone: "Formal",
    grantor: { ...EMPTY_PARTY },
    attorney: {
      name: profile?.name || "",
      document: profile?.cpf || "",
      civilStatus: "",
      profession: "Advogado(a)",
      address: profile?.address || "",
      oab: profile?.oab || "",
    },
    powers: "Ad Judicia et Extra",
    jurisdiction: "",
    city: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

function clean(value, fallback = "não informado") {
  const text = String(value || "").trim();
  return text || fallback;
}

function dateLabel(value) {
  if (!value) return "data não informada";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return clean(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function qualification(role, party, extra = "") {
  const segments = [
    `${role}: ${clean(party?.name, "NOME NÃO INFORMADO")}`,
    `CPF/CNPJ ${clean(party?.document)}`,
    `estado civil ${clean(party?.civilStatus)}`,
    `profissão ${clean(party?.profession)}`,
    `endereço ${clean(party?.address)}`,
  ];
  if (extra) segments.push(extra);
  return `${segments.join(", ")}.`;
}

export function buildGenerationPayload(mode, contract, powerOfAttorney) {
  if (mode === "contract") {
    return {
      type: "Contrato de Honorários",
      tone: contract.tone,
      facts: [
        `O documento solicitado é um ${clean(contract.type, "contrato")}.`,
        "Gere somente o corpo e as cláusulas do documento, sem qualificação nominal das partes.",
        "Use os papéis CONTRATANTE e CONTRATADO ao longo do texto.",
        `Objetivo e condições essenciais: ${clean(contract.purpose, "não informado")}`,
        `Foro/comarca: ${clean(contract.jurisdiction)}`,
        `Local de assinatura: ${clean(contract.city)}`,
        "Não use Markdown e não invente nomes, documentos, endereços ou valores ausentes.",
      ].join("\n"),
    };
  }

  return {
    type: "Procuração",
    tone: powerOfAttorney.tone,
    facts: [
      "Gere somente o corpo jurídico de uma procuração, sem qualificação nominal das partes.",
      "Use os papéis OUTORGANTE e OUTORGADO ao longo do texto.",
      `Poderes concedidos: ${clean(powerOfAttorney.powers, "não informado")}`,
      `Foro/comarca de referência: ${clean(powerOfAttorney.jurisdiction)}`,
      "Não use Markdown e não invente nomes, documentos ou endereços.",
    ].join("\n"),
  };
}

export function composeGeneratedDocument(mode, draft, contract, powerOfAttorney) {
  const body = String(draft || "").trim();
  if (mode === "contract") {
    return [
      contract.type.toUpperCase(),
      "",
      qualification("CONTRATANTE", contract.partyOne),
      "",
      qualification("CONTRATADO", contract.partyTwo),
      "",
      body,
      "",
      `${clean(contract.city, "Local não informado")}, ${dateLabel(contract.date)}.`,
      "",
      "________________________________________",
      clean(contract.partyOne.name, "CONTRATANTE"),
      "CONTRATANTE",
      "",
      "________________________________________",
      clean(contract.partyTwo.name, "CONTRATADO"),
      "CONTRATADO",
    ].join("\n");
  }

  return [
    "PROCURAÇÃO",
    "",
    qualification("OUTORGANTE", powerOfAttorney.grantor),
    "",
    qualification(
      "OUTORGADO",
      powerOfAttorney.attorney,
      `OAB ${clean(powerOfAttorney.attorney?.oab)}`,
    ),
    "",
    body,
    "",
    `${clean(powerOfAttorney.city, "Local não informado")}, ${dateLabel(powerOfAttorney.date)}.`,
    "",
    "________________________________________",
    clean(powerOfAttorney.grantor.name, "OUTORGANTE"),
    "OUTORGANTE",
  ].join("\n");
}

export function validateDocumentForm(mode, contract, powerOfAttorney) {
  if (mode === "contract") {
    if (!contract.partyOne.name.trim()) return "Informe o nome do contratante.";
    if (!contract.partyOne.document.trim()) return "Informe o CPF/CNPJ do contratante.";
    if (!contract.partyTwo.name.trim()) return "Informe o nome do contratado.";
    if (!contract.partyTwo.document.trim()) return "Informe o CPF/CNPJ do contratado.";
    if (contract.purpose.trim().length < 40) {
      return "Descreva o objetivo e as condições do contrato com pelo menos 40 caracteres.";
    }
    return "";
  }

  if (!powerOfAttorney.grantor.name.trim()) return "Informe o nome do outorgante.";
  if (!powerOfAttorney.grantor.document.trim()) return "Informe o CPF/CNPJ do outorgante.";
  if (!powerOfAttorney.attorney.name.trim()) return "Informe o nome do advogado outorgado.";
  if (!powerOfAttorney.attorney.oab.trim()) return "Informe a OAB do advogado outorgado.";
  if (powerOfAttorney.powers.trim().length < 20) {
    return "Descreva os poderes concedidos com pelo menos 20 caracteres.";
  }
  return "";
}

export function buildDocumentFileName(mode, contract) {
  const base = mode === "contract" ? contract.type : "Procuracao";
  return `${String(base || "Documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")}.pdf`;
}
