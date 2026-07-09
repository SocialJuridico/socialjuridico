import Link from "next/link";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardCheck,
  Construction,
  Clock,
  FileText,
  FolderCheck,
  GraduationCap,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Star,
  UserCog,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabaseServer";
import { supabaseAdmin } from "@/lib/supabase";
import { getInstitutionAccessContext } from "@/lib/oraculoInstitutionAccess";
import { computeOraculoStatus } from "@/lib/oraculo/oraculoStatus";
import {
  oraculoAdminDecisionTemplate,
  oraculoSupervisorInviteTemplate,
} from "@/lib/oraculo/oraculoEmails";
import { resend } from "@/lib/resend";
import { resolvePublicAppOrigin } from "@/lib/publicAppOrigin";

import styles from "../InstitutionDashboard.module.css";

const LOCAL_DEV_HOSTS = ["localhost", "127.0.0.1", "::1", "[::1]"];
const RESEND_FROM = "Social Juridico <contato@socialjuridico.com.br>";

const SUPERVISOR_RELACAO_LABELS = {
  PROFESSOR: "Professor",
  ADVOGADO_CONHECIDO: "Advogado conhecido",
  ADVOGADO_ESCRITORIO: "Advogado do escritorio onde estagia",
  COORDENADOR_ACADEMICO: "Coordenador academico",
  MENTOR: "Mentor",
  OUTRO: "Outro",
};

const REPORT_TYPE_LABELS = {
  RELATORIO_INDIVIDUAL_ESTUDANTE: "Relatorio Individual do Estudante",
  RELATORIO_ATIVIDADES_ESTUDANTE: "Atividades do Estudante",
  RELATORIO_CARGA_HORARIA_ESTUDANTE: "Carga Horaria do Estudante",
  RELATORIO_AVALIACAO_ESTUDANTE: "Avaliacao do Estudante",
  RELATORIO_TURMA: "Relatorio da Turma",
  RELATORIO_PROGRAMA: "Relatorio do Programa",
  RELATORIO_ATIVIDADES: "Relatorio de Atividades",
  RELATORIO_CARGA_HORARIA: "Relatorio de Carga Horaria",
  RELATORIO_AVALIACOES: "Relatorio de Avaliacoes",
  RELATORIO_SUPERVISAO: "Relatorio de Supervisao",
  RELATORIO_ORIENTACAO: "Relatorio de Orientacao",
  RELATORIO_IMPACTO_ACADEMICO: "Impacto Academico",
  RELATORIO_IMPACTO_INSTITUCIONAL: "Impacto Institucional",
  RELATORIO_AUDITORIA: "Relatorio de Auditoria",
};

const ROLE_LABELS = {
  ORACULO_INSTITUICAO_ADMIN: "Administrador institucional",
  ORACULO_COORDENADOR_CURSO: "Coordenador do curso",
  ORACULO_COORDENADOR_NPJ: "Coordenador do NPJ",
  ORACULO_PROFESSOR_ORIENTADOR: "Professor orientador",
  ORACULO_SUPERVISOR_JURIDICO: "Supervisor juridico",
};

function textField(formData, key, fallback = null) {
  const value = String(formData.get(key) || "").trim();
  return value || fallback;
}

function numberField(formData, key, fallback = null) {
  const value = Number(formData.get(key) || 0);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function buildReadableCode(prefix) {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}

async function requireInstitutionActionContext(permission) {
  "use server";

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/oraculoacademico/login");

  const { data: memberships, error } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .select("instituicao_id")
    .eq("auth_user_id", user.id)
    .eq("status", "ATIVO")
    .limit(1);

  if (error || !memberships?.[0]?.instituicao_id) {
    redirect("/oraculoacademico/login");
  }

  const instituicaoId = memberships[0].instituicao_id;
  const access = await getInstitutionAccessContext({
    authUserId: user.id,
    instituicaoId,
  });

  if (!access?.permissions?.includes(permission)) {
    redirect("/dashboard/oraculoacademico/instituicao");
  }

  return { user, instituicaoId };
}

export async function createAcademicProgramAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_MANAGE_PROGRAMS",
  );

  const payload = {
    instituicao_id: instituicaoId,
    nome: textField(formData, "nome"),
    codigo_interno: textField(formData, "codigo_interno"),
    modalidade: textField(formData, "modalidade", "PRATICA_NPJ"),
    curso: textField(formData, "curso", "Direito"),
    campus: textField(formData, "campus"),
    periodo_academico: textField(formData, "periodo_academico"),
    data_inicio: textField(formData, "data_inicio"),
    data_fim: textField(formData, "data_fim"),
    status: textField(formData, "status", "RASCUNHO"),
    max_estudantes: Number(formData.get("max_estudantes") || 0) || null,
    max_estudantes_turma:
      Number(formData.get("max_estudantes_turma") || 0) || null,
    created_by_auth_user_id: user.id,
  };

  if (!payload.nome || !payload.periodo_academico) {
    redirect("/dashboard/oraculoacademico/instituicao/programas/novo?erro=campos");
  }

  const { error } = await supabaseAdmin
    .from("oraculo_programas_academicos")
    .insert([payload]);

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/programas/novo?erro=salvar");
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/programas");
  redirect("/dashboard/oraculoacademico/instituicao/programas?criado=1");
}

export async function createAcademicClassAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_MANAGE_PROGRAMS",
  );

  const payload = {
    instituicao_id: instituicaoId,
    programa_academico_id: textField(formData, "programa_academico_id"),
    nome: textField(formData, "nome"),
    codigo_interno: textField(formData, "codigo_interno"),
    campus: textField(formData, "campus"),
    turno: textField(formData, "turno"),
    periodo_predominante: textField(formData, "periodo_predominante"),
    data_inicio: textField(formData, "data_inicio"),
    data_fim: textField(formData, "data_fim"),
    status: textField(formData, "status", "RASCUNHO"),
    max_estudantes: Number(formData.get("max_estudantes") || 0) || null,
    created_by_auth_user_id: user.id,
  };

  if (!payload.programa_academico_id || !payload.nome) {
    redirect("/dashboard/oraculoacademico/instituicao/turmas/nova?erro=campos");
  }

  const { error } = await supabaseAdmin
    .from("oraculo_turmas_academicas")
    .insert([payload]);

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/turmas/nova?erro=salvar");
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/turmas");
  redirect("/dashboard/oraculoacademico/instituicao/turmas?criado=1");
}

export async function linkAcademicStudentAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_MANAGE_PROGRAMS",
  );

  const email = textField(formData, "email")?.toLowerCase();
  const name = textField(formData, "nome");
  const programaAcademicoId = textField(formData, "programa_academico_id");
  const turmaAcademicaId = textField(formData, "turma_academica_id");

  if (!email || !name || !programaAcademicoId) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes/vincular?erro=campos");
  }

  const { data: institutionRecord } = await supabaseAdmin
    .from("oraculo_instituicoes")
    .select("nome")
    .eq("id", instituicaoId)
    .maybeSingle();

  const institutionName = institutionRecord?.nome || textField(formData, "instituicao_ensino");

  const { data: existingProfessional } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let profissionalId = existingProfessional?.id;

  if (!profissionalId) {
    const { data: created, error: professionalError } = await supabaseAdmin
      .from("oraculo_profissionais")
      .insert([
        {
          name,
          email,
          tipo: "ESTUDANTE",
          status: "ATIVO",
          verificado: true,
          instituicao_id: instituicaoId,
          instituicao_ensino: institutionName,
          curso: textField(formData, "curso", "Direito"),
          periodo_atual: textField(formData, "periodo_atual"),
          numero_matricula: textField(formData, "matricula"),
          termos_aceitos_em: new Date().toISOString(),
          aprovado_em: new Date().toISOString(),
          aprovado_por: user.id,
        },
      ])
      .select("id")
      .single();

    if (professionalError) {
      redirect("/dashboard/oraculoacademico/instituicao/estudantes/vincular?erro=aluno");
    }

    profissionalId = created.id;
  }

  const { error } = await supabaseAdmin
    .from("oraculo_estudante_vinculos_academicos")
    .insert([
      {
        instituicao_id: instituicaoId,
        programa_academico_id: programaAcademicoId,
        turma_academica_id: turmaAcademicaId || null,
        oraculo_profissional_id: profissionalId,
        matricula: textField(formData, "matricula"),
        periodo_atual: textField(formData, "periodo_atual"),
        status_academico: textField(formData, "status_academico", "ATIVO"),
        vinculado_por_auth_user_id: user.id,
      },
    ]);

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes/vincular?erro=vinculo");
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/estudantes");
  redirect("/dashboard/oraculoacademico/instituicao/estudantes?criado=1");
}

export async function decideOraculoCandidateAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_MANAGE_PROGRAMS",
  );

  const id = textField(formData, "id");
  const decision = textField(formData, "decision")?.toUpperCase();
  const motivo = textField(formData, "motivo", "")?.slice(0, 1000) || "";

  if (!id || !["APROVADO", "REPROVADO"].includes(decision)) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=decisao");
  }

  if (decision === "REPROVADO" && !motivo) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=motivo");
  }

  const { data: candidate, error: candidateError } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id, name, email, status, instituicao_id")
    .eq("id", id)
    .eq("instituicao_id", instituicaoId)
    .maybeSingle();

  if (candidateError || !candidate) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=candidato");
  }

  if (candidate.status === "SUSPENSO") {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=suspenso");
  }

  const { data: supervisors } = await supabaseAdmin
    .from("oraculo_supervisores")
    .select("status")
    .eq("oraculo_id", id);

  const supervisorApproved = (supervisors || []).some(
    (item) => item.status === "APROVADO",
  );
  const nextStatus = computeOraculoStatus({
    adminDecision: decision,
    supervisorApproved,
  });
  const nowIso = new Date().toISOString();

  const updatePayload =
    decision === "APROVADO"
      ? {
          status: nextStatus,
          verificado: nextStatus === "ATIVO",
          aprovado_em: nowIso,
          aprovado_por: user.id,
          reprovado_em: null,
          motivo_reprovacao: null,
        }
      : {
          status: nextStatus,
          verificado: false,
          reprovado_em: nowIso,
          motivo_reprovacao: motivo,
        };

  const { error: updateError } = await supabaseAdmin
    .from("oraculo_profissionais")
    .update(updatePayload)
    .eq("id", id)
    .eq("instituicao_id", instituicaoId);

  if (updateError) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=salvar");
  }

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: candidate.email,
      subject: `Seu cadastro no Oraculo Juridico esta: ${nextStatus}`,
      html: oraculoAdminDecisionTemplate({
        name: candidate.name,
        status: nextStatus,
        motivo: decision === "REPROVADO" ? motivo : null,
      }),
    });
  } catch (emailError) {
    console.error(
      "[Oraculo/Instituicao] Falha ao notificar decisao institucional:",
      emailError,
    );
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/estudantes");
  redirect("/dashboard/oraculoacademico/instituicao/estudantes?decidido=1");
}

export async function resendSupervisorInviteAction(formData) {
  "use server";

  const { instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_MANAGE_PROGRAMS",
  );

  const supervisorId = textField(formData, "supervisor_id");
  if (!supervisorId) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=supervisor");
  }

  const { data: supervisor, error: supervisorError } = await supabaseAdmin
    .from("oraculo_supervisores")
    .select("id, oraculo_id, nome, email, relacao, status, token_convite")
    .eq("id", supervisorId)
    .maybeSingle();

  if (supervisorError || !supervisor || !supervisor.token_convite) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=supervisor");
  }

  // So supervisores ainda aguardando resposta podem ser relembrados.
  if (supervisor.status !== "CONVIDADO") {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=supervisor_respondido");
  }

  // Garante que o supervisor pertence a um candidato desta instituicao.
  const { data: candidate } = await supabaseAdmin
    .from("oraculo_profissionais")
    .select("id, name, instituicao_id")
    .eq("id", supervisor.oraculo_id)
    .maybeSingle();

  if (!candidate || candidate.instituicao_id !== instituicaoId) {
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=supervisor");
  }

  const requestHeaders = await headers();
  const siteUrl = resolvePublicAppOrigin({ headers: requestHeaders });
  const acceptUrl = new URL(
    `/oraculoacademico/supervisor/${supervisor.token_convite}`,
    siteUrl,
  ).toString();

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: [supervisor.email],
      subject: "Lembrete: convite para ser supervisor - Oraculo Academico",
      html: oraculoSupervisorInviteTemplate({
        supervisorName: supervisor.nome,
        oraculoName: candidate.name,
        relacaoLabel:
          SUPERVISOR_RELACAO_LABELS[supervisor.relacao] || supervisor.relacao,
        acceptUrl,
      }),
    });
  } catch (emailError) {
    console.error(
      "[Oraculo/Instituicao] Falha ao reenviar convite de supervisor:",
      emailError,
    );
    redirect("/dashboard/oraculoacademico/instituicao/estudantes?erro=email");
  }

  // Re-carimba a data do convite para refletir o reenvio.
  await supabaseAdmin
    .from("oraculo_supervisores")
    .update({ convidado_em: new Date().toISOString() })
    .eq("id", supervisor.id)
    .eq("status", "CONVIDADO");

  revalidatePath("/dashboard/oraculoacademico/instituicao/estudantes");
  redirect("/dashboard/oraculoacademico/instituicao/estudantes?reenviado=1");
}

export async function createFormalSupervisorAction(formData) {
  "use server";

  const { instituicaoId } = await requireInstitutionActionContext(
    "PROGRAM_MANAGE_SUPERVISORS",
  );

  const payload = {
    instituicao_id: instituicaoId,
    nome: textField(formData, "nome"),
    email: textField(formData, "email")?.toLowerCase(),
    telefone: textField(formData, "telefone"),
    oab_numero: textField(formData, "oab_numero"),
    oab_uf: textField(formData, "oab_uf"),
    cargo: textField(formData, "cargo"),
    vinculo: textField(formData, "vinculo", "OUTRO"),
    max_estudantes: Number(formData.get("max_estudantes") || 0) || null,
  };

  if (!payload.nome) {
    redirect("/dashboard/oraculoacademico/instituicao/supervisores/vincular?erro=campos");
  }

  const { error } = await supabaseAdmin
    .from("oraculo_supervisores_formais")
    .insert([payload]);

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/supervisores/vincular?erro=salvar");
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/supervisores");
  redirect("/dashboard/oraculoacademico/instituicao/supervisores?criado=1");
}

