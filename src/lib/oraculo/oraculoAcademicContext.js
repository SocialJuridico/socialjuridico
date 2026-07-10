import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * Contexto acadêmico do estudante Oráculo.
 *
 * O backend é a fonte de verdade: nunca confiar em programa_id / turma_id /
 * oraculo_id enviados pelo frontend como mecanismo de autorização.
 *
 * O perfil global do Oráculo (oraculo_profissionais.status) e o vínculo
 * acadêmico (oraculo_estudante_vinculos_academicos.status_academico) são
 * camadas diferentes. Um estudante pode estar ATIVO como perfil mas ainda
 * PENDENTE_VINCULO em relação a um programa.
 */

const ACTIVE_LINK_STATUSES = ["ATIVO", "PENDENTE_VINCULO", "PAUSADO"];

function isLocalDevHost(host = "") {
  return (
    host === "localhost" ||
    host.startsWith("localhost:") ||
    host === "127.0.0.1" ||
    host.startsWith("127.0.0.1:") ||
    host === "::1" ||
    host === "[::1]" ||
    host.startsWith("[::1]:")
  );
}

export function canUseOraculoDevBypass(requestHeaders) {
  const enabled =
    process.env.NODE_ENV !== "production" &&
    process.env.ORACULO_DEV_BYPASS !== "false";
  if (!enabled) return false;
  return isLocalDevHost(requestHeaders?.get?.("host") || "");
}

async function loadStudentProfile(match) {
  const query = supabaseAdmin
    .from("oraculo_profissionais")
    .select(
      "id, name, email, status, tipo, instituicao_id, curso, periodo_atual, numero_matricula, auth_user_id, telemetria_ciente_em",
    );

  if (match.authUserId) query.eq("auth_user_id", match.authUserId);
  else if (match.oraculoId) query.eq("id", match.oraculoId);
  else return null;

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data;
}

