export const COMMUNICATION_CHANNELS = {
  PUSH: "push",
  EMAIL: "email",
};

export const PUSH_TARGET_OPTIONS = [
  { value: "TODOS", label: "Todos os usuários do sistema" },
  { value: "TODOS_ADVOGADOS", label: "Apenas advogados" },
  { value: "TODOS_CLIENTES", label: "Apenas clientes" },
  { value: "ADVOGADO_ESPECIFICO", label: "Um advogado específico", recipientType: "lawyers" },
  { value: "CLIENTE_ESPECIFICO", label: "Um cliente específico", recipientType: "clients" },
];

export const EMAIL_TARGET_OPTIONS = [
  { value: "EMAIL_TODOS_ADVOGADOS", label: "Todos os advogados" },
  { value: "EMAIL_TODOS_CLIENTES", label: "Todos os clientes" },
  { value: "EMAIL_TODOS_ANUNCIANTES", label: "Todos os anunciantes" },
  { value: "EMAIL_ADVOGADO_ESPECIFICO", label: "Um advogado específico", recipientType: "lawyers" },
  { value: "EMAIL_CLIENTE_ESPECIFICO", label: "Um cliente específico", recipientType: "clients" },
  { value: "EMAIL_ANUNCIANTE_ESPECIFICO", label: "Um anunciante específico", recipientType: "advertisers" },
];

export const PUSH_LIMITS = {
  title: 60,
  message: 180,
};

export const EMAIL_LIMITS = {
  title: 100,
  message: 10000,
};

export function getTargetOption(channel, targetMode) {
  const options = channel === COMMUNICATION_CHANNELS.PUSH
    ? PUSH_TARGET_OPTIONS
    : EMAIL_TARGET_OPTIONS;

  return options.find((option) => option.value === targetMode) || null;
}

export function getRecipientType(channel, targetMode) {
  return getTargetOption(channel, targetMode)?.recipientType || null;
}