export async function createInstitutionOrientatorAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "PROGRAM_MANAGE_ORIENTATORS",
  );

  const email = textField(formData, "email")?.toLowerCase();
  const nomeCompleto = textField(formData, "nome_completo");

  if (!email || !nomeCompleto) {
    redirect("/dashboard/oraculoacademico/instituicao/orientadores/vincular?erro=campos");
  }

  const payload = {
    instituicao_id: instituicaoId,
    nome_completo: nomeCompleto,
    email,
    telefone: textField(formData, "telefone"),
    cargo: textField(formData, "cargo", "Professor orientador"),
    tipo_vinculo: textField(formData, "tipo_vinculo", "RESPONSAVEL_ACADEMICO"),
    status: "ATIVO",
    email_institucional: true,
    created_by_auth_user_id: user.id,
    activated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .select("id")
    .eq("instituicao_id", instituicaoId)
    .eq("email", email)
    .maybeSingle();

  let institutionUserId = existing?.id;

  if (institutionUserId) {
    const { error } = await supabaseAdmin
      .from("oraculo_instituicao_usuarios")
      .update(payload)
      .eq("id", institutionUserId);

    if (error) {
      redirect("/dashboard/oraculoacademico/instituicao/orientadores/vincular?erro=salvar");
    }
  } else {
    const { data, error } = await supabaseAdmin
      .from("oraculo_instituicao_usuarios")
      .insert([payload])
      .select("id")
      .single();

    if (error) {
      redirect("/dashboard/oraculoacademico/instituicao/orientadores/vincular?erro=salvar");
    }

    institutionUserId = data.id;
  }

  const { data: existingRole } = await supabaseAdmin
    .from("oraculo_instituicao_user_roles")
    .select("id")
    .eq("instituicao_usuario_id", institutionUserId)
    .eq("role", "ORACULO_PROFESSOR_ORIENTADOR")
    .is("revoked_at", null)
    .maybeSingle();

  if (!existingRole) {
    const { error } = await supabaseAdmin
      .from("oraculo_instituicao_user_roles")
      .insert([
        {
          instituicao_usuario_id: institutionUserId,
          role: "ORACULO_PROFESSOR_ORIENTADOR",
          granted_by_auth_user_id: user.id,
        },
      ]);

    if (error) {
      redirect("/dashboard/oraculoacademico/instituicao/orientadores/vincular?erro=role");
    }
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/orientadores");
  redirect("/dashboard/oraculoacademico/instituicao/orientadores?criado=1");
}

export async function createAcademicActivityAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_MANAGE_PROGRAMS",
  );

  const estudanteVinculoId = textField(formData, "estudante_vinculo_id");
  const programaAcademicoId = textField(formData, "programa_academico_id");
  const tipoAtividade = textField(formData, "tipo_atividade");
  const tempoRegistrado = numberField(formData, "tempo_registrado_minutos", 0);
  const tempoReconhecido = numberField(formData, "tempo_reconhecido_minutos", 0);
  const contaCarga = formData.get("conta_carga_horaria") !== "false";
  const exigeRevisao = formData.get("revisao_exigida") !== "false";
  const status = textField(formData, "status", exigeRevisao ? "ENVIADA_REVISAO" : "APROVADA");
  const reconhecimentoStatus = !contaCarga
    ? "NAO_APLICAVEL"
    : tempoReconhecido > 0
      ? exigeRevisao
        ? "RECONHECIDO_APOS_REVISAO"
        : "RECONHECIDO_AUTOMATICO"
      : "PENDENTE";

  if (!estudanteVinculoId || !programaAcademicoId || !tipoAtividade) {
    redirect("/dashboard/oraculoacademico/instituicao/atividades/registrar?erro=campos");
  }

  const { data: link, error: linkError } = await supabaseAdmin
    .from("oraculo_estudante_vinculos_academicos")
    .select(
      "id, turma_academica_id, oraculo_profissional_id, supervisor_formal_id, professor_orientador_usuario_id, atividades_registradas, horas_reconhecidas_minutos, revisoes_pendentes",
    )
    .eq("id", estudanteVinculoId)
    .eq("instituicao_id", instituicaoId)
    .maybeSingle();

  if (linkError || !link) {
    redirect("/dashboard/oraculoacademico/instituicao/atividades/registrar?erro=estudante");
  }

  const payload = {
    instituicao_id: instituicaoId,
    programa_academico_id: programaAcademicoId,
    turma_academica_id: textField(formData, "turma_academica_id") || link.turma_academica_id,
    estudante_vinculo_id: estudanteVinculoId,
    oraculo_profissional_id: link.oraculo_profissional_id,
    programa_atividade_id: textField(formData, "programa_atividade_id"),
    tipo_atividade: tipoAtividade,
    titulo: textField(formData, "titulo", tipoAtividade),
    codigo_caso: textField(formData, "codigo_caso"),
    area_juridica: textField(formData, "area_juridica"),
    conteudo_resumo: textField(formData, "conteudo_resumo"),
    status,
    revisao_exigida: exigeRevisao,
    conta_carga_horaria: contaCarga,
    tempo_registrado_minutos: tempoRegistrado,
    tempo_reconhecido_minutos: contaCarga ? tempoReconhecido : 0,
    reconhecimento_status: reconhecimentoStatus,
    regra_reconhecimento: textField(formData, "regra_reconhecimento"),
    tempo_limitado_por_regra: contaCarga && tempoReconhecido > 0 && tempoReconhecido < tempoRegistrado,
    supervisor_formal_id: link.supervisor_formal_id,
    orientador_usuario_id: link.professor_orientador_usuario_id,
    completed_at: status === "EM_ANDAMENTO" ? null : new Date().toISOString(),
    submitted_review_at: exigeRevisao ? new Date().toISOString() : null,
    created_by_auth_user_id: user.id,
  };

  const { data: activity, error } = await supabaseAdmin
    .from("oraculo_atividades_academicas")
    .insert([payload])
    .select("id")
    .single();

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/atividades/registrar?erro=salvar");
  }

  const workloadPayload = {
    instituicao_id: instituicaoId,
    atividade_academica_id: activity.id,
    programa_academico_id: programaAcademicoId,
    turma_academica_id: payload.turma_academica_id,
    estudante_vinculo_id: estudanteVinculoId,
    oraculo_profissional_id: link.oraculo_profissional_id,
    tipo_atividade: tipoAtividade,
    codigo_caso: payload.codigo_caso,
    status: reconhecimentoStatus,
    minutos_registrados: tempoRegistrado,
    minutos_reconhecidos: contaCarga ? tempoReconhecido : 0,
    regra_aplicada: payload.regra_reconhecimento,
    limitado_por_regra: payload.tempo_limitado_por_regra,
    validado_por_auth_user_id: tempoReconhecido > 0 ? user.id : null,
    validado_em: tempoReconhecido > 0 ? new Date().toISOString() : null,
    created_by_auth_user_id: user.id,
  };

  await supabaseAdmin.from("oraculo_carga_horaria_lancamentos").insert([workloadPayload]);

  await supabaseAdmin
    .from("oraculo_estudante_vinculos_academicos")
    .update({
      atividades_registradas: (link.atividades_registradas || 0) + 1,
      horas_reconhecidas_minutos:
        (link.horas_reconhecidas_minutos || 0) + (contaCarga ? tempoReconhecido : 0),
      ultima_atividade_em: new Date().toISOString(),
      revisoes_pendentes:
        (link.revisoes_pendentes || 0) + (exigeRevisao && status !== "APROVADA" ? 1 : 0),
    })
    .eq("id", estudanteVinculoId);

  revalidatePath("/dashboard/oraculoacademico/instituicao/atividades");
  revalidatePath("/dashboard/oraculoacademico/instituicao/carga-horaria");
  redirect("/dashboard/oraculoacademico/instituicao/atividades?criado=1");
}

export async function createAcademicEvaluationAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "PROGRAM_MANAGE_ORIENTATORS",
  );

  const estudanteVinculoId = textField(formData, "estudante_vinculo_id");
  const programaAcademicoId = textField(formData, "programa_academico_id");

  if (!estudanteVinculoId || !programaAcademicoId) {
    redirect("/dashboard/oraculoacademico/instituicao/avaliacoes/registrar?erro=campos");
  }

  const { data: link, error: linkError } = await supabaseAdmin
    .from("oraculo_estudante_vinculos_academicos")
    .select("id, turma_academica_id, oraculo_profissional_id, atividades_registradas, horas_reconhecidas_minutos")
    .eq("id", estudanteVinculoId)
    .eq("instituicao_id", instituicaoId)
    .maybeSingle();

  if (linkError || !link) {
    redirect("/dashboard/oraculoacademico/instituicao/avaliacoes/registrar?erro=estudante");
  }

  const { data: institutionalUser } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .select("id, nome_completo")
    .eq("instituicao_id", instituicaoId)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const payload = {
    instituicao_id: instituicaoId,
    programa_academico_id: programaAcademicoId,
    turma_academica_id: textField(formData, "turma_academica_id") || link.turma_academica_id,
    estudante_vinculo_id: estudanteVinculoId,
    oraculo_profissional_id: link.oraculo_profissional_id,
    avaliador_usuario_id: institutionalUser?.id || null,
    avaliador_nome_snapshot: institutionalUser?.nome_completo || user.email,
    periodo_referencia: textField(formData, "periodo_referencia"),
    tipo_avaliacao: textField(formData, "tipo_avaliacao", "FORMATIVA"),
    status: textField(formData, "status", "ENVIADA"),
    competencia_pesquisa: numberField(formData, "competencia_pesquisa"),
    competencia_raciocinio: numberField(formData, "competencia_raciocinio"),
    competencia_comunicacao: numberField(formData, "competencia_comunicacao"),
    competencia_etica: numberField(formData, "competencia_etica"),
    competencia_responsabilidade: numberField(formData, "competencia_responsabilidade"),
    conceito_final: textField(formData, "conceito_final"),
    parecer: textField(formData, "parecer"),
    plano_desenvolvimento: textField(formData, "plano_desenvolvimento"),
    atividades_consideradas: link.atividades_registradas || 0,
    horas_reconhecidas_minutos: link.horas_reconhecidas_minutos || 0,
    submitted_at: new Date().toISOString(),
    created_by_auth_user_id: user.id,
  };

  if (!payload.periodo_referencia) {
    redirect("/dashboard/oraculoacademico/instituicao/avaliacoes/registrar?erro=periodo");
  }

  const { error } = await supabaseAdmin
    .from("oraculo_avaliacoes_academicas")
    .insert([payload]);

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/avaliacoes/registrar?erro=salvar");
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/avaliacoes");
  redirect("/dashboard/oraculoacademico/instituicao/avaliacoes?criado=1");
}

export async function createInstitutionReportAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_VIEW_REPORTS",
  );

  const tipo = textField(formData, "tipo", "RELATORIO_PROGRAMA");
  const escopo = textField(formData, "escopo", "INSTITUICAO");
  const periodoInicio = textField(formData, "periodo_inicio");
  const periodoFim = textField(formData, "periodo_fim");
  const titulo = textField(formData, "titulo", REPORT_TYPE_LABELS[tipo] || "Relatorio institucional");
  const downloadFormat = textField(formData, "download_format", "pdf");

  const payload = {
    instituicao_id: instituicaoId,
    programa_academico_id: textField(formData, "programa_academico_id"),
    turma_academica_id: textField(formData, "turma_academica_id"),
    estudante_vinculo_id: textField(formData, "estudante_vinculo_id"),
    codigo_interno: buildReadableCode("RLT"),
    titulo,
    tipo,
    escopo,
    periodo_inicio: periodoInicio,
    periodo_fim: periodoFim,
    parametros: {
      tipo,
      escopo,
      programa_academico_id: textField(formData, "programa_academico_id"),
      turma_academica_id: textField(formData, "turma_academica_id"),
      estudante_vinculo_id: textField(formData, "estudante_vinculo_id"),
      periodo_inicio: periodoInicio,
      periodo_fim: periodoFim,
      template_version: numberField(formData, "template_version", 1),
      download_format: downloadFormat,
    },
    fonte_dados: {
      atividades: "oraculo_atividades_academicas",
      carga_horaria: "oraculo_carga_horaria_lancamentos",
      avaliacoes: "oraculo_avaliacoes_academicas",
    },
    template_version: numberField(formData, "template_version", 1),
    status: textField(formData, "status", "GERADO"),
    assinatura_status: textField(formData, "assinatura_status", "NAO_EXIGE"),
    assinaturas_requeridas: numberField(formData, "assinaturas_requeridas", 0) || 0,
    assinaturas_concluidas: 0,
    generated_by_auth_user_id: user.id,
    generated_by_name_snapshot: user.email,
    arquivo_url: "/api/oraculoacademico/instituicao/relatorios/pendente/download",
    metadata: {
      formato_preferido: downloadFormat,
    },
  };

  if (!payload.titulo || !payload.periodo_inicio || !payload.periodo_fim) {
    redirect("/dashboard/oraculoacademico/instituicao/relatorios/novo?erro=campos");
  }

  const { data, error } = await supabaseAdmin
    .from("oraculo_relatorios_institucionais")
    .insert([payload])
    .select("id, codigo_interno")
    .single();

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/relatorios/novo?erro=salvar");
  }

  await supabaseAdmin.from("oraculo_auditoria_institucional").insert([
    {
      instituicao_id: instituicaoId,
      auth_user_id: user.id,
      usuario_email_snapshot: user.email,
      role_snapshot: "ORACULO_INSTITUICAO_ADMIN",
      permission_snapshot: "INSTITUTION_VIEW_REPORTS",
      evento_tipo: "INSTITUTION_REPORT_GENERATED",
      evento_label: "Gerou relatorio institucional",
      acao: "GERAR_RELATORIO",
      recurso_tipo: "RELATORIO",
      recurso_id: data.id,
      recurso_label: data.codigo_interno,
      resultado: "SUCESSO",
      metadata: { tipo, escopo },
    },
  ]);

  revalidatePath("/dashboard/oraculoacademico/instituicao/relatorios");
  redirect(`/api/oraculoacademico/instituicao/relatorios/${data.id}/download?format=${downloadFormat}`);
}

export async function createInstitutionUserAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_INVITE_USERS",
  );

  const email = textField(formData, "email")?.toLowerCase();
  const nomeCompleto = textField(formData, "nome_completo");
  const role = textField(formData, "role", "ORACULO_PROFESSOR_ORIENTADOR");

  if (!email || !nomeCompleto || !ROLE_LABELS[role]) {
    redirect("/dashboard/oraculoacademico/instituicao/usuarios/novo?erro=campos");
  }

  const payload = {
    instituicao_id: instituicaoId,
    nome_completo: nomeCompleto,
    email,
    telefone: textField(formData, "telefone"),
    cargo: textField(formData, "cargo"),
    tipo_vinculo: textField(formData, "tipo_vinculo", "OUTRO"),
    status: textField(formData, "status", "CONVIDADO"),
    created_by_auth_user_id: user.id,
  };

  const { data: institutionUser, error } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .insert([payload])
    .select("id")
    .single();

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/usuarios/novo?erro=salvar");
  }

  const { error: roleError } = await supabaseAdmin
    .from("oraculo_instituicao_user_roles")
    .insert([
      {
        instituicao_usuario_id: institutionUser.id,
        role,
        programa_academico_id: textField(formData, "programa_academico_id"),
        granted_by_auth_user_id: user.id,
      },
    ]);

  if (roleError) {
    redirect("/dashboard/oraculoacademico/instituicao/usuarios/novo?erro=role");
  }

  await supabaseAdmin.from("oraculo_auditoria_institucional").insert([
    {
      instituicao_id: instituicaoId,
      auth_user_id: user.id,
      usuario_email_snapshot: user.email,
      role_snapshot: "ORACULO_INSTITUICAO_ADMIN",
      permission_snapshot: "INSTITUTION_INVITE_USERS",
      evento_tipo: "INSTITUTION_USER_INVITED",
      evento_label: "Convidou usuario institucional",
      acao: "CONVIDAR_USUARIO",
      recurso_tipo: "USUARIO_INSTITUCIONAL",
      recurso_id: institutionUser.id,
      recurso_label: email,
      resultado: "SUCESSO",
      metadata: { role },
    },
  ]);

  revalidatePath("/dashboard/oraculoacademico/instituicao/usuarios");
  redirect("/dashboard/oraculoacademico/instituicao/usuarios?criado=1");
}

export async function requestInstitutionDataChangeAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_MANAGE_PROGRAMS",
  );

  const payload = {
    instituicao_id: instituicaoId,
    campo: textField(formData, "campo"),
    valor_atual: textField(formData, "valor_atual"),
    valor_solicitado: textField(formData, "valor_solicitado"),
    motivo: textField(formData, "motivo"),
    requested_by_auth_user_id: user.id,
    requested_by_name_snapshot: user.email,
  };

  if (!payload.campo || !payload.valor_solicitado || !payload.motivo) {
    redirect("/dashboard/oraculoacademico/instituicao/dados/solicitar-alteracao?erro=campos");
  }

  const { error } = await supabaseAdmin
    .from("oraculo_instituicao_alteracao_solicitacoes")
    .insert([payload]);

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/dados/solicitar-alteracao?erro=salvar");
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/dados");
  redirect("/dashboard/oraculoacademico/instituicao/dados?solicitado=1");
}

export async function createInstitutionDocumentAction(formData) {
  "use server";

  const { user, instituicaoId } = await requireInstitutionActionContext(
    "INSTITUTION_MANAGE_PROGRAMS",
  );

  const payload = {
    instituicao_id: instituicaoId,
    programa_academico_id: textField(formData, "programa_academico_id"),
    codigo_interno: textField(formData, "codigo_interno", buildReadableCode("DOC")),
    titulo: textField(formData, "titulo"),
    categoria: textField(formData, "categoria", "OUTRO"),
    contexto_tipo: textField(formData, "contexto_tipo", "INSTITUICAO"),
    contexto_label: textField(formData, "contexto_label", "Instituicao"),
    versao: numberField(formData, "versao", 1),
    status: textField(formData, "status", "PENDENTE_VALIDACAO"),
    arquivo_url: textField(formData, "arquivo_url"),
    validade_inicio: textField(formData, "validade_inicio"),
    validade_fim: textField(formData, "validade_fim"),
    motivo_nova_versao: textField(formData, "motivo_nova_versao"),
    responsavel_nome_snapshot: user.email,
    uploaded_by_auth_user_id: user.id,
  };

  if (!payload.titulo) {
    redirect("/dashboard/oraculoacademico/instituicao/documentos/novo?erro=campos");
  }

  const { error } = await supabaseAdmin
    .from("oraculo_documentos_institucionais")
    .insert([payload]);

  if (error) {
    redirect("/dashboard/oraculoacademico/instituicao/documentos/novo?erro=salvar");
  }

  revalidatePath("/dashboard/oraculoacademico/instituicao/documentos");
  redirect("/dashboard/oraculoacademico/instituicao/documentos?criado=1");
}

const PAGE_CONFIG = {
  programas: {
    title: "Programas academicos",
    subtitle:
      "Gerencie os programas de pratica juridica vinculados a sua instituicao.",
    primaryAction: "Novo programa",
    primaryHref: "/dashboard/oraculoacademico/instituicao/programas/novo",
    icon: BookOpen,
    filters: ["Buscar programa...", "Status", "Modalidade", "Curso", "Campus", "Periodo academico"],
    cards: [
      ["Programas ativos", "1", "Programas em andamento"],
      ["Estudantes vinculados", "84", "Em programas ativos"],
      ["Turmas ativas", "3", "Distribuidas nos programas"],
      ["Programas com pendencia", "1", "Requerem atencao"],
    ],
    columns: ["Programa", "Modalidade", "Curso / Campus", "Periodo", "Estudantes", "Turmas", "Orientacao / Supervisao", "Status", "Acoes"],
    empty: "Nenhum programa academico criado",
  },
  turmas: {
    title: "Turmas",
    subtitle:
      "Organize estudantes por programa, periodo, campus e orientacao academica.",
    primaryAction: "Nova turma",
    primaryHref: "/dashboard/oraculoacademico/instituicao/turmas/nova",
    icon: ClipboardCheck,
    filters: ["Buscar turma...", "Programa", "Campus", "Turno", "Status", "Orientador", "Supervisor"],
    cards: [
      ["Turmas ativas", "1", "Em andamento"],
      ["Estudantes em turmas", "70", "Vinculos atuais"],
      ["Turmas sem orientador", "1", "Requerem definicao"],
      ["Turmas com atencao", "2", "Pendencias academicas"],
    ],
    columns: ["Turma", "Programa", "Campus / Turno", "Estudantes", "Orientador", "Supervisor", "Atividade", "Status", "Acoes"],
    empty: "Nenhuma turma criada",
  },
  estudantes: {
    title: "Estudantes",
    subtitle:
      "Acompanhe vinculo academico, atividade pratica, carga horaria e evolucao dos estudantes.",
    primaryAction: "Vincular estudantes",
    primaryHref: "/dashboard/oraculoacademico/instituicao/estudantes/vincular",
    icon: GraduationCap,
    filters: ["Buscar estudante...", "Programa", "Turma", "Periodo", "Status academico", "Supervisor", "Atividade recente", "Carga horaria"],
    cards: [
      ["Estudantes ativos", "1", "Com vinculo academico ativo"],
      ["Sem atividade recente", "1", "Mais de 7 dias"],
      ["Abaixo da meta de horas", "1", "Acompanhar carga horaria"],
      ["Com revisao pendente", "1", "Aguardando responsavel"],
    ],
    columns: ["Estudante", "Programa / Turma", "Periodo", "Status academico", "Atividades", "Horas", "Ultima atividade", "Responsaveis", "Acoes"],
    empty: "Nenhum estudante vinculado",
  },
  supervisores: {
    title: "Supervisores juridicos",
    subtitle:
      "Acompanhe os advogados responsaveis pela supervisao tecnica dos estudantes.",
    primaryAction: "Vincular supervisor",
    primaryHref: "/dashboard/oraculoacademico/instituicao/supervisores/vincular",
    icon: ShieldCheck,
    filters: ["Buscar supervisor...", "Programa", "Status", "OAB", "Capacidade", "Revisoes pendentes"],
    columns: ["Supervisor", "OAB", "Vinculo", "Estudantes", "Capacidade", "Revisoes", "Status", "Acoes"],
    empty: "Nenhum supervisor juridico formal vinculado",
  },
  orientadores: {
    title: "Professores orientadores",
    subtitle:
      "Acompanhe responsaveis pelo acompanhamento academico, avaliacao e orientacao pedagogica.",
    primaryAction: "Vincular orientador",
    primaryHref: "/dashboard/oraculoacademico/instituicao/orientadores/vincular",
    icon: Users,
    filters: ["Buscar orientador...", "Programa", "Curso", "Status", "Estudantes", "Avaliacoes pendentes"],
    columns: ["Orientador", "Cargo / vinculo", "Programas", "Estudantes", "Avaliacoes", "Ultima atividade", "Status", "Acoes"],
    empty: "Nenhum professor orientador vinculado",
  },
  revisoes: {
    title: "Revisoes pendentes",
    subtitle:
      "Acompanhe atividades que aguardam revisao tecnica, ajuste, aprovacao ou encaminhamento.",
    primaryAction: "Ver fila completa",
    primaryHref: "/dashboard/oraculoacademico/instituicao/revisoes",
    icon: ClipboardCheck,
    filters: ["Buscar revisao...", "Programa", "Turma", "Responsavel", "Prioridade", "Status", "Prazo"],
    columns: ["Revisao", "Estudante", "Programa / Turma", "Responsavel snapshot", "Prioridade", "Prazo", "Status", "Acoes"],
    empty: "Nenhuma revisao pendente",
  },
  atividades: {
    title: "Atividades Academicas",
    subtitle:
      "Acompanhe as atividades praticas registradas pelos estudantes nos programas da instituicao.",
    primaryAction: "Registrar atividade auditada",
    primaryHref: "/dashboard/oraculoacademico/instituicao/atividades/registrar",
    icon: Activity,
    filters: ["Buscar atividade...", "Programa", "Turma", "Estudante", "Tipo de atividade", "Area juridica", "Status", "Revisao", "Carga horaria", "Periodo"],
    columns: ["Estudante", "Atividade", "Caso / Area", "Programa / Turma", "Data", "Tempo", "Revisao", "Status", "Acoes"],
    empty: "Nenhuma atividade registrada",
  },
  "carga-horaria": {
    title: "Carga Horaria",
    subtitle:
      "Acompanhe o tempo registrado, validado e reconhecido nas atividades academicas.",
    primaryAction: "Ver pendencias",
    primaryHref: "/dashboard/oraculoacademico/instituicao/atividades?status=PENDENTE",
    icon: Clock,
    filters: ["Programa", "Turma", "Estudante", "Status de carga", "Tipo de atividade", "Reconhecimento", "Periodo"],
    columns: ["Estudante", "Programa / Turma", "Meta", "Registradas", "Reconhecidas", "Pendentes", "Progresso", "Status", "Acoes"],
    empty: "Nenhum lancamento de carga horaria registrado",
  },
  avaliacoes: {
    title: "Avaliacoes",
    subtitle:
      "Registre e acompanhe avaliacoes por competencia sem rankings ou gamificacao.",
    primaryAction: "Registrar avaliacao",
    primaryHref: "/dashboard/oraculoacademico/instituicao/avaliacoes/registrar",
    icon: Star,
    filters: ["Buscar avaliacao...", "Programa", "Turma", "Estudante", "Tipo", "Status", "Periodo"],
    columns: ["Estudante", "Programa / Turma", "Periodo", "Competencias", "Conceito", "Avaliador", "Status", "Acoes"],
    empty: "Nenhuma avaliacao academica registrada",
  },
  relatorios: {
    title: "Relatorios",
    subtitle:
      "Gere e acompanhe documentos academicos, operacionais e institucionais do Oraculo Academico.",
    primaryAction: "Gerar relatorio",
    primaryHref: "/dashboard/oraculoacademico/instituicao/relatorios/novo",
    icon: FileText,
    filters: ["Buscar relatorio...", "Tipo", "Programa", "Turma", "Estudante", "Periodo", "Status", "Assinatura", "Gerado por"],
    columns: ["Relatorio", "Tipo", "Escopo", "Periodo", "Gerado em", "Gerado por", "Assinatura", "Status", "Acoes"],
    empty: "Nenhum relatorio gerado",
  },
  impacto: {
    title: "Impacto Academico",
    subtitle:
      "Acompanhe indicadores verificaveis de participacao, atividade academica e evidencias institucionais.",
    primaryAction: "Gerar relatorio de impacto",
    primaryHref: "/dashboard/oraculoacademico/instituicao/relatorios/novo?tipo=impacto",
    icon: BarChart3,
    filters: ["Programa", "Turma", "Periodo", "Area juridica", "Tipo de atividade"],
    columns: ["Indicador", "Valor", "Fonte", "Escopo", "Atualizado em", "Metodo", "Status"],
    empty: "Nenhum indicador de impacto disponivel",
  },
  auditoria: {
    title: "Auditoria",
    subtitle:
      "Consulte eventos institucionais auditaveis sem expor dados tecnicos sensiveis.",
    primaryAction: "Exportar auditoria",
    primaryHref: "/dashboard/oraculoacademico/instituicao/relatorios/novo?tipo=auditoria",
    icon: LockKeyhole,
    filters: ["Buscar evento...", "Usuario", "Role", "Evento", "Recurso", "Resultado", "Periodo", "Risco"],
    columns: ["Data / Hora", "Usuario", "Role", "Evento", "Recurso", "Contexto", "Resultado", "Acoes"],
    empty: "Nenhum evento de auditoria institucional registrado",
  },
  usuarios: {
    title: "Usuarios e Acessos",
    subtitle:
      "Gerencie usuarios institucionais, roles contextuais, MFA e historico de acesso individual.",
    primaryAction: "Convidar usuario",
    primaryHref: "/dashboard/oraculoacademico/instituicao/usuarios/novo",
    icon: UserCog,
    filters: ["Buscar usuario...", "Role", "Programa", "Status", "MFA", "Ultimo acesso"],
    columns: ["Usuario", "Cargo", "Roles", "Escopo", "Status", "MFA", "Ultimo acesso", "Acoes"],
    empty: "Nenhum usuario institucional encontrado",
  },
  dados: {
    title: "Dados da Instituicao",
    subtitle:
      "Consulte informacoes institucionais e solicite alteracoes em dados validados pelo Social Juridico.",
    primaryAction: "Solicitar alteracao",
    primaryHref: "/dashboard/oraculoacademico/instituicao/dados/solicitar-alteracao",
    icon: Building2,
    filters: ["Secao", "Status de validacao", "Pendencias documentais"],
    columns: ["Secao", "Campo", "Valor", "Validacao", "Origem", "Acoes"],
    empty: "Nenhum dado institucional localizado",
  },
  documentos: {
    title: "Documentos e Compliance",
    subtitle:
      "Acompanhe documentos institucionais, versoes, validade e validacoes de compliance.",
    primaryAction: "Registrar documento",
    primaryHref: "/dashboard/oraculoacademico/instituicao/documentos/novo",
    icon: FolderCheck,
    filters: ["Buscar documento...", "Categoria", "Contexto", "Status", "Validade", "Responsavel"],
    columns: ["Documento", "Categoria", "Contexto", "Versao", "Enviado em", "Validade", "Status", "Responsavel", "Acoes"],
    empty: "Nenhum documento disponivel",
  },
};

function isLocalDevHost(host = "") {
  return LOCAL_DEV_HOSTS.some(
    (candidate) => host === candidate || host.startsWith(`${candidate}:`),
  );
}

async function canAccessRoute() {
  const requestHeaders = await headers();
  const isDevPreview =
    process.env.NODE_ENV !== "production" &&
    process.env.ORACULO_DEV_BYPASS !== "false" &&
    isLocalDevHost(requestHeaders.get("host") || "");

  if (isDevPreview) return { allowed: true, preview: true };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { allowed: Boolean(user), preview: false };
}

function statusTone(status = "") {
  if (["ATIVO", "ATIVA", "APROVADA", "RECONHECIDO_AUTOMATICO", "RECONHECIDO_APOS_REVISAO", "META_ATINGIDA", "GERADO", "ASSINADO", "VALIDO", "SUCESSO"].includes(status)) return "success";
  if (["PROGRAMADO", "PROGRAMADA", "RASCUNHO", "PENDENTE", "PENDENTE_DOCUMENTOS", "PENDENTE_SUPERVISOR", "PENDENTE_ADMIN", "EM_REVISAO", "ENVIADA_REVISAO", "EM_ANDAMENTO", "CONVIDADO", "PENDENTE_ASSINATURA", "PENDENTE_VALIDACAO", "VENCENDO", "PARCIAL"].includes(status)) return "warning";
  if (["PAUSADO", "PAUSADA", "PENDENTE_VINCULO", "AJUSTE_SOLICITADO", "CRITICA", "LIMITADO_POR_REGRA", "ABAIXO_DA_META", "REJEITADO", "VENCIDO", "NEGADO", "ERRO", "RECUSADO", "REPROVADO", "SUSPENSO"].includes(status)) return "attention";
  return "neutral";
}

