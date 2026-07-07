import { ORACULO_INSTITUTION_STATUSES } from "@/lib/oraculoInstitutionRules";

function asText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function asNullableText(value, max = 500) {
  const text = asText(value, max);
  return text || null;
}

function asBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function asInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : null;
}

function asDate(value) {
  const text = asText(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export function cleanObject(object = {}) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined),
  );
}

export function buildInstitutionPayload(body = {}) {
  const status = asText(body.status || "RASCUNHO").toUpperCase();
  const modalidadeParceria = asText(body.modalidade_parceria).toUpperCase();

  return cleanObject({
    nome: asText(body.nome, 180),
    status: ORACULO_INSTITUTION_STATUSES.includes(status) ? status : "RASCUNHO",
    nome_programa: asNullableText(body.nome_programa, 180),
    modalidade_parceria: modalidadeParceria || null,
    papel_social_juridico: asNullableText(body.papel_social_juridico, 80),
    modalidade_atividades: asNullableText(body.modalidade_atividades, 40),
    vinculado_npj: asBoolean(body.vinculado_npj),
    computa_horas_academicas: asBoolean(body.computa_horas_academicas),
    carga_horaria_max_semestre: asInteger(body.carga_horaria_max_semestre),
    periodo_minimo: asNullableText(body.periodo_minimo, 60),
    max_alunos_ativos: asInteger(body.max_alunos_ativos),
    parceria_inicio: asDate(body.parceria_inicio),
    parceria_fim: asDate(body.parceria_fim),
    renovacao_automatica: asBoolean(body.renovacao_automatica),
    razao_social: asNullableText(body.razao_social, 180),
    sigla: asNullableText(body.sigla, 30),
    cnpj: asNullableText(body.cnpj, 30),
    codigo_emec_ies: asNullableText(body.codigo_emec_ies, 60),
    organizacao_academica: asNullableText(body.organizacao_academica, 80),
    categoria_administrativa: asNullableText(body.categoria_administrativa, 80),
    mantenedora_razao_social: asNullableText(body.mantenedora_razao_social, 180),
    mantenedora_cnpj: asNullableText(body.mantenedora_cnpj, 30),
    site_oficial: asNullableText(body.site_oficial, 180),
    dominio_email: asNullableText(body.dominio_email, 120),
    email_institucional: asNullableText(body.email_institucional, 180),
    telefone_institucional: asNullableText(body.telefone_institucional, 40),
    endereco: cleanObject(body.endereco || {}),
    curso: cleanObject(body.curso || {}),
    estrutura_academica: cleanObject(body.estrutura_academica || {}),
    instrumentos: cleanObject(body.instrumentos || {}),
    lgpd: cleanObject(body.lgpd || {}),
    checklist_ativacao: cleanObject(body.checklist_ativacao || {}),
    observacoes_internas: asNullableText(body.observacoes_internas, 4000),
  });
}

export function buildInstitutionPerson(body = {}, papel) {
  return {
    papel,
    nome: asText(body.nome, 160),
    cpf: asNullableText(body.cpf, 20),
    cargo: asNullableText(body.cargo, 120),
    email: asNullableText(body.email, 180),
    telefone: asNullableText(body.telefone, 40),
    detalhes: cleanObject(body.detalhes || {}),
  };
}

export function buildFormalSupervisor(body = {}) {
  return {
    principal: true,
    nome: asText(body.nome, 160),
    cpf: asNullableText(body.cpf, 20),
    email: asNullableText(body.email, 180),
    telefone: asNullableText(body.telefone, 40),
    oab_numero: asNullableText(body.oab_numero, 30),
    oab_uf: asNullableText(body.oab_uf, 2),
    oab_inscricao_em: asDate(body.oab_inscricao_em),
    cargo: asNullableText(body.cargo, 120),
    vinculo: asNullableText(body.vinculo, 80),
    vinculo_descricao: asNullableText(body.vinculo_descricao, 500),
    vinculo_inicio: asDate(body.vinculo_inicio),
    vinculo_fim: asDate(body.vinculo_fim),
    max_estudantes: asInteger(body.max_estudantes),
    estudantes_atuais: asInteger(body.estudantes_atuais) || 0,
    poderes: cleanObject(body.poderes || {}),
  };
}
