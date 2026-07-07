// Máquina de status do cadastro do Oráculo Jurídico (ver oraculoJuridico.md).
// O status final é sempre recomputado a partir de dois sinais independentes:
// a decisão do admin (aprovar/rejeitar/suspender) e se pelo menos um
// supervisor ("padrinho") já aprovou o convite. RESTRITO é reservado para uso
// futuro — nenhuma ação do admin hoje produz esse status.

export const ORACULO_STATUS = {
  CADASTRO_INCOMPLETO: "CADASTRO_INCOMPLETO",
  PENDENTE_DOCUMENTOS: "PENDENTE_DOCUMENTOS",
  PENDENTE_SUPERVISOR: "PENDENTE_SUPERVISOR",
  PENDENTE_ADMIN: "PENDENTE_ADMIN",
  ATIVO: "ATIVO",
  RESTRITO: "RESTRITO",
  SUSPENSO: "SUSPENSO",
  REPROVADO: "REPROVADO",
};

export function computeOraculoStatus({ adminDecision, supervisorApproved }) {
  if (adminDecision === "REPROVADO") return ORACULO_STATUS.REPROVADO;
  if (adminDecision === "SUSPENSO") return ORACULO_STATUS.SUSPENSO;

  const adminApproved = adminDecision === "APROVADO";

  if (adminApproved && supervisorApproved) return ORACULO_STATUS.ATIVO;
  if (adminApproved && !supervisorApproved) {
    return ORACULO_STATUS.PENDENTE_SUPERVISOR;
  }
  if (!adminApproved && supervisorApproved) {
    return ORACULO_STATUS.PENDENTE_ADMIN;
  }

  return ORACULO_STATUS.PENDENTE_DOCUMENTOS;
}
