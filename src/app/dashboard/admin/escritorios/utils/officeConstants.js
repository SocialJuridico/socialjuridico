export const OFFICE_AREAS = [
  "Civil",
  "Penal",
  "Trabalhista",
  "Tributário",
  "Previdenciário",
  "Família",
  "Consumidor",
  "Imobiliário",
  "Digital",
  "Empresarial",
];

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export const OFFICE_PLANS = [
  { value: "start", label: "Enterprise Start", family: "start" },
  { value: "start_7", label: "Enterprise Start — 7 dias", family: "start" },
  { value: "start_15", label: "Enterprise Start — 15 dias", family: "start" },
  { value: "start_30", label: "Enterprise Start — 30 dias", family: "start" },
  { value: "pro", label: "Enterprise Pro", family: "pro" },
  { value: "pro_7", label: "Enterprise Pro — 7 dias", family: "pro" },
  { value: "pro_15", label: "Enterprise Pro — 15 dias", family: "pro" },
  { value: "pro_30", label: "Enterprise Pro — 30 dias", family: "pro" },
  { value: "pro_plus", label: "Enterprise Pro+", family: "pro_plus" },
  { value: "pro_plus_7", label: "Enterprise Pro+ — 7 dias", family: "pro_plus" },
  { value: "pro_plus_15", label: "Enterprise Pro+ — 15 dias", family: "pro_plus" },
  { value: "pro_plus_30", label: "Enterprise Pro+ — 30 dias", family: "pro_plus" },
];

export const DEFAULT_LIMITS = {
  storage_mb: 256000,
  creditos_ia: 1500,
  notificacoes: 50,
  osint: 15,
  oab_sinc: 0,
};

export const EMPTY_OFFICE = {
  nome: "",
  cnpj: "",
  max_advogados: 10,
  max_estagiarios: 5,
  endereco: "",
  cidade_estado: "",
  cep: "",
  areas_atuacao: [],
  estados_atendidos: ["Todo o Território Brasileiro"],
  nome_responsavel: "",
  logo_url: "",
  email: "",
  senha: "",
  plano: "start",
};

export const EMPTY_STAFF = {
  name: "",
  email: "",
  phone: "",
  oab: "",
  estado: "SP",
  cargo: "advogado",
};