async function loadActiveLink(oraculoProfissionalId) {
  const { data, error } = await supabaseAdmin
    .from("oraculo_estudante_vinculos_academicos")
    .select(
      "id, instituicao_id, programa_academico_id, turma_academica_id, matricula, periodo_atual, status_academico, supervisor_formal_id, professor_orientador_usuario_id, atividades_registradas, horas_reconhecidas_minutos, revisoes_pendentes, ultima_atividade_em, created_at",
    )
    .eq("oraculo_profissional_id", oraculoProfissionalId)
    .in("status_academico", ACTIVE_LINK_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data || null;
}

// Relações do padrinho indicado pelo aluno no cadastro.
const PADRINHO_RELACAO_LABELS = {
  PROFESSOR: "Professor",
  ADVOGADO_CONHECIDO: "Advogado conhecido",
  ADVOGADO_ESCRITORIO: "Advogado de escritório",
  COORDENADOR_ACADEMICO: "Coordenador acadêmico",
  MENTOR: "Mentor",
  OUTRO: "Outro",
};

async function loadRelated({
  oraculoId,
  instituicaoId,
  programaId,
  turmaId,
  supervisorFormalId,
  orientadorUsuarioId,
}) {
  const [institution, program, turma, supervisor, orientator, padrinhos] =
    await Promise.all([
    instituicaoId
      ? supabaseAdmin
          .from("oraculo_instituicoes")
          .select("id, nome, sigla, status")
          .eq("id", instituicaoId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    programaId
      ? supabaseAdmin
          .from("oraculo_programas_academicos")
          .select("id, nome, status, regras_carga_horaria")
          .eq("id", programaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    turmaId
      ? supabaseAdmin
          .from("oraculo_turmas_academicas")
          .select("id, nome, status")
          .eq("id", turmaId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supervisorFormalId
      ? supabaseAdmin
          .from("oraculo_supervisores_formais")
          .select("id, nome, oab_numero, oab_uf, cargo")
          .eq("id", supervisorFormalId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    orientadorUsuarioId
      ? supabaseAdmin
          .from("oraculo_instituicao_usuarios")
          .select("id, nome_completo, cargo")
          .eq("id", orientadorUsuarioId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Padrinho(s) indicado(s) pelo aluno no cadastro (pode ser externo).
    oraculoId
      ? supabaseAdmin
          .from("oraculo_supervisores")
          .select("id, nome, email, relacao, status, oab_numero, oab_uf")
          .eq("oraculo_id", oraculoId)
          .in("status", ["APROVADO", "CONVIDADO"])
      : Promise.resolve({ data: [] }),
  ]);

  return {
    institution: institution?.data || null,
    program: program?.data || null,
    turma: turma?.data || null,
    supervisor: supervisor?.data || null,
    orientator: orientator?.data || null,
    padrinhos: padrinhos?.data || [],
  };
}

function buildContext(profile, link, related) {
  return {
    oraculoId: profile.id,
    authUserId: profile.auth_user_id || null,
    studentName: profile.name || "Estudante",
    studentEmail: profile.email || null,
    telemetriaCienteEm: profile.telemetria_ciente_em || null,
    profileStatus: profile.status || null,
    curso: profile.curso || null,
    institutionId: related.institution?.id || link?.instituicao_id || profile.instituicao_id || null,
    institutionName: related.institution?.nome || null,
    institutionInitials: related.institution?.sigla || null,
    programId: related.program?.id || null,
    programName: related.program?.nome || null,
    programStatus: related.program?.status || null,
    programRules: related.program?.regras_carga_horaria || null,
    classId: related.turma?.id || null,
    className: related.turma?.nome || null,
    studentProgramLinkId: link?.id || null,
    studentStatus: link?.status_academico || "PENDENTE_VINCULO",
    periodoAtual: link?.periodo_atual || profile.periodo_atual || null,
    matricula: link?.matricula || profile.numero_matricula || null,
    horasReconhecidasMinutos: link?.horas_reconhecidas_minutos || 0,
    atividadesRegistradas: link?.atividades_registradas || 0,
    revisoesPendentes: link?.revisoes_pendentes || 0,
    ultimaAtividadeEm: link?.ultima_atividade_em || null,
    // Supervisor unificado: padrinho (indicado pelo aluno, externo possível) +
    // supervisor formal (institucional). O supervisor cuida de conduta/ética;
    // dúvidas/revisões acadêmicas vão ao orientador.
    supervisor: buildPrimarySupervisor(related),
    supervisors: buildSupervisorsList(related),
    orientator: related.orientator
      ? {
          id: related.orientator.id,
          name: related.orientator.nome_completo,
          cargo: related.orientator.cargo || null,
        }
      : null,
  };
}

function buildSupervisorsList(related) {
  const list = [];
  if (related.supervisor) {
    list.push({
      id: related.supervisor.id,
      name: related.supervisor.nome,
      oab: related.supervisor.oab_numero || null,
      oabUf: related.supervisor.oab_uf || null,
      cargo: related.supervisor.cargo || null,
      tipo: "FORMAL",
      origem: "Institucional",
      status: "ATIVO",
    });
  }
  for (const p of related.padrinhos || []) {
    list.push({
      id: p.id,
      name: p.nome,
      email: p.email || null,
      oab: p.oab_numero || null,
      oabUf: p.oab_uf || null,
      relacao: p.relacao || null,
      relacaoLabel: PADRINHO_RELACAO_LABELS[p.relacao] || p.relacao || "Padrinho",
      tipo: "PADRINHO",
      origem: "Indicado pelo aluno",
      status: p.status || null,
    });
  }
  return list;
}

function buildPrimarySupervisor(related) {
  const list = buildSupervisorsList(related);
  return list[0] || null;
}

/**
 * Resolve o contexto acadêmico completo de um estudante Oráculo.
 * Retorna null quando o auth user não tem perfil de Oráculo.
 */
export async function getOraculoAcademicContext({ authUserId, oraculoId } = {}) {
  if (!supabaseAdmin) return null;
  if (!authUserId && !oraculoId) return null;

  const profile = await loadStudentProfile({ authUserId, oraculoId });
  if (!profile) return null;

  const link = await loadActiveLink(profile.id);
  const related = await loadRelated({
    oraculoId: profile.id,
    instituicaoId: link?.instituicao_id || profile.instituicao_id,
    programaId: link?.programa_academico_id,
    turmaId: link?.turma_academica_id,
    supervisorFormalId: link?.supervisor_formal_id,
    orientadorUsuarioId: link?.professor_orientador_usuario_id,
  });

  return buildContext(profile, link, related);
}

/**
 * Contexto sintético para preview local (dev bypass em localhost).
 * Usa o estudante mais recente da base para permitir visualização sem sessão.
 */
export async function createDevOraculoStudentContext() {
  if (!supabaseAdmin) return null;

  const { data: profile } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id")
    .eq("tipo", "ESTUDANTE")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!profile?.id) return null;
  return getOraculoAcademicContext({ oraculoId: profile.id });
}

/**
 * Resolve o contexto do estudante para páginas do dashboard.
 * - Em localhost com dev bypass: usa contexto sintético.
 * - Caso contrário: exige sessão autenticada e perfil de Oráculo.
 * Retorna { context, preview }. context === null => sem acesso.
 */
export async function resolveOraculoStudentContext(requestHeaders) {
  if (canUseOraculoDevBypass(requestHeaders)) {
    const context = await createDevOraculoStudentContext();
    if (context) return { context, preview: true };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { context: null, preview: false };

  const context = await getOraculoAcademicContext({ authUserId: user.id });
  return { context, preview: false };
}