function titleFromSlug(value = "Area institucional") {
  return value.replaceAll("-", " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDateRange(start, end) {
  if (!start && !end) return "Datas nao definidas";
  return [start, end].filter(Boolean).join(" - ");
}

function minutesToHours(minutes = 0) {
  const safeMinutes = minutes || 0;
  const hours = Math.floor(safeMinutes / 60);
  const remaining = safeMinutes % 60;
  if (!hours) return `${remaining}min`;
  return remaining ? `${hours}h ${remaining}min` : `${hours}h`;
}

function formatDateTime(value) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

async function safeSelect(table, queryBuilder) {
  if (!supabaseAdmin) return [];
  const { data, error } = await queryBuilder(supabaseAdmin.from(table));
  if (error) return [];
  return data || [];
}

async function getFirstInstitutionId() {
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin
    .from("oraculo_instituicoes")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.id || null;
}

async function getCurrentInstitutionId() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return getFirstInstitutionId();

  const { data, error } = await supabaseAdmin
    .from("oraculo_instituicao_usuarios")
    .select("instituicao_id")
    .eq("auth_user_id", user.id)
    .eq("status", "ATIVO")
    .limit(1)
    .maybeSingle();

  if (error || !data?.instituicao_id) return getFirstInstitutionId();
  return data.instituicao_id;
}

