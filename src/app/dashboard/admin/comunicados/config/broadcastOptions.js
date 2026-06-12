export const BROADCAST_AUDIENCES = {
  ALL_USERS: "all-users",
  ALL_LAWYERS: "all-lawyers",
  ALL_CLIENTS: "all-clients",
  SINGLE_LAWYER: "single-lawyer",
  SINGLE_CLIENT: "single-client",
};

export const BROADCAST_AUDIENCE_OPTIONS = [
  {
    value: BROADCAST_AUDIENCES.ALL_USERS,
    label: "Todos os usuários",
    description: "Clientes, advogados e administradores.",
    collective: true,
  },
  {
    value: BROADCAST_AUDIENCES.ALL_LAWYERS,
    label: "Todos os advogados",
    description: "Todos os profissionais cadastrados.",
    collective: true,
  },
  {
    value: BROADCAST_AUDIENCES.ALL_CLIENTS,
    label: "Todos os clientes",
    description: "Todos os clientes cadastrados.",
    collective: true,
  },
  {
    value: BROADCAST_AUDIENCES.SINGLE_LAWYER,
    label: "Advogado específico",
    description: "Selecione um único advogado.",
    recipientType: "lawyers",
    collective: false,
  },
  {
    value: BROADCAST_AUDIENCES.SINGLE_CLIENT,
    label: "Cliente específico",
    description: "Selecione um único cliente.",
    recipientType: "clients",
    collective: false,
  },
];

export const BROADCAST_LIMITS = {
  title: 100,
  message: 5000,
};

export function getAudienceOption(audience) {
  return BROADCAST_AUDIENCE_OPTIONS.find(
    (option) => option.value === audience,
  ) || null;
}

export function getAudienceRecipientType(audience) {
  return getAudienceOption(audience)?.recipientType || null;
}

export function isCollectiveAudience(audience) {
  return Boolean(getAudienceOption(audience)?.collective);
}
