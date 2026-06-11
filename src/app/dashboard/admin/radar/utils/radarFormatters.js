export const STATUS_OPTIONS = [
  { value: "pendente", label: "Pendentes" },
  { value: "aprovado", label: "Aprovadas" },
  { value: "rejeitado", label: "Rejeitadas" },
  { value: "arquivado", label: "Arquivadas" },
];

export const SOURCE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "Facebook", label: "Facebook" },
  { value: "Instagram", label: "Instagram" },
  { value: "X", label: "X / Twitter" },
  { value: "Reddit", label: "Reddit" },
  { value: "JusBrasil", label: "JusBrasil" },
  { value: "Outros", label: "Outros" },
];

export const CATEGORY_OPTIONS = [
  "Trabalhista",
  "Família",
  "Civil",
  "Previdenciário",
  "Tributário",
  "Consumidor",
  "Criminal",
  "Outros",
];

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

export function getUrgencyLabel(value) {
  if (value === "alta") return "Alta";
  if (value === "baixa") return "Baixa";
  return "Média";
}

export function getClickingLawyers(item) {
  return [
    ...new Set(
      (item.cliques || [])
        .map((click) => click.advogados?.name)
        .filter(Boolean),
    ),
  ];
}