async function loadAcademicRows(section) {
  const instituicaoId = await getCurrentInstitutionId();
  if (!instituicaoId) return [];

  if (section === "programas") {
    const [programs, links, classes] = await Promise.all([
      safeSelect("oraculo_programas_academicos", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
      safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
        query.select("programa_academico_id, status_academico").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_turmas_academicas", (query) =>
        query.select("programa_academico_id").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return programs.map((program) => {
      const programLinks = links.filter((link) => link.programa_academico_id === program.id);
      return {
        id: program.id,
        nome: program.nome,
        codigo: program.codigo_interno || "Sem codigo",
        modalidade: program.modalidade,
        curso: program.curso,
        campus: program.campus || "Sede unica",
        periodo: program.periodo_academico,
        datas: formatDateRange(program.data_inicio, program.data_fim),
        estudantesAtivos: programLinks.filter((link) => link.status_academico === "ATIVO").length,
        estudantesVinculados: programLinks.length,
        turmas: classes.filter((item) => item.programa_academico_id === program.id).length,
        orientador: program.professor_orientador_usuario_id ? "Orientador definido" : "Professor nao definido",
        supervisor: program.supervisor_formal_id ? "Supervisor definido" : "Supervisor nao definido",
        status: program.status,
      };
    });
  }

  if (section === "turmas") {
    const [classes, programs, links] = await Promise.all([
      safeSelect("oraculo_turmas_academicas", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
      safeSelect("oraculo_programas_academicos", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
        query.select("turma_academica_id, status_academico, atividades_registradas, ultima_atividade_em").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return classes.map((classItem) => {
      const classLinks = links.filter((link) => link.turma_academica_id === classItem.id);
      const program = programs.find((item) => item.id === classItem.programa_academico_id);
      const lastActivity = classLinks
        .map((link) => link.ultima_atividade_em)
        .filter(Boolean)
        .sort()
        .at(-1);

      return {
        id: classItem.id,
        nome: classItem.nome,
        codigo: classItem.codigo_interno || "Sem codigo",
        programa: program?.nome || "Programa nao localizado",
        campus: classItem.campus || "Sede unica",
        turno: classItem.turno || "Turno nao definido",
        estudantes: classLinks.length,
        ativos: classLinks.filter((link) => link.status_academico === "ATIVO").length,
        pausados: classLinks.filter((link) => link.status_academico === "PAUSADO").length,
        orientador: classItem.professor_orientador_usuario_id ? "Orientador definido" : "Nao definido",
        supervisor: classItem.supervisor_formal_id ? "Supervisor definido" : "Nao definido",
        atividade: `${classLinks.reduce((sum, link) => sum + (link.atividades_registradas || 0), 0)} atividades`,
        ultimaAtividade: lastActivity || "Sem atividade registrada",
        status: classItem.status,
      };
    });
  }

  if (section === "supervisores") {
    const [supervisors, links, reviews] = await Promise.all([
      safeSelect("oraculo_supervisores_formais", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
      safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
        query.select("supervisor_formal_id, status_academico").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_revisoes_academicas", (query) =>
        query.select("supervisor_formal_id, status").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return supervisors.map((supervisor) => {
      const studentLinks = links.filter((link) => link.supervisor_formal_id === supervisor.id);
      const pendingReviews = reviews.filter(
        (review) =>
          review.supervisor_formal_id === supervisor.id &&
          ["PENDENTE", "EM_REVISAO", "AJUSTE_SOLICITADO"].includes(review.status),
      );
      return {
        id: supervisor.id,
        nome: supervisor.nome,
        email: supervisor.email || "Sem email",
        oab: supervisor.oab_numero ? `OAB/${supervisor.oab_uf || "--"} ${supervisor.oab_numero}` : "OAB nao informada",
        vinculo: supervisor.vinculo || supervisor.cargo || "Vinculo nao informado",
        estudantes: studentLinks.filter((link) => link.status_academico === "ATIVO").length,
        capacidade: supervisor.max_estudantes || "Sem limite",
        revisoes: pendingReviews.length,
        status: supervisor.vinculo_fim ? "INATIVO" : "ATIVO",
      };
    });
  }

  if (section === "orientadores") {
    const [users, roles, links, reviews] = await Promise.all([
      safeSelect("oraculo_instituicao_usuarios", (query) =>
        query.select("id, nome_completo, email, cargo, tipo_vinculo, status").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_instituicao_user_roles", (query) =>
        query.select("instituicao_usuario_id, role, programa_academico_id, revoked_at"),
      ),
      safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
        query.select("professor_orientador_usuario_id, status_academico").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_revisoes_academicas", (query) =>
        query.select("orientador_usuario_id, status, updated_at").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return users
      .filter((user) =>
        roles.some(
          (role) =>
            role.instituicao_usuario_id === user.id &&
            role.role === "ORACULO_PROFESSOR_ORIENTADOR" &&
            !role.revoked_at,
        ),
      )
      .map((user) => {
        const userRoles = roles.filter((role) => role.instituicao_usuario_id === user.id && !role.revoked_at);
        const userLinks = links.filter((link) => link.professor_orientador_usuario_id === user.id);
        const userReviews = reviews.filter((review) => review.orientador_usuario_id === user.id);
        return {
          id: user.id,
          nome: user.nome_completo,
          email: user.email,
          cargo: user.cargo || user.tipo_vinculo || "Vinculo academico",
          programas: new Set(userRoles.map((role) => role.programa_academico_id || "geral")).size,
          estudantes: userLinks.filter((link) => link.status_academico === "ATIVO").length,
          avaliacoes: userReviews.filter((review) => ["PENDENTE", "EM_REVISAO"].includes(review.status)).length,
          ultimaAtividade: userReviews.map((review) => review.updated_at).filter(Boolean).sort().at(-1) || "Sem atividade registrada",
          status: user.status,
        };
      });
  }

  if (section === "revisoes") {
    const [reviews, professionals, programs, classes] = await Promise.all([
      safeSelect("oraculo_revisoes_academicas", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
      safeSelect("oraculo_profissionais", (query) =>
        query.select("id, name, email").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_programas_academicos", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_turmas_academicas", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return reviews.map((review) => ({
      id: review.id,
      titulo: review.titulo || review.tipo_atividade || "Revisao academica",
      codigo: review.codigo_interno || "Sem codigo",
      estudante: professionals.find((item) => item.id === review.oraculo_profissional_id)?.name || "Estudante nao localizado",
      programa: programs.find((item) => item.id === review.programa_academico_id)?.nome || "Programa nao localizado",
      turma: classes.find((item) => item.id === review.turma_academica_id)?.nome || "Sem turma",
      responsavel:
        review.supervisor_nome_snapshot ||
        review.orientador_nome_snapshot ||
        "Responsavel nao definido",
      prioridade: review.prioridade || "NORMAL",
      prazo: review.due_at || "Sem prazo",
      status: review.status,
    }));
  }

  if (section === "atividades") {
    const [activities, professionals, programs, classes] = await Promise.all([
      safeSelect("oraculo_atividades_academicas", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
      safeSelect("oraculo_profissionais", (query) =>
        query.select("id, name, email, periodo_atual").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_programas_academicos", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_turmas_academicas", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return activities.map((activity) => {
      const professional = professionals.find((item) => item.id === activity.oraculo_profissional_id);
      return {
        id: activity.id,
        estudante: professional?.name || "Estudante nao localizado",
        periodo: professional?.periodo_atual || "Periodo nao informado",
        tipo: activity.tipo_atividade,
        titulo: activity.titulo,
        versao: activity.versao_atual || 1,
        contaCarga: activity.conta_carga_horaria,
        codigoCaso: activity.codigo_caso || "Sem caso vinculado",
        area: activity.area_juridica || "Area nao informada",
        programa: programs.find((item) => item.id === activity.programa_academico_id)?.nome || "Programa nao localizado",
        turma: classes.find((item) => item.id === activity.turma_academica_id)?.nome || "Sem turma",
        data: activity.completed_at || activity.started_at || activity.created_at,
        registrado: activity.tempo_registrado_minutos || 0,
        reconhecido: activity.tempo_reconhecido_minutos || 0,
        revisao: activity.revisao_exigida
          ? activity.status === "APROVADA"
            ? "Aprovada"
            : "Aguardando revisao"
          : "Nao exigida",
        responsavel:
          activity.supervisor_nome_snapshot ||
          activity.orientador_nome_snapshot ||
          "Responsavel nao definido",
        reconhecimentoStatus: activity.reconhecimento_status,
        status: activity.status,
      };
    });
  }

  if (section === "carga-horaria") {
    const [links, professionals, programs, classes, workloads] = await Promise.all([
      safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
      safeSelect("oraculo_profissionais", (query) =>
        query.select("id, name, email, numero_matricula").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_programas_academicos", (query) =>
        query.select("id, nome, regras_carga_horaria").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_turmas_academicas", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_carga_horaria_lancamentos", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return links.map((link) => {
      const professional = professionals.find((item) => item.id === link.oraculo_profissional_id);
      const program = programs.find((item) => item.id === link.programa_academico_id);
      const classItem = classes.find((item) => item.id === link.turma_academica_id);
      const studentWorkloads = workloads.filter((item) => item.estudante_vinculo_id === link.id);
      const registered = studentWorkloads.reduce((sum, item) => sum + (item.minutos_registrados || 0), 0);
      const recognized = studentWorkloads.reduce((sum, item) => sum + (item.minutos_reconhecidos || 0), 0);
      const pending = studentWorkloads
        .filter((item) => item.status === "PENDENTE")
        .reduce((sum, item) => sum + (item.minutos_registrados || 0), 0);
      const minimumGoal = Number(program?.regras_carga_horaria?.meta_minima_minutos || 4800);
      const progress = minimumGoal ? Math.min(100, Math.round((recognized / minimumGoal) * 100)) : 0;
      const status = recognized >= minimumGoal ? "META_ATINGIDA" : "ABAIXO_DA_META";

      return {
        id: link.id,
        estudante: professional?.name || "Estudante nao localizado",
        matricula: link.matricula || professional?.numero_matricula || "Sem matricula",
        programa: program?.nome || "Programa nao localizado",
        turma: classItem?.nome || "Sem turma",
        meta: minimumGoal,
        registradas: registered,
        reconhecidas: recognized,
        pendentes: pending,
        progress,
        status,
        limitadas: studentWorkloads.filter((item) => item.limitado_por_regra).length,
        overrides: studentWorkloads.filter((item) => item.override_manual).length,
      };
    });
  }

  if (section === "avaliacoes") {
    const [evaluations, professionals, programs, classes] = await Promise.all([
      safeSelect("oraculo_avaliacoes_academicas", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
      safeSelect("oraculo_profissionais", (query) =>
        query.select("id, name, email").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_programas_academicos", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_turmas_academicas", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return evaluations.map((evaluation) => {
      const scores = [
        evaluation.competencia_pesquisa,
        evaluation.competencia_raciocinio,
        evaluation.competencia_comunicacao,
        evaluation.competencia_etica,
        evaluation.competencia_responsabilidade,
      ].filter(Boolean);
      const average = scores.length
        ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
        : "Sem notas";

      return {
        id: evaluation.id,
        estudante: professionals.find((item) => item.id === evaluation.oraculo_profissional_id)?.name || "Estudante nao localizado",
        programa: programs.find((item) => item.id === evaluation.programa_academico_id)?.nome || "Programa nao localizado",
        turma: classes.find((item) => item.id === evaluation.turma_academica_id)?.nome || "Sem turma",
        periodo: evaluation.periodo_referencia,
        tipo: evaluation.tipo_avaliacao,
        competencias: average,
        conceito: evaluation.conceito_final || "Sem conceito final",
        avaliador: evaluation.avaliador_nome_snapshot || "Avaliador nao definido",
        status: evaluation.status,
      };
    });
  }

  if (section === "relatorios") {
    const [reports, programs, classes, students, professionals] = await Promise.all([
      safeSelect("oraculo_relatorios_institucionais", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("generated_at", { ascending: false }),
      ),
      safeSelect("oraculo_programas_academicos", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_turmas_academicas", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
        query.select("id, oraculo_profissional_id").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_profissionais", (query) =>
        query.select("id, name").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return reports.map((report) => {
      const link = students.find((item) => item.id === report.estudante_vinculo_id);
      const studentName = professionals.find((item) => item.id === link?.oraculo_profissional_id)?.name;
      const scopePrimary =
        studentName ||
        classes.find((item) => item.id === report.turma_academica_id)?.nome ||
        programs.find((item) => item.id === report.programa_academico_id)?.nome ||
        "Instituicao";
      return {
        id: report.id,
        titulo: report.titulo,
        codigo: report.codigo_interno,
        tipo: REPORT_TYPE_LABELS[report.tipo] || report.tipo,
        escopo: scopePrimary,
        escopoDetalhe: report.escopo,
        periodo: formatDateRange(report.periodo_inicio, report.periodo_fim),
        geradoEm: report.generated_at,
        geradoPor: report.generated_by_name_snapshot || "Sistema Oraculo Academico",
        assinatura: `${report.assinaturas_concluidas || 0} / ${report.assinaturas_requeridas || 0} assinaturas`,
        assinaturaStatus: report.assinatura_status,
        status: report.status,
      };
    });
  }

  if (section === "impacto") {
    const [links, activities, workloads, evaluations, supervisors, orientators] = await Promise.all([
      safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
        query.select("id, status_academico").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_atividades_academicas", (query) =>
        query.select("id, area_juridica, tipo_atividade, fontes_consultadas, created_at").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_carga_horaria_lancamentos", (query) =>
        query.select("minutos_reconhecidos").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_avaliacoes_academicas", (query) =>
        query.select("id").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_supervisores_formais", (query) =>
        query.select("id").eq("instituicao_id", instituicaoId),
      ),
      safeSelect("oraculo_instituicao_usuarios", (query) =>
        query.select("id, status").eq("instituicao_id", instituicaoId),
      ),
    ]);

    const lastUpdate = activities.map((item) => item.created_at).filter(Boolean).sort().at(-1);
    const uniqueAreas = new Set(activities.map((item) => item.area_juridica).filter(Boolean));
    const sources = activities.reduce((sum, item) => {
      const list = Array.isArray(item.fontes_consultadas) ? item.fontes_consultadas : [];
      return sum + list.length;
    }, 0);

    return [
      ["estudantes", "Estudantes participantes", links.filter((item) => item.status_academico === "ATIVO").length, "oraculo_estudante_vinculos_academicos", "Vinculos ativos"],
      ["atividades", "Atividades registradas", activities.length, "oraculo_atividades_academicas", "Eventos academicos estruturados"],
      ["horas", "Horas reconhecidas", minutesToHours(workloads.reduce((sum, item) => sum + (item.minutos_reconhecidos || 0), 0)), "oraculo_carga_horaria_lancamentos", "Tempo validado por atividade"],
      ["areas", "Areas juridicas trabalhadas", uniqueAreas.size, "oraculo_atividades_academicas.area_juridica", "Taxonomia registrada"],
      ["fontes", "Fontes juridicas consultadas", sources, "oraculo_atividades_academicas.fontes_consultadas", "Somatorio de fontes vinculadas"],
      ["avaliacoes", "Avaliacoes registradas", evaluations.length, "oraculo_avaliacoes_academicas", "Competencias avaliadas"],
      ["supervisores", "Supervisores envolvidos", supervisors.length, "oraculo_supervisores_formais", "Responsaveis formais"],
      ["orientadores", "Usuarios institucionais ativos", orientators.filter((item) => item.status === "ATIVO").length, "oraculo_instituicao_usuarios", "Usuarios com acesso institucional"],
    ].map(([id, indicador, valor, fonte, metodo]) => ({
      id,
      indicador,
      valor,
      fonte,
      escopo: "Instituicao",
      atualizadoEm: lastUpdate || new Date().toISOString(),
      metodo,
      status: "VALIDO",
    }));
  }

  if (section === "auditoria") {
    const events = await safeSelect("oraculo_auditoria_institucional", (query) =>
      query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }).limit(120),
    );

    return events.map((event) => ({
      id: event.id,
      data: event.created_at,
      usuario: event.usuario_nome_snapshot || event.usuario_email_snapshot || "Sistema Oraculo Academico",
      email: event.usuario_email_snapshot || "",
      role: ROLE_LABELS[event.role_snapshot] || event.role_snapshot || "Role nao informado",
      evento: event.evento_label,
      recurso: event.recurso_label || event.recurso_tipo || "Recurso nao informado",
      contexto: event.contexto_label || "Instituicao",
      resultado: event.resultado,
      risco: event.risk_level,
    }));
  }

  if (section === "usuarios") {
    const [users, roles] = await Promise.all([
      safeSelect("oraculo_instituicao_usuarios", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
      safeSelect("oraculo_instituicao_user_roles", (query) =>
        query.select("instituicao_usuario_id, role, programa_academico_id, revoked_at"),
      ),
    ]);

    return users.map((user) => {
      const activeRoles = roles.filter((role) => role.instituicao_usuario_id === user.id && !role.revoked_at);
      return {
        id: user.id,
        nome: user.nome_completo,
        email: user.email,
        cargo: user.cargo || user.tipo_vinculo || "Cargo nao informado",
        roles: activeRoles.map((role) => ROLE_LABELS[role.role] || role.role).join(", ") || "Sem role ativa",
        escopo: activeRoles.some((role) => role.role === "ORACULO_INSTITUICAO_ADMIN")
          ? "Toda a instituicao"
          : `${new Set(activeRoles.map((role) => role.programa_academico_id).filter(Boolean)).size} programas`,
        status: user.status,
        mfa: user.mfa_required ? "Pendente" : "Role based",
        ultimoAcesso: user.last_access_at ? formatDateTime(user.last_access_at) : "Nunca acessou",
      };
    });
  }

  if (section === "dados") {
    const [institution, requests] = await Promise.all([
      safeSelect("oraculo_instituicoes", (query) =>
        query.select("*").eq("id", instituicaoId).limit(1),
      ),
      safeSelect("oraculo_instituicao_alteracao_solicitacoes", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
      ),
    ]);

    const item = institution[0] || {};
    const rows = [
      ["identificacao", "Identificacao", "Nome da instituicao", item.nome, "Validado pelo Social Juridico", "Cadastro institucional"],
      ["status", "Identificacao", "Status", item.status, "Validado pelo Social Juridico", "Cadastro institucional"],
      ["dominio", "LGPD e Privacidade", "Dominio institucional", item.dominio_institucional || "Nao informado", item.dominio_institucional_validado ? "Validado" : "Pendente", "Acesso institucional"],
      ["mfa", "LGPD e Privacidade", "Politica MFA", item.instituicao_mfa_policy || "ROLE_BASED", "Configurado", "Acesso institucional"],
      ["programa", "Estrutura academica", "Nome do programa", item.nome_programa || "Nao informado", "Cadastro complementar", "Onboarding"],
      ["modalidade", "Modalidade da parceria", "Modalidade", item.modalidade_parceria || "Nao informada", "Solicitar alteracao se necessario", "Onboarding"],
    ].map(([id, secao, campo, valor, validacao, origem]) => ({
      id,
      secao,
      campo,
      valor: valor || "Nao informado",
      validacao,
      origem,
      status: "ATIVO",
    }));

    return [
      ...rows,
      ...requests.map((request) => ({
        id: request.id,
        secao: "Solicitacoes",
        campo: request.campo,
        valor: request.valor_solicitado,
        validacao: request.status,
        origem: request.requested_by_name_snapshot || "Usuario institucional",
        status: request.status,
      })),
    ];
  }

  if (section === "documentos") {
    const [documents, programs] = await Promise.all([
      safeSelect("oraculo_documentos_institucionais", (query) =>
        query.select("*").eq("instituicao_id", instituicaoId).order("uploaded_at", { ascending: false }),
      ),
      safeSelect("oraculo_programas_academicos", (query) =>
        query.select("id, nome").eq("instituicao_id", instituicaoId),
      ),
    ]);

    return documents.map((document) => ({
      id: document.id,
      titulo: document.titulo,
      codigo: document.codigo_interno,
      categoria: document.categoria,
      contexto: document.contexto_label || programs.find((item) => item.id === document.programa_academico_id)?.nome || document.contexto_tipo,
      versao: `v${document.versao || 1}`,
      enviadoEm: document.uploaded_at,
      validade: document.validade_fim || "Sem vencimento",
      status: document.status,
      responsavel: document.responsavel_nome_snapshot || "Social Juridico",
    }));
  }

  const [links, professionals, programs, classes] = await Promise.all([
    safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
      query.select("*").eq("instituicao_id", instituicaoId).order("created_at", { ascending: false }),
    ),
    safeSelect("oraculo_profissionais", (query) =>
      query.select("id, name, email, numero_matricula, periodo_atual").eq("instituicao_id", instituicaoId),
    ),
    safeSelect("oraculo_programas_academicos", (query) =>
      query.select("id, nome").eq("instituicao_id", instituicaoId),
    ),
    safeSelect("oraculo_turmas_academicas", (query) =>
      query.select("id, nome").eq("instituicao_id", instituicaoId),
    ),
  ]);

  return links.map((link) => {
    const professional = professionals.find((item) => item.id === link.oraculo_profissional_id);
    return {
      id: link.id,
      nome: professional?.name || "Estudante sem perfil localizado",
      matricula: link.matricula || professional?.numero_matricula || "Sem matricula",
      email: professional?.email || "Sem email",
      periodo: link.periodo_atual || professional?.periodo_atual || "Periodo nao informado",
      programa: programs.find((item) => item.id === link.programa_academico_id)?.nome || "Programa nao localizado",
      turma: classes.find((item) => item.id === link.turma_academica_id)?.nome || "Sem turma",
      statusAcademico: link.status_academico,
      supervisor: link.supervisor_formal_id ? "Supervisor definido" : "Nao definido",
      orientador: link.professor_orientador_usuario_id ? "Orientador definido" : "Nao definido",
      atividades: link.atividades_registradas || 0,
      horas: minutesToHours(link.horas_reconhecidas_minutos),
      ultimaAtividade: link.ultima_atividade_em || "Sem atividade registrada",
      pendencias: link.revisoes_pendentes > 0 ? `${link.revisoes_pendentes} revisoes` : "Sem pendencias",
    };
  });
}

async function loadInstitutionCandidateQueue() {
  const instituicaoId = await getCurrentInstitutionId();
  if (!instituicaoId) return [];

  const candidates = await safeSelect("oraculo_profissionais", (query) =>
    query
      .select("id, name, email, tipo, status, periodo_atual, numero_matricula, created_at, motivo_reprovacao, suspenso_em")
      .eq("instituicao_id", instituicaoId)
      .in("status", ["PENDENTE_DOCUMENTOS", "PENDENTE_SUPERVISOR", "PENDENTE_ADMIN", "REPROVADO", "SUSPENSO"])
      .order("created_at", { ascending: false }),
  );

  if (!candidates.length) return [];

  const candidateIds = candidates.map((item) => item.id);
  const supervisors = await safeSelect("oraculo_supervisores", (query) =>
    query
      .select("id, oraculo_id, nome, email, relacao, status, convidado_em")
      .in("oraculo_id", candidateIds),
  );

  return candidates.map((candidate) => {
    const candidateSupervisors = supervisors.filter(
      (item) => item.oraculo_id === candidate.id,
    );
    return {
      ...candidate,
      supervisors: candidateSupervisors.map((item) => ({
        id: item.id,
        nome: item.nome,
        email: item.email,
        status: item.status,
        relacaoLabel:
          SUPERVISOR_RELACAO_LABELS[item.relacao] || item.relacao,
      })),
      supervisorApproved: candidateSupervisors.some(
        (item) => item.status === "APROVADO",
      ),
      supervisorCount: candidateSupervisors.length,
      approvedSupervisors: candidateSupervisors.filter(
        (item) => item.status === "APROVADO",
      ).length,
    };
  });
}

function buildSummaryCards(section, rows) {
  if (section === "programas") {
    return [
      ["Programas ativos", String(rows.filter((row) => row.status === "ATIVO").length), "Programas em andamento"],
      ["Estudantes vinculados", String(rows.reduce((sum, row) => sum + row.estudantesVinculados, 0)), "Em programas ativos"],
      ["Turmas ativas", String(rows.reduce((sum, row) => sum + row.turmas, 0)), "Distribuidas nos programas"],
      ["Programas com pendencia", String(rows.filter((row) => row.orientador.includes("nao") || row.supervisor.includes("nao")).length), "Requerem atencao"],
    ];
  }

  if (section === "turmas") {
    return [
      ["Turmas ativas", String(rows.filter((row) => row.status === "ATIVA").length), "Em andamento"],
      ["Estudantes em turmas", String(rows.reduce((sum, row) => sum + row.estudantes, 0)), "Vinculos atuais"],
      ["Turmas sem orientador", String(rows.filter((row) => row.orientador === "Nao definido").length), "Requerem definicao"],
      ["Turmas com atencao", String(rows.filter((row) => row.estudantes === 0 || row.supervisor === "Nao definido").length), "Pendencias academicas"],
    ];
  }

  if (section === "supervisores") {
    return [
      ["Supervisores ativos", String(rows.filter((row) => row.status === "ATIVO").length), "Vinculos formais vigentes"],
      ["Estudantes supervisionados", String(rows.reduce((sum, row) => sum + row.estudantes, 0)), "Com vinculo ativo"],
      ["Revisoes pendentes", String(rows.reduce((sum, row) => sum + row.revisoes, 0)), "Aguardando responsavel"],
      ["Sem capacidade definida", String(rows.filter((row) => row.capacidade === "Sem limite").length), "Requer configuracao"],
    ];
  }

  if (section === "orientadores") {
    return [
      ["Orientadores ativos", String(rows.filter((row) => row.status === "ATIVO").length), "Usuarios institucionais"],
      ["Estudantes orientados", String(rows.reduce((sum, row) => sum + row.estudantes, 0)), "Com vinculo ativo"],
      ["Avaliacoes pendentes", String(rows.reduce((sum, row) => sum + row.avaliacoes, 0)), "Aguardando orientador"],
      ["Programas cobertos", String(rows.reduce((sum, row) => sum + row.programas, 0)), "Escopos ativos"],
    ];
  }

  if (section === "revisoes") {
    return [
      ["Revisoes pendentes", String(rows.filter((row) => row.status === "PENDENTE").length), "Aguardando triagem"],
      ["Em revisao", String(rows.filter((row) => row.status === "EM_REVISAO").length), "Com responsavel"],
      ["Ajustes solicitados", String(rows.filter((row) => row.status === "AJUSTE_SOLICITADO").length), "Aguardando estudante"],
      ["Criticas", String(rows.filter((row) => row.prioridade === "CRITICA").length), "Prioridade alta"],
    ];
  }

  if (section === "atividades") {
    const completed = rows.filter((row) => ["APROVADA", "REPROVADA", "CANCELADA"].includes(row.status)).length;
    const approved = rows.filter((row) => row.status === "APROVADA").length;
    return [
      ["Atividades no periodo", String(rows.length), "Registros academicos reais"],
      ["Aprovadas", String(approved), completed ? `${Math.round((approved / completed) * 100)}% das concluidas` : "Sem concluidas ainda"],
      ["Aguardando revisao", String(rows.filter((row) => row.revisao === "Aguardando revisao").length), "Pendentes de responsavel"],
      ["Horas reconhecidas", minutesToHours(rows.reduce((sum, row) => sum + row.reconhecido, 0)), "Geradas por atividades"],
    ];
  }

  if (section === "carga-horaria") {
    const registered = rows.reduce((sum, row) => sum + row.registradas, 0);
    const recognized = rows.reduce((sum, row) => sum + row.reconhecidas, 0);
    return [
      ["Horas registradas", minutesToHours(registered), "Tempo informado nas atividades"],
      ["Horas reconhecidas", minutesToHours(recognized), "Apos regras e validacoes"],
      ["Pendentes de validacao", minutesToHours(rows.reduce((sum, row) => sum + row.pendentes, 0)), "Aguardando revisao"],
      ["Estudantes abaixo da meta", String(rows.filter((row) => row.status === "ABAIXO_DA_META").length), "Precisam de atencao"],
    ];
  }

  if (section === "avaliacoes") {
    return [
      ["Avaliacoes registradas", String(rows.length), "Por competencia"],
      ["Enviadas", String(rows.filter((row) => row.status === "ENVIADA").length), "Aguardando conclusao"],
      ["Aprovadas", String(rows.filter((row) => row.status === "APROVADA").length), "Validadas pela instituicao"],
      ["Sem conceito final", String(rows.filter((row) => row.conceito === "Sem conceito final").length), "Requerem fechamento"],
    ];
  }

  if (section === "relatorios") {
    return [
      ["Relatorios gerados", String(rows.length), "No periodo selecionado"],
      ["Pendentes de assinatura", String(rows.filter((row) => ["PENDENTE", "PARCIAL"].includes(row.assinaturaStatus)).length), "Aguardando assinatura"],
      ["Prazos proximos", "0", "Proximos 15 dias"],
      ["Arquivados", String(rows.filter((row) => row.status === "ARQUIVADO").length), "Historico institucional"],
    ];
  }

  if (section === "impacto") {
    return rows.slice(0, 4).map((row) => [
      row.indicador,
      String(row.valor),
      row.metodo,
    ]);
  }

  if (section === "auditoria") {
    return [
      ["Eventos auditados", String(rows.length), "Trilha append-only"],
      ["Acessos negados", String(rows.filter((row) => row.resultado === "NEGADO").length), "Sem detalhes tecnicos sensiveis"],
      ["Eventos criticos", String(rows.filter((row) => row.risco === "CRITICO").length), "Requerem atencao"],
      ["Ultimo evento", rows[0]?.data ? formatDateTime(rows[0].data) : "Sem eventos", "Timezone America/Sao_Paulo"],
    ];
  }

  if (section === "usuarios") {
    return [
      ["Usuarios ativos", String(rows.filter((row) => row.status === "ATIVO").length), "Acessos individuais"],
      ["Convidados", String(rows.filter((row) => row.status === "CONVIDADO").length), "Aguardando ativacao"],
      ["MFA pendente", String(rows.filter((row) => row.mfa === "Pendente").length), "Conforme politica"],
      ["Sem acesso recente", String(rows.filter((row) => row.ultimoAcesso === "Nunca acessou").length), "Monitorar onboarding"],
    ];
  }

  if (section === "dados") {
    return [
      ["Dados consultaveis", String(rows.filter((row) => row.secao !== "Solicitacoes").length), "Cadastro institucional"],
      ["Solicitacoes pendentes", String(rows.filter((row) => row.status === "PENDENTE").length), "Aguardando Social Juridico"],
      ["Campos validados", String(rows.filter((row) => String(row.validacao).includes("Validado")).length), "Nao editaveis diretamente"],
      ["Pendencias", String(rows.filter((row) => String(row.validacao).includes("Pendente")).length), "Requerem atencao"],
    ];
  }

  if (section === "documentos") {
    return [
      ["Documentos", String(rows.length), "Disponiveis no escopo"],
      ["Pendentes de validacao", String(rows.filter((row) => row.status === "PENDENTE_VALIDACAO").length), "Aguardando conferencia"],
      ["Vencidos", String(rows.filter((row) => row.status === "VENCIDO").length), "Requerem nova versao"],
      ["Validos", String(rows.filter((row) => row.status === "VALIDO").length), "Compliance ativo"],
    ];
  }

  return [
    ["Estudantes ativos", String(rows.filter((row) => row.statusAcademico === "ATIVO").length), "Com vinculo academico ativo"],
    ["Sem atividade recente", String(rows.filter((row) => row.ultimaAtividade === "Sem atividade registrada").length), "Mais de 7 dias"],
    ["Abaixo da meta de horas", "0", "Acompanhar carga horaria"],
    ["Com revisao pendente", String(rows.filter((row) => row.pendencias !== "Sem pendencias").length), "Aguardando responsavel"],
  ];
}

function renderProgramRow(item) {
  return [
    <Link key="programa" href={`/dashboard/oraculoacademico/instituicao/programas/${item.id}`}>
      <strong>{item.nome}</strong>
      <small>{item.codigo}</small>
    </Link>,
    <span key="modalidade" className={styles.softBadge}>{item.modalidade}</span>,
    <span key="curso">{item.curso}<small>{item.campus}</small></span>,
    <span key="periodo">{item.periodo}<small>{item.datas}</small></span>,
    <span key="estudantes">{item.estudantesAtivos} ativos<small>{item.estudantesVinculados} vinculados</small></span>,
    <Link key="turmas" href={`/dashboard/oraculoacademico/instituicao/turmas?programa=${item.id}`}>{item.turmas} turmas</Link>,
    <span key="responsaveis">{item.orientador}<small>{item.supervisor}</small></span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>Ver Editar Duplicar</span>,
  ];
}

function renderClassRow(item) {
  return [
    <Link key="turma" href={`/dashboard/oraculoacademico/instituicao/turmas/${item.id}`}>
      <strong>{item.nome}</strong>
      <small>{item.codigo}</small>
    </Link>,
    <span key="programa">{item.programa}</span>,
    <span key="campus">{item.campus}<small>{item.turno}</small></span>,
    <span key="estudantes">{item.estudantes} estudantes<small>{item.ativos} ativos, {item.pausados} pausados</small></span>,
    <span key="orientador">{item.orientador}</span>,
    <span key="supervisor">{item.supervisor}</span>,
    <span key="atividade">{item.atividade}<small>{item.ultimaAtividade}</small></span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>Ver Editar Adicionar</span>,
  ];
}

function renderStudentRow(item) {
  return [
    <Link key="estudante" href={`/dashboard/oraculoacademico/instituicao/estudantes/${item.id}`}>
      <strong>{item.nome}</strong>
      <small>{item.matricula} - {item.email}</small>
    </Link>,
    <span key="programa">{item.programa}<small>{item.turma}</small></span>,
    <span key="periodo">{item.periodo}</span>,
    <StatusBadge key="status" status={item.statusAcademico} />,
    <span key="atividades">{item.atividades}</span>,
    <span key="horas">{item.horas}</span>,
    <span key="ultima">{item.ultimaAtividade}</span>,
    <span key="responsaveis">{item.orientador}<small>{item.supervisor}</small></span>,
    <span key="acoes" className={styles.rowActions}>Ver Alterar Pausar</span>,
  ];
}

function renderSupervisorRow(item) {
  return [
    <Link key="supervisor" href={`/dashboard/oraculoacademico/instituicao/supervisores/${item.id}`}>
      <strong>{item.nome}</strong>
      <small>{item.email}</small>
    </Link>,
    <span key="oab">{item.oab}</span>,
    <span key="vinculo">{item.vinculo}</span>,
    <span key="estudantes">{item.estudantes} estudantes</span>,
    <span key="capacidade">{item.capacidade}</span>,
    <span key="revisoes">{item.revisoes} pendentes</span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>Ver Vincular Revisoes</span>,
  ];
}

function renderOrientadorRow(item) {
  return [
    <Link key="orientador" href={`/dashboard/oraculoacademico/instituicao/orientadores/${item.id}`}>
      <strong>{item.nome}</strong>
      <small>{item.email}</small>
    </Link>,
    <span key="cargo">{item.cargo}</span>,
    <span key="programas">{item.programas} programas</span>,
    <span key="estudantes">{item.estudantes} estudantes</span>,
    <span key="avaliacoes">{item.avaliacoes} pendentes</span>,
    <span key="ultima">{item.ultimaAtividade}</span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>Ver Avaliar Relatorios</span>,
  ];
}

function renderReviewRow(item) {
  return [
    <Link key="revisao" href={`/dashboard/oraculoacademico/instituicao/revisoes/${item.id}`}>
      <strong>{item.titulo}</strong>
      <small>{item.codigo}</small>
    </Link>,
    <span key="estudante">{item.estudante}</span>,
    <span key="programa">{item.programa}<small>{item.turma}</small></span>,
    <span key="responsavel">{item.responsavel}</span>,
    <span key="prioridade" className={styles.softBadge}>{item.prioridade}</span>,
    <span key="prazo">{item.prazo}</span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>Abrir Aprovar Ajuste</span>,
  ];
}

function renderActivityRow(item) {
  return [
    <Link key="estudante" href={`/dashboard/oraculoacademico/instituicao/atividades/${item.id}`}>
      <strong>{item.estudante}</strong>
      <small>{item.periodo}</small>
    </Link>,
    <span key="atividade">
      {item.tipo}
      <small>Versao {item.versao} - {item.contaCarga ? "Conta carga horaria" : "Nao contabilizavel"}</small>
    </span>,
    <span key="caso">{item.codigoCaso}<small>{item.area}</small></span>,
    <span key="programa">{item.programa}<small>{item.turma}</small></span>,
    <span key="data">{formatDateTime(item.data)}</span>,
    <span key="tempo">
      {minutesToHours(item.registrado)} registrados
      <small>{item.reconhecido ? `${minutesToHours(item.reconhecido)} reconhecidos` : item.reconhecimentoStatus}</small>
    </span>,
    <span key="revisao">{item.revisao}<small>{item.responsavel}</small></span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>Ver Historico Revisao</span>,
  ];
}

function renderWorkloadRow(item) {
  return [
    <Link key="estudante" href={`/dashboard/oraculoacademico/instituicao/carga-horaria/estudantes/${item.id}`}>
      <strong>{item.estudante}</strong>
      <small>{item.matricula}</small>
    </Link>,
    <span key="programa">{item.programa}<small>{item.turma}</small></span>,
    <span key="meta">{minutesToHours(item.meta)}<small>Meta minima</small></span>,
    <span key="registradas">{minutesToHours(item.registradas)}</span>,
    <span key="reconhecidas">{minutesToHours(item.reconhecidas)}</span>,
    <span key="pendentes">{minutesToHours(item.pendentes)}</span>,
    <span key="progresso" className={styles.progressCell}>
      <span style={{ width: `${item.progress}%` }} />
      <small>{item.progress}%</small>
    </span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>Detalhar Atividades Pendencias</span>,
  ];
}

function renderEvaluationRow(item) {
  return [
    <Link key="estudante" href={`/dashboard/oraculoacademico/instituicao/avaliacoes/${item.id}`}>
      <strong>{item.estudante}</strong>
      <small>{item.tipo}</small>
    </Link>,
    <span key="programa">{item.programa}<small>{item.turma}</small></span>,
    <span key="periodo">{item.periodo}</span>,
    <span key="competencias">{item.competencias}<small>Media de competencias</small></span>,
    <span key="conceito">{item.conceito}</span>,
    <span key="avaliador">{item.avaliador}</span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>Ver Editar Parecer</span>,
  ];
}

function renderReportRow(item) {
  return [
    <Link key="relatorio" href={`/dashboard/oraculoacademico/instituicao/relatorios/${item.id}`}>
      <strong>{item.titulo}</strong>
      <small>{item.codigo}</small>
    </Link>,
    <span key="tipo">{item.tipo}</span>,
    <span key="escopo">{item.escopo}<small>{item.escopoDetalhe}</small></span>,
    <span key="periodo">{item.periodo}</span>,
    <span key="gerado">{formatDateTime(item.geradoEm)}</span>,
    <span key="autor">{item.geradoPor}</span>,
    <span key="assinatura">{item.assinatura}<small>{item.assinaturaStatus}</small></span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="acoes" className={styles.rowActions}>
      <Link href={`/api/oraculoacademico/instituicao/relatorios/${item.id}/download?format=pdf`}>PDF</Link>
      <Link href={`/api/oraculoacademico/instituicao/relatorios/${item.id}/download?format=docx`}>DOCX</Link>
      <Link href={`/api/oraculoacademico/instituicao/relatorios/${item.id}/download?format=xlsx`}>Excel</Link>
    </span>,
  ];
}

function renderImpactRow(item) {
  return [
    <strong key="indicador">{item.indicador}</strong>,
    <span key="valor">{item.valor}</span>,
    <span key="fonte">{item.fonte}</span>,
    <span key="escopo">{item.escopo}</span>,
    <span key="atualizado">{formatDateTime(item.atualizadoEm)}</span>,
    <span key="metodo">{item.metodo}</span>,
    <StatusBadge key="status" status={item.status} />,
  ];
}

function renderAuditRow(item) {
  return [
    <span key="data">{formatDateTime(item.data)}</span>,
    <span key="usuario">{item.usuario}<small>{item.email}</small></span>,
    <span key="role">{item.role}</span>,
    <span key="evento">{item.evento}<small>Risco {item.risco}</small></span>,
    <span key="recurso">{item.recurso}</span>,
    <span key="contexto">{item.contexto}</span>,
    <StatusBadge key="resultado" status={item.resultado} />,
    <span key="acoes" className={styles.rowActions}>Ver detalhes</span>,
  ];
}

function renderUserAccessRow(item) {
  return [
    <Link key="usuario" href={`/dashboard/oraculoacademico/instituicao/usuarios/${item.id}`}>
      <strong>{item.nome}</strong>
      <small>{item.email}</small>
    </Link>,
    <span key="cargo">{item.cargo}</span>,
    <span key="roles">{item.roles}</span>,
    <span key="escopo">{item.escopo}</span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="mfa">{item.mfa}</span>,
    <span key="ultimo">{item.ultimoAcesso}</span>,
    <span key="acoes" className={styles.rowActions}>Ver Roles Bloquear</span>,
  ];
}

function renderInstitutionDataRow(item) {
  return [
    <span key="secao">{item.secao}</span>,
    <strong key="campo">{item.campo}</strong>,
    <span key="valor">{item.valor}</span>,
    <StatusBadge key="validacao" status={item.status || "ATIVO"} />,
    <span key="origem">{item.origem}<small>{item.validacao}</small></span>,
    <span key="acoes" className={styles.rowActions}>Solicitar alteracao</span>,
  ];
}

function renderDocumentRow(item) {
  return [
    <Link key="documento" href={`/dashboard/oraculoacademico/instituicao/documentos/${item.id}`}>
      <strong>{item.titulo}</strong>
      <small>{item.codigo}</small>
    </Link>,
    <span key="categoria">{item.categoria}</span>,
    <span key="contexto">{item.contexto}</span>,
    <span key="versao">{item.versao}</span>,
    <span key="enviado">{formatDateTime(item.enviadoEm)}</span>,
    <span key="validade">{item.validade}</span>,
    <StatusBadge key="status" status={item.status} />,
    <span key="responsavel">{item.responsavel}</span>,
    <span key="acoes" className={styles.rowActions}>Visualizar Versoes Validacao</span>,
  ];
}

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status${statusTone(status)}`]}`}>
      {status}
    </span>
  );
}

function FilterBar({ filters }) {
  return (
    <div className={styles.academicFilters}>
      {filters.map((filter, index) => (
        <span key={filter} className={index === 0 ? styles.filterSearch : undefined}>
          {filter}
        </span>
      ))}
      <button type="button">Limpar filtros</button>
    </div>
  );
}

function SummaryCards({ cards }) {
  return (
    <section className={styles.academicCards}>
      {cards.map(([label, value, detail]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{detail}</small>
        </div>
      ))}
    </section>
  );
}

function CandidateDecisionQueue({ candidates }) {
  if (!candidates.length) return null;

  return (
    <section className={styles.candidateQueue}>
      <div>
        <span className={styles.kicker}>Decisao institucional</span>
        <h2>Cadastros aguardando a instituicao</h2>
        <p>
          A instituicao aprova ou reprova o cadastro do estudante. O Social
          Juridico apenas monitora e pode suspender por denuncia ou mau uso.
        </p>
      </div>

      <div className={styles.candidateList}>
        {candidates.map((candidate) => {
          const isFinal = ["REPROVADO", "SUSPENSO"].includes(candidate.status);
          const canApprove = !isFinal;
          const canReject = !isFinal;

          return (
            <article key={candidate.id} className={styles.candidateCard}>
              <div>
                <strong>{candidate.name}</strong>
                <small>
                  {candidate.email} - {candidate.tipo} -{" "}
                  {candidate.periodo_atual || "Periodo nao informado"}
                </small>
              </div>
              <StatusBadge status={candidate.status} />
              <p>
                Supervisores: {candidate.approvedSupervisors}/
                {candidate.supervisorCount} aprovaram.
              </p>
              <div className={styles.candidateActions}>
                <form action={decideOraculoCandidateAction}>
                  <input type="hidden" name="id" value={candidate.id} />
                  <input type="hidden" name="decision" value="APROVADO" />
                  <button type="submit" disabled={!canApprove}>
                    Aprovar pela instituicao
                  </button>
                </form>
                <form action={decideOraculoCandidateAction}>
                  <input type="hidden" name="id" value={candidate.id} />
                  <input type="hidden" name="decision" value="REPROVADO" />
                  <input
                    name="motivo"
                    placeholder="Motivo da reprovacao"
                    disabled={!canReject}
                    required={canReject}
                  />
                  <button type="submit" disabled={!canReject}>
                    Reprovar
                  </button>
                </form>
              </div>
              {candidate.supervisors?.length > 0 && (
                <ul className={styles.supervisorInviteList}>
                  {candidate.supervisors.map((supervisor) => (
                    <li key={supervisor.id} className={styles.supervisorInviteItem}>
                      <span className={styles.supervisorInviteInfo}>
                        <strong>{supervisor.nome}</strong>
                        <small>
                          {supervisor.email} - {supervisor.relacaoLabel}
                        </small>
                      </span>
                      <StatusBadge status={supervisor.status} />
                      {supervisor.status === "CONVIDADO" && (
                        <form action={resendSupervisorInviteAction}>
                          <input
                            type="hidden"
                            name="supervisor_id"
                            value={supervisor.id}
                          />
                          <button type="submit">Reenviar convite</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DataTable({ config, rows, section }) {
  const renderer = {
    programas: renderProgramRow,
    turmas: renderClassRow,
    estudantes: renderStudentRow,
    supervisores: renderSupervisorRow,
    orientadores: renderOrientadorRow,
    revisoes: renderReviewRow,
    atividades: renderActivityRow,
    "carga-horaria": renderWorkloadRow,
    avaliacoes: renderEvaluationRow,
    relatorios: renderReportRow,
    impacto: renderImpactRow,
    auditoria: renderAuditRow,
    usuarios: renderUserAccessRow,
    dados: renderInstitutionDataRow,
    documentos: renderDocumentRow,
  }[section];

  if (!rows.length) {
    return (
      <section className={styles.academicEmpty}>
        <Construction size={30} aria-hidden="true" />
        <h2>{config.empty}</h2>
        <p>Crie ou vincule registros para iniciar o acompanhamento academico.</p>
        <Link href={config.primaryHref}>{config.primaryAction}</Link>
      </section>
    );
  }

  return (
    <div className={styles.academicTableWrap}>
      <table className={styles.academicTable}>
        <thead>
          <tr>
            {config.columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {renderer(row).map((cell, index) => (
                <td key={`${row.id}-${config.columns[index]}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function loadFormOptions() {
  const instituicaoId = await getCurrentInstitutionId();
  if (!instituicaoId) {
    return { programs: [], classes: [], students: [], activityTypes: [], institutionName: "" };
  }

  const [institution, programs, classes, links, professionals, activityTypes] = await Promise.all([
    safeSelect("oraculo_instituicoes", (query) =>
      query.select("id, nome").eq("id", instituicaoId).limit(1),
    ),
    safeSelect("oraculo_programas_academicos", (query) =>
      query
        .select("id, nome, status, regras_carga_horaria")
        .eq("instituicao_id", instituicaoId)
        .in("status", ["RASCUNHO", "PROGRAMADO", "ATIVO"])
        .order("created_at", { ascending: false }),
    ),
    safeSelect("oraculo_turmas_academicas", (query) =>
      query
        .select("id, nome, programa_academico_id, status")
        .eq("instituicao_id", instituicaoId)
        .in("status", ["RASCUNHO", "PROGRAMADA", "ATIVA"])
        .order("created_at", { ascending: false }),
    ),
    safeSelect("oraculo_estudante_vinculos_academicos", (query) =>
      query
        .select("id, programa_academico_id, turma_academica_id, oraculo_profissional_id, status_academico")
        .eq("instituicao_id", instituicaoId)
        .in("status_academico", ["ATIVO", "PENDENTE_VINCULO"])
        .order("created_at", { ascending: false }),
    ),
    safeSelect("oraculo_profissionais", (query) =>
      query.select("id, name, email, numero_matricula").eq("instituicao_id", instituicaoId),
    ),
    safeSelect("oraculo_programa_atividades", (query) =>
      query.select("id, programa_academico_id, tipo, nome, default_minutes, max_minutes, requires_supervisor_review, counts_workload").eq("ativo", true).order("display_order", { ascending: true }),
    ),
  ]);

  const students = links.map((link) => {
    const professional = professionals.find((item) => item.id === link.oraculo_profissional_id);
    return {
      id: link.id,
      programa_academico_id: link.programa_academico_id,
      turma_academica_id: link.turma_academica_id,
      nome: professional?.name || "Estudante sem perfil",
      email: professional?.email || "",
      matricula: professional?.numero_matricula || "",
    };
  });

  return {
    programs,
    classes,
    students,
    activityTypes,
    institutionName: institution[0]?.nome || "",
  };
}

function Field({ label, name, type = "text", required = false, children, ...props }) {
  return (
    <label className={styles.academicField}>
      <span>{label}</span>
      {children || <input name={name} type={type} required={required} {...props} />}
    </label>
  );
}

function SubmitRow({ backHref, children }) {
  return (
    <div className={styles.formActions}>
      <Link href={backHref}>Cancelar</Link>
      {children}
    </div>
  );
}

function ProgramForm() {
  return (
    <form action={createAcademicProgramAction} className={styles.academicForm}>
      <section>
        <h2>Identificacao</h2>
        <div className={styles.formGrid}>
          <Field label="Nome do programa" name="nome" required />
          <Field label="Codigo interno" name="codigo_interno" placeholder="PRG-2026-001" />
          <Field label="Curso" name="curso" defaultValue="Direito" required />
          <Field label="Campus" name="campus" placeholder="Campus Centro" />
          <Field label="Periodo academico" name="periodo_academico" placeholder="2026/2" required />
          <Field label="Data de inicio" name="data_inicio" type="date" />
          <Field label="Data de termino" name="data_fim" type="date" />
          <Field label="Status" name="status">
            <select name="status" defaultValue="RASCUNHO">
              <option value="RASCUNHO">Rascunho</option>
              <option value="PROGRAMADO">Programado</option>
              <option value="ATIVO">Ativo</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2>Modalidade e capacidade</h2>
        <div className={styles.formGrid}>
          <Field label="Modalidade" name="modalidade">
            <select name="modalidade" defaultValue="PRATICA_NPJ">
              <option value="PRATICA_NPJ">Pratica Juridica / NPJ</option>
              <option value="ESTAGIO_OBRIGATORIO">Estagio obrigatorio</option>
              <option value="ESTAGIO_NAO_OBRIGATORIO">Estagio nao obrigatorio</option>
              <option value="ESTAGIO_OAB">Estagio profissional OAB</option>
            </select>
          </Field>
          <Field label="Maximo de estudantes" name="max_estudantes" type="number" min="1" />
          <Field label="Maximo por turma" name="max_estudantes_turma" type="number" min="1" />
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/programas">
        <button type="submit">Salvar programa</button>
      </SubmitRow>
    </form>
  );
}

function ClassForm({ programs }) {
  return (
    <form action={createAcademicClassAction} className={styles.academicForm}>
      <section>
        <h2>Programa</h2>
        <div className={styles.formGrid}>
          <Field label="Programa academico" name="programa_academico_id">
            <select name="programa_academico_id" required defaultValue="">
              <option value="" disabled>Selecione um programa</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.nome} ({program.status})
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2>Identificacao e capacidade</h2>
        <div className={styles.formGrid}>
          <Field label="Nome da turma" name="nome" required />
          <Field label="Codigo interno" name="codigo_interno" placeholder="TRM-2026-09N" />
          <Field label="Campus" name="campus" />
          <Field label="Turno" name="turno">
            <select name="turno" defaultValue="NOTURNO">
              <option value="MATUTINO">Matutino</option>
              <option value="VESPERTINO">Vespertino</option>
              <option value="NOTURNO">Noturno</option>
              <option value="INTEGRAL">Integral</option>
              <option value="OUTRO">Outro</option>
            </select>
          </Field>
          <Field label="Periodo predominante" name="periodo_predominante" placeholder="9o periodo" />
          <Field label="Data de inicio" name="data_inicio" type="date" />
          <Field label="Data de termino" name="data_fim" type="date" />
          <Field label="Capacidade maxima" name="max_estudantes" type="number" min="1" />
          <Field label="Status" name="status">
            <select name="status" defaultValue="RASCUNHO">
              <option value="RASCUNHO">Rascunho</option>
              <option value="PROGRAMADA">Programada</option>
              <option value="ATIVA">Ativa</option>
            </select>
          </Field>
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/turmas">
        <button type="submit">Salvar turma</button>
      </SubmitRow>
    </form>
  );
}

function StudentLinkForm({ programs, classes, institutionName }) {
  return (
    <form action={linkAcademicStudentAction} className={styles.academicForm}>
      <section>
        <h2>Dados do estudante</h2>
        <div className={styles.formGrid}>
          <Field label="Nome completo" name="nome" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Matricula" name="matricula" />
          <Field label="Periodo atual" name="periodo_atual" placeholder="9o periodo" />
          <Field label="Curso" name="curso" defaultValue="Direito" />
          <Field
            label="Instituicao de ensino"
            name="instituicao_ensino"
            value={institutionName}
            readOnly
          />
        </div>
      </section>

      <section>
        <h2>Vinculo academico</h2>
        <div className={styles.formGrid}>
          <Field label="Programa" name="programa_academico_id">
            <select name="programa_academico_id" required defaultValue="">
              <option value="" disabled>Selecione um programa</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Turma" name="turma_academica_id">
            <select name="turma_academica_id" defaultValue="">
              <option value="">Sem turma por enquanto</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status academico" name="status_academico">
            <select name="status_academico" defaultValue="ATIVO">
              <option value="PENDENTE_VINCULO">Pendente de vinculo</option>
              <option value="ATIVO">Ativo</option>
              <option value="PAUSADO">Pausado</option>
            </select>
          </Field>
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/estudantes">
        <button type="submit">Vincular estudante</button>
      </SubmitRow>
    </form>
  );
}

function SupervisorForm() {
  return (
    <form action={createFormalSupervisorAction} className={styles.academicForm}>
      <section>
        <h2>Dados do supervisor juridico</h2>
        <div className={styles.formGrid}>
          <Field label="Nome completo" name="nome" required />
          <Field label="E-mail" name="email" type="email" />
          <Field label="Telefone" name="telefone" />
          <Field label="Numero OAB" name="oab_numero" />
          <Field label="UF da OAB" name="oab_uf" maxLength={2} />
          <Field label="Cargo" name="cargo" />
          <Field label="Vinculo" name="vinculo" placeholder="Professor, advogado parceiro..." />
          <Field label="Maximo de estudantes" name="max_estudantes" type="number" min="1" />
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/supervisores">
        <button type="submit">Vincular supervisor</button>
      </SubmitRow>
    </form>
  );
}

function OrientatorForm() {
  return (
    <form action={createInstitutionOrientatorAction} className={styles.academicForm}>
      <section>
        <h2>Dados do professor orientador</h2>
        <div className={styles.formGrid}>
          <Field label="Nome completo" name="nome_completo" required />
          <Field label="E-mail institucional" name="email" type="email" required />
          <Field label="Telefone" name="telefone" />
          <Field label="Cargo" name="cargo" defaultValue="Professor orientador" />
          <Field label="Tipo de vinculo" name="tipo_vinculo">
            <select name="tipo_vinculo" defaultValue="RESPONSAVEL_ACADEMICO">
              <option value="RESPONSAVEL_ACADEMICO">Responsavel academico</option>
              <option value="COORDENADOR">Coordenador</option>
              <option value="GESTOR_NPJ">Gestor NPJ</option>
              <option value="OUTRO">Outro</option>
            </select>
          </Field>
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/orientadores">
        <button type="submit">Vincular orientador</button>
      </SubmitRow>
    </form>
  );
}

function ActivityForm({ programs, classes, students, activityTypes }) {
  return (
    <form action={createAcademicActivityAction} className={styles.academicForm}>
      <section>
        <h2>Vinculo academico</h2>
        <div className={styles.formGrid}>
          <Field label="Estudante" name="estudante_vinculo_id">
            <select name="estudante_vinculo_id" required defaultValue="">
              <option value="" disabled>Selecione um estudante vinculado</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nome} {student.matricula ? `- ${student.matricula}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Programa" name="programa_academico_id">
            <select name="programa_academico_id" required defaultValue="">
              <option value="" disabled>Selecione um programa</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Turma" name="turma_academica_id">
            <select name="turma_academica_id" defaultValue="">
              <option value="">Sem turma</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>{classItem.nome}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2>Evidencia da atividade</h2>
        <div className={styles.formGrid}>
          <Field label="Tipo configurado" name="programa_atividade_id">
            <select name="programa_atividade_id" defaultValue="">
              <option value="">Informar tipo manualmente</option>
              {activityTypes.map((activityType) => (
                <option key={activityType.id} value={activityType.id}>
                  {activityType.nome}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de atividade" name="tipo_atividade" placeholder="Pesquisa juridica" required />
          <Field label="Titulo" name="titulo" placeholder="Analise inicial do caso" />
          <Field label="Codigo do caso" name="codigo_caso" placeholder="SJ-28741" />
          <Field label="Area juridica" name="area_juridica" placeholder="Direito do Consumidor" />
          <Field label="Status" name="status">
            <select name="status" defaultValue="ENVIADA_REVISAO">
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="CONCLUIDA">Concluida</option>
              <option value="ENVIADA_REVISAO">Enviada para revisao</option>
              <option value="APROVADA">Aprovada</option>
            </select>
          </Field>
          <Field label="Resumo academico" name="conteudo_resumo">
            <textarea name="conteudo_resumo" rows={4} placeholder="Resumo sem expor relato integral sensivel." />
          </Field>
        </div>
      </section>

      <section>
        <h2>Carga horaria e revisao</h2>
        <div className={styles.formGrid}>
          <Field label="Tempo registrado (min)" name="tempo_registrado_minutos" type="number" min="0" defaultValue="30" />
          <Field label="Tempo reconhecido (min)" name="tempo_reconhecido_minutos" type="number" min="0" defaultValue="0" />
          <Field label="Regra aplicada" name="regra_reconhecimento" placeholder="Limite do programa aplicado" />
          <Field label="Conta carga horaria" name="conta_carga_horaria">
            <select name="conta_carga_horaria" defaultValue="true">
              <option value="true">Sim</option>
              <option value="false">Nao</option>
            </select>
          </Field>
          <Field label="Exige revisao" name="revisao_exigida">
            <select name="revisao_exigida" defaultValue="true">
              <option value="true">Sim</option>
              <option value="false">Nao</option>
            </select>
          </Field>
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/atividades">
        <button type="submit">Registrar atividade</button>
      </SubmitRow>
    </form>
  );
}

function EvaluationForm({ programs, classes, students }) {
  return (
    <form action={createAcademicEvaluationAction} className={styles.academicForm}>
      <section>
        <h2>Escopo da avaliacao</h2>
        <div className={styles.formGrid}>
          <Field label="Estudante" name="estudante_vinculo_id">
            <select name="estudante_vinculo_id" required defaultValue="">
              <option value="" disabled>Selecione um estudante</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Programa" name="programa_academico_id">
            <select name="programa_academico_id" required defaultValue="">
              <option value="" disabled>Selecione um programa</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Turma" name="turma_academica_id">
            <select name="turma_academica_id" defaultValue="">
              <option value="">Sem turma</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>{classItem.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Periodo de referencia" name="periodo_referencia" placeholder="2026/2" required />
          <Field label="Tipo de avaliacao" name="tipo_avaliacao">
            <select name="tipo_avaliacao" defaultValue="FORMATIVA">
              <option value="FORMATIVA">Formativa</option>
              <option value="SOMATIVA">Somativa</option>
              <option value="PARCIAL">Parcial</option>
              <option value="FINAL">Final</option>
            </select>
          </Field>
          <Field label="Status" name="status">
            <select name="status" defaultValue="ENVIADA">
              <option value="RASCUNHO">Rascunho</option>
              <option value="EM_PREENCHIMENTO">Em preenchimento</option>
              <option value="ENVIADA">Enviada</option>
              <option value="APROVADA">Aprovada</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2>Competencias academicas</h2>
        <div className={styles.formGrid}>
          <Field label="Pesquisa juridica" name="competencia_pesquisa" type="number" min="1" max="5" />
          <Field label="Raciocinio juridico" name="competencia_raciocinio" type="number" min="1" max="5" />
          <Field label="Comunicacao" name="competencia_comunicacao" type="number" min="1" max="5" />
          <Field label="Etica" name="competencia_etica" type="number" min="1" max="5" />
          <Field label="Responsabilidade" name="competencia_responsabilidade" type="number" min="1" max="5" />
          <Field label="Conceito final" name="conceito_final" placeholder="Adequado, em desenvolvimento..." />
          <Field label="Parecer" name="parecer">
            <textarea name="parecer" rows={4} placeholder="Parecer academico sem ranking entre estudantes." />
          </Field>
          <Field label="Plano de desenvolvimento" name="plano_desenvolvimento">
            <textarea name="plano_desenvolvimento" rows={4} placeholder="Orientacoes para evolucao do estudante." />
          </Field>
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/avaliacoes">
        <button type="submit">Registrar avaliacao</button>
      </SubmitRow>
    </form>
  );
}

function ReportForm({ programs, classes, students }) {
  return (
    <form action={createInstitutionReportAction} className={styles.academicForm}>
      <section>
        <h2>Tipo e escopo</h2>
        <div className={styles.formGrid}>
          <Field label="Tipo de relatorio" name="tipo">
            <select name="tipo" defaultValue="RELATORIO_PROGRAMA">
              {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Titulo" name="titulo" placeholder="Relatorio mensal de pratica juridica" required />
          <Field label="Escopo" name="escopo">
            <select name="escopo" defaultValue="INSTITUICAO">
              <option value="INSTITUICAO">Instituicao</option>
              <option value="PROGRAMA">Programa</option>
              <option value="TURMA">Turma</option>
              <option value="ESTUDANTE">Estudante</option>
              <option value="AUDITORIA">Auditoria</option>
            </select>
          </Field>
          <Field label="Programa" name="programa_academico_id">
            <select name="programa_academico_id" defaultValue="">
              <option value="">Sem programa especifico</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Turma" name="turma_academica_id">
            <select name="turma_academica_id" defaultValue="">
              <option value="">Sem turma especifica</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>{classItem.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Estudante" name="estudante_vinculo_id">
            <select name="estudante_vinculo_id" defaultValue="">
              <option value="">Sem estudante especifico</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>{student.nome}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2>Periodo, versao e assinatura</h2>
        <div className={styles.formGrid}>
          <Field label="Data inicial" name="periodo_inicio" type="date" required />
          <Field label="Data final" name="periodo_fim" type="date" required />
          <Field label="Versao do template" name="template_version" type="number" min="1" defaultValue="1" />
          <Field label="Status" name="status">
            <select name="status" defaultValue="GERADO">
              <option value="GERADO">Gerado</option>
              <option value="PENDENTE_ASSINATURA">Pendente de assinatura</option>
              <option value="RASCUNHO">Rascunho</option>
            </select>
          </Field>
          <Field label="Assinatura" name="assinatura_status">
            <select name="assinatura_status" defaultValue="NAO_EXIGE">
              <option value="NAO_EXIGE">Nao exige</option>
              <option value="PENDENTE">Pendente</option>
              <option value="PARCIAL">Parcial</option>
            </select>
          </Field>
          <Field label="Assinaturas requeridas" name="assinaturas_requeridas" type="number" min="0" defaultValue="0" />
          <Field label="Formato para baixar agora" name="download_format">
            <select name="download_format" defaultValue="pdf">
              <option value="pdf">PDF estilizado</option>
              <option value="docx">Word DOCX</option>
              <option value="xlsx">Excel XLSX</option>
            </select>
          </Field>
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/relatorios">
        <button type="submit">Gerar e baixar</button>
      </SubmitRow>
    </form>
  );
}

function InstitutionUserForm({ programs }) {
  return (
    <form action={createInstitutionUserAction} className={styles.academicForm}>
      <section>
        <h2>Usuario institucional</h2>
        <div className={styles.formGrid}>
          <Field label="Nome completo" name="nome_completo" required />
          <Field label="E-mail" name="email" type="email" required />
          <Field label="Telefone" name="telefone" />
          <Field label="Cargo" name="cargo" />
          <Field label="Tipo de vinculo" name="tipo_vinculo">
            <select name="tipo_vinculo" defaultValue="OUTRO">
              <option value="REITOR">Reitor</option>
              <option value="DIRETOR">Diretor</option>
              <option value="COORDENADOR">Coordenador</option>
              <option value="GESTOR_NPJ">Gestor NPJ</option>
              <option value="RESPONSAVEL_ACADEMICO">Responsavel academico</option>
              <option value="RESPONSAVEL_ADMINISTRATIVO">Responsavel administrativo</option>
              <option value="OUTRO">Outro</option>
            </select>
          </Field>
          <Field label="Status inicial" name="status">
            <select name="status" defaultValue="CONVIDADO">
              <option value="CONVIDADO">Convidado</option>
              <option value="ATIVO">Ativo</option>
            </select>
          </Field>
        </div>
      </section>

      <section>
        <h2>Role e escopo</h2>
        <div className={styles.formGrid}>
          <Field label="Role" name="role">
            <select name="role" defaultValue="ORACULO_PROFESSOR_ORIENTADOR">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Programa academico" name="programa_academico_id">
            <select name="programa_academico_id" defaultValue="">
              <option value="">Toda a instituicao / sem escopo especifico</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.nome}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/usuarios">
        <button type="submit">Convidar usuario</button>
      </SubmitRow>
    </form>
  );
}

function InstitutionDataChangeForm() {
  return (
    <form action={requestInstitutionDataChangeAction} className={styles.academicForm}>
      <section>
        <h2>Solicitacao de alteracao</h2>
        <div className={styles.formGrid}>
          <Field label="Campo validado" name="campo" placeholder="CNPJ, razao social, representante legal..." required />
          <Field label="Valor atual" name="valor_atual" />
          <Field label="Valor solicitado" name="valor_solicitado" required />
          <Field label="Motivo" name="motivo">
            <textarea name="motivo" rows={4} required placeholder="Explique a necessidade e anexe documento em Documentos e Compliance se aplicavel." />
          </Field>
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/dados">
        <button type="submit">Solicitar alteracao</button>
      </SubmitRow>
    </form>
  );
}

function InstitutionDocumentForm({ programs }) {
  return (
    <form action={createInstitutionDocumentAction} className={styles.academicForm}>
      <section>
        <h2>Documento e contexto</h2>
        <div className={styles.formGrid}>
          <Field label="Titulo" name="titulo" required />
          <Field label="Codigo interno" name="codigo_interno" placeholder="DOC-2026-001" />
          <Field label="Categoria" name="categoria">
            <select name="categoria" defaultValue="OUTRO">
              <option value="CONTRATO">Contrato</option>
              <option value="CONVENIO">Convenio</option>
              <option value="SEGURO">Seguro</option>
              <option value="LGPD">LGPD</option>
              <option value="REGULATORIO">Regulatorio</option>
              <option value="NPJ">NPJ</option>
              <option value="SUPERVISAO">Supervisao</option>
              <option value="ORIENTACAO">Orientacao</option>
              <option value="OUTRO">Outro</option>
            </select>
          </Field>
          <Field label="Contexto" name="contexto_tipo">
            <select name="contexto_tipo" defaultValue="INSTITUICAO">
              <option value="INSTITUICAO">Instituicao</option>
              <option value="PROGRAMA">Programa</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ORIENTADOR">Orientador</option>
              <option value="CONVENIO">Convenio</option>
              <option value="CONTRATO">Contrato</option>
            </select>
          </Field>
          <Field label="Programa" name="programa_academico_id">
            <select name="programa_academico_id" defaultValue="">
              <option value="">Sem programa especifico</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Rotulo do contexto" name="contexto_label" placeholder="Instituicao, Pratica Juridica 2026/2..." />
        </div>
      </section>

      <section>
        <h2>Versao, validade e arquivo</h2>
        <div className={styles.formGrid}>
          <Field label="Versao" name="versao" type="number" min="1" defaultValue="1" />
          <Field label="Status" name="status">
            <select name="status" defaultValue="PENDENTE_VALIDACAO">
              <option value="PENDENTE_VALIDACAO">Pendente de validacao</option>
              <option value="VALIDO">Valido</option>
              <option value="VENCENDO">Vencendo</option>
              <option value="VENCIDO">Vencido</option>
            </select>
          </Field>
          <Field label="URL do arquivo" name="arquivo_url" placeholder="https://..." />
          <Field label="Validade inicial" name="validade_inicio" type="date" />
          <Field label="Validade final" name="validade_fim" type="date" />
          <Field label="Motivo da versao" name="motivo_nova_versao" placeholder="Primeira versao, renovacao, substituicao..." />
        </div>
      </section>

      <SubmitRow backHref="/dashboard/oraculoacademico/instituicao/documentos">
        <button type="submit">Registrar documento</button>
      </SubmitRow>
    </form>
  );
}

async function WizardPage({ section, action }) {
  const isProgram = section === "programas";
  const isClass = section === "turmas";
  const isStudent = section === "estudantes";
  const isSupervisor = section === "supervisores";
  const isOrientator = section === "orientadores";
  const isActivity = section === "atividades";
  const isEvaluation = section === "avaliacoes";
  const isReport = section === "relatorios";
  const isInstitutionUser = section === "usuarios";
  const isInstitutionDataChange = section === "dados";
  const isInstitutionDocument = section === "documentos";
  const title = isProgram
    ? "Novo programa academico"
    : isClass
      ? "Nova turma"
      : isSupervisor
        ? "Vincular supervisor juridico"
        : isOrientator
          ? "Vincular professor orientador"
          : isActivity
            ? "Registrar atividade academica"
            : isEvaluation
              ? "Registrar avaliacao academica"
              : isReport
                ? "Gerar relatorio institucional"
                : isInstitutionUser
                  ? "Convidar usuario institucional"
                  : isInstitutionDataChange
                    ? "Solicitar alteracao institucional"
                    : isInstitutionDocument
                      ? "Registrar documento institucional"
                      : "Vincular estudantes";
  const { programs, classes, students, activityTypes, institutionName } = await loadFormOptions();

  return (
    <main className={styles.academicPage}>
      <Link href={`/dashboard/oraculoacademico/instituicao/${section}`} className={styles.placeholderBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar
      </Link>
      <section className={styles.academicHeader}>
        <div>
          <span className={styles.kicker}>Cadastro operacional</span>
          <h1>{title}</h1>
          <p>
            Preencha os dados abaixo para gravar o registro diretamente no
            Supabase, com validacao de permissao e contexto institucional no servidor.
          </p>
        </div>
        <StatusBadge status={action === "vincular" ? "PENDENTE_VINCULO" : "RASCUNHO"} />
      </section>
      {isProgram && <ProgramForm />}
      {isClass && <ClassForm programs={programs} />}
      {isStudent && (
        <StudentLinkForm
          programs={programs}
          classes={classes}
          institutionName={institutionName}
        />
      )}
      {isSupervisor && <SupervisorForm />}
      {isOrientator && <OrientatorForm />}
      {isActivity && (
        <ActivityForm
          programs={programs}
          classes={classes}
          students={students}
          activityTypes={activityTypes}
        />
      )}
      {isEvaluation && (
        <EvaluationForm programs={programs} classes={classes} students={students} />
      )}
      {isReport && (
        <ReportForm programs={programs} classes={classes} students={students} />
      )}
      {isInstitutionUser && <InstitutionUserForm programs={programs} />}
      {isInstitutionDataChange && <InstitutionDataChangeForm />}
      {isInstitutionDocument && <InstitutionDocumentForm programs={programs} />}
    </main>
  );
}

function DetailPage({ section, id }) {
  const config = PAGE_CONFIG[section] || {};
  return (
    <main className={styles.academicPage}>
      <Link href={`/dashboard/oraculoacademico/instituicao/${section}`} className={styles.placeholderBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar
      </Link>
      <section className={styles.academicHeader}>
        <div>
          <span className={styles.kicker}>Detalhe institucional</span>
          <h1>{config.title || titleFromSlug(section)}</h1>
          <p>
            Detalhe roteado para <strong>{id}</strong>. As abas de visao geral,
            estudantes, carga horaria, relatorios e auditoria entram nesta base.
          </p>
        </div>
        <StatusBadge status="ATIVO" />
      </section>
      <SummaryCards
        cards={[
          ["Registro", "1", "Rota ativa"],
          ["Dados exibidos", "0", "Aguardando carga real do detalhe"],
          ["Pendencias", "0", "Sem calculo nesta visao"],
          ["Auditoria", "0", "Eventos do registro"],
        ]}
      />
      <section className={styles.academicPanel}>
        <h2>Abas previstas</h2>
        <div className={styles.tabPreview}>
          {["Visao Geral", "Turmas", "Estudantes", "Carga Horaria", "Avaliacao", "Relatorios", "Auditoria"].map((tab) => (
            <span key={tab}>{tab}</span>
          ))}
        </div>
      </section>
    </main>
  );
}

async function ListPage({ section }) {
  const config = PAGE_CONFIG[section];
  const Icon = config.icon;
  const rows = await loadAcademicRows(section);
  const candidates =
    section === "estudantes" ? await loadInstitutionCandidateQueue() : [];
  const cards = buildSummaryCards(section, rows);

  return (
    <main className={styles.academicPage}>
      <Link href="/dashboard/oraculoacademico/instituicao" className={styles.placeholderBack}>
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar para a visao geral
      </Link>

      <section className={styles.academicHeader}>
        <div>
          <span className={styles.kicker}>Gestao academica</span>
          <h1>
            <Icon size={28} aria-hidden="true" />
            {config.title}
          </h1>
          <p>{config.subtitle}</p>
        </div>
        <Link href={config.primaryHref} className={styles.academicPrimaryAction}>
          <Plus size={16} aria-hidden="true" />
          {config.primaryAction}
        </Link>
      </section>

      <SummaryCards cards={cards} />
      <FilterBar filters={config.filters} />
      {section === "estudantes" && (
        <CandidateDecisionQueue candidates={candidates} />
      )}
      <DataTable config={config} rows={rows} section={section} />
    </main>
  );
}

export default async function OraculoInstitutionSectionPage({ params }) {
  const { allowed } = await canAccessRoute();
  if (!allowed) redirect("/oraculoacademico/login");

  const { secao = [] } = await params;
  const [section, action] = secao;

  if (["novo", "nova", "vincular", "registrar", "solicitar-alteracao", "adicionar-estudantes"].includes(action)) {
    return <WizardPage section={section} action={action} />;
  }

  if (PAGE_CONFIG[section] && action) {
    return <DetailPage section={section} id={action} />;
  }

  if (PAGE_CONFIG[section]) {
    return <ListPage section={section} />;
  }

  return (
    <main className={styles.placeholderPage}>
      <section className={styles.placeholderPanel}>
        <Link href="/dashboard/oraculoacademico/instituicao" className={styles.placeholderBack}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar para a visao geral
        </Link>
        <div className={styles.placeholderIcon}>
          <Construction size={28} aria-hidden="true" />
        </div>
        <span className={styles.kicker}>Dashboard institucional</span>
        <h1>{titleFromSlug(section)}</h1>
        <p>Esta area esta roteada e aguarda a implementacao da tela definitiva.</p>
      </section>
    </main>
  );
}
