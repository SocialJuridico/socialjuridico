"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Landmark,
  Loader2,
  Plus,
  RefreshCw,
  Save,
} from "lucide-react";

import {
  ORACULO_CHECKLIST_ITEMS,
  ORACULO_INSTITUTION_STATUS_LABELS,
  ORACULO_INSTITUTION_STATUSES,
  ORACULO_PARTNERSHIP_MODALITY_LABELS,
  getRequiredChecklistKeys,
} from "@/lib/oraculoInstitutionRules";

import styles from "./InstituicoesAdmin.module.css";

const STEPS = [
  "Parceria",
  "Instituição",
  "Representantes",
  "Acadêmico/NPJ",
  "Supervisão",
  "Instrumentos",
  "LGPD/Auditoria",
  "Acesso",
];

const INITIAL_FORM = {
  id: null,
  nome: "",
  status: "RASCUNHO",
  nome_programa: "",
  modalidade_parceria: "",
  papel_social_juridico: "",
  modalidade_atividades: "",
  vinculado_npj: false,
  computa_horas_academicas: false,
  carga_horaria_max_semestre: "",
  periodo_minimo: "",
  max_alunos_ativos: "",
  parceria_inicio: "",
  parceria_fim: "",
  renovacao_automatica: false,
  razao_social: "",
  sigla: "",
  cnpj: "",
  codigo_emec_ies: "",
  organizacao_academica: "",
  categoria_administrativa: "",
  mantenedora_razao_social: "",
  mantenedora_cnpj: "",
  site_oficial: "",
  dominio_email: "",
  email_institucional: "",
  telefone_institucional: "",
  endereco: {},
  curso: {},
  estrutura_academica: {},
  instrumentos: {},
  lgpd: {},
  acesso_institucional: {
    primeiro_admin: {
      role: "ORACULO_INSTITUICAO_ADMIN",
      mfa_required: true,
      pode_convidar_usuarios: true,
      pode_gerenciar_roles: true,
      pode_acessar_auditoria: true,
      pode_visualizar_relatorios: true,
      pode_visualizar_conteudo_integral: false,
      pode_gerenciar_programas: true,
    },
  },
  dominio_institucional: "",
  dominio_institucional_validado: false,
  instituicao_mfa_policy: "ROLE_BASED",
  checklist_ativacao: {},
  observacoes_internas: "",
  pessoas: {
    representante_legal: {},
    coordenador_curso: {},
    coordenador_npj: {},
    professor_orientador: {},
    encarregado_lgpd: {},
  },
  supervisor_principal: {},
  historico_status: [],
};

const STATUS_ACTIONS = [
  { status: "PENDENTE_DOCUMENTOS", label: "Solicitar documentação" },
  { status: "EM_ANALISE_ACADEMICA", label: "Enviar para análise acadêmica" },
  { status: "EM_ANALISE_JURIDICA", label: "Enviar para análise jurídica" },
  { status: "PENDENTE_CONTRATO", label: "Marcar contrato pendente" },
  { status: "PENDENTE_LGPD", label: "Marcar LGPD pendente" },
  { status: "PENDENTE_OAB", label: "Marcar OAB pendente" },
  { status: "APROVADA", label: "Aprovar instituição" },
  { status: "ATIVA", label: "Ativar instituição" },
  { status: "SUSPENSA", label: "Suspender" },
  { status: "ENCERRADA", label: "Encerrar parceria" },
];

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }
  return payload;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function byRole(pessoas = [], role) {
  return pessoas.find((item) => item.papel === role) || {};
}

function fromInstitution(item) {
  if (!item) return INITIAL_FORM;
  return {
    ...INITIAL_FORM,
    ...item,
    endereco: item.endereco || {},
    curso: item.curso || {},
    estrutura_academica: item.estrutura_academica || {},
    instrumentos: item.instrumentos || {},
    lgpd: item.lgpd || {},
    acesso_institucional:
      item.acesso_institucional || INITIAL_FORM.acesso_institucional,
    dominio_institucional: item.dominio_institucional || "",
    dominio_institucional_validado:
      item.dominio_institucional_validado || false,
    instituicao_mfa_policy: item.instituicao_mfa_policy || "ROLE_BASED",
    checklist_ativacao: item.checklist_ativacao || {},
    pessoas: {
      representante_legal: byRole(item.pessoas, "REPRESENTANTE_LEGAL"),
      coordenador_curso: byRole(item.pessoas, "COORD_CURSO"),
      coordenador_npj: byRole(item.pessoas, "COORD_NPJ"),
      professor_orientador: byRole(item.pessoas, "PROFESSOR_ORIENTADOR"),
      encarregado_lgpd: byRole(item.pessoas, "ENCARREGADO_LGPD"),
    },
    supervisor_principal:
      item.supervisores_formais?.find((supervisor) => supervisor.principal) ||
      {},
    historico_status: item.historico_status || [],
  };
}

function Field({ label, value, onChange, type = "text", as = "input", children }) {
  const Component = as;
  const componentProps = {
    value: value || "",
    onChange: (event) => onChange(event.target.value),
  };
  if (as === "input") {
    componentProps.type = type;
  }

  return (
    <label className={styles.field}>
      <span>{label}</span>
      {as === "input" ? (
        <input {...componentProps} />
      ) : (
        <Component {...componentProps}>{children}</Component>
      )}
    </label>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className={styles.toggle}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export default function AdminInstituicoesPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [targetStatus, setTargetStatus] = useState("");
  const [motivo, setMotivo] = useState("");

  const loadItems = useCallback(async (keepSelectedId) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/instituicoes", {
        cache: "no-store",
      });
      const payload = await readJson(response);
      const nextItems = payload.data || [];
      setItems(nextItems);

      const selected =
        nextItems.find((item) => item.id === keepSelectedId) || nextItems[0];
      setForm(selected ? fromInstitution(selected) : INITIAL_FORM);
      setTargetStatus("");
      setMotivo("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao carregar instituições.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    if (statusFilter === "ALL") return items;
    return items.filter((item) => item.status === statusFilter);
  }, [items, statusFilter]);

  const requiredChecklist = useMemo(
    () => getRequiredChecklistKeys(form.modalidade_parceria),
    [form.modalidade_parceria],
  );

  const checklistDone = useMemo(
    () =>
      requiredChecklist.filter((key) => Boolean(form.checklist_ativacao?.[key]))
        .length,
    [form.checklist_ativacao, requiredChecklist],
  );

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateNested(group, field, value) {
    setForm((current) => ({
      ...current,
      [group]: { ...(current[group] || {}), [field]: value },
    }));
  }

  function updatePerson(key, field, value) {
    setForm((current) => ({
      ...current,
      pessoas: {
        ...current.pessoas,
        [key]: { ...(current.pessoas?.[key] || {}), [field]: value },
      },
    }));
  }

  function updateSupervisor(field, value) {
    setForm((current) => ({
      ...current,
      supervisor_principal: {
        ...(current.supervisor_principal || {}),
        [field]: value,
      },
    }));
  }

  function updateSupervisorPower(field, value) {
    setForm((current) => ({
      ...current,
      supervisor_principal: {
        ...(current.supervisor_principal || {}),
        poderes: {
          ...(current.supervisor_principal?.poderes || {}),
          [field]: value,
        },
      },
    }));
  }

  function updateAccessAdmin(field, value) {
    setForm((current) => ({
      ...current,
      acesso_institucional: {
        ...(current.acesso_institucional || {}),
        primeiro_admin: {
          ...(current.acesso_institucional?.primeiro_admin || {}),
          [field]: value,
        },
      },
    }));
  }

  function selectItem(item) {
    setForm(fromInstitution(item));
    setStep(0);
    setTargetStatus("");
    setMotivo("");
  }

  function newDossier() {
    setForm(INITIAL_FORM);
    setStep(0);
    setTargetStatus("");
    setMotivo("");
  }

  function buildPayload(statusOverride) {
    return {
      ...form,
      status: statusOverride || form.status || "RASCUNHO",
      motivo: statusOverride && statusOverride !== form.status ? motivo : null,
    };
  }

  async function save(statusOverride) {
    if (saving) return;
    if (form.nome.trim().length < 3) {
      toast.error("Informe o nome da instituição.");
      return;
    }
    if (statusOverride && statusOverride !== form.status && !motivo.trim()) {
      toast.error("Informe o motivo da ação administrativa.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Salvando dossiê institucional...");
    try {
      const response = await fetch(
        form.id ? `/api/admin/instituicoes/${form.id}` : "/api/admin/instituicoes",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload(statusOverride)),
        },
      );
      const payload = await readJson(response);
      toast.success(payload.message, { id: toastId });
      await loadItems(payload.id || form.id);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar instituição.",
        { id: toastId },
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Onboarding institucional</span>
            <h1>
              <Landmark size={22} aria-hidden="true" />
              Instituições de Ensino - Oráculo Acadêmico
            </h1>
            <p>
              Cadastro exclusivo do administrador: dossiê acadêmico, jurídico,
              compliance, supervisão formal, regras de estágio e histórico de
              decisão.
            </p>
          </div>
          <button type="button" className={styles.createBtn} onClick={newDossier}>
            <Plus size={15} aria-hidden="true" />
            Novo dossiê
          </button>
        </header>

        <div className={styles.workspace}>
          <aside className={styles.queue}>
            <div className={styles.queueHeader}>
              <strong>Fila</strong>
              <button type="button" onClick={() => loadItems(form.id)}>
                <RefreshCw size={14} aria-hidden="true" />
              </button>
            </div>

            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="ALL">Todos os status</option>
              {ORACULO_INSTITUTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ORACULO_INSTITUTION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>

            {loading ? (
              <div className={styles.emptyState}>
                <Loader2 size={22} className={styles.spinner} />
                Carregando...
              </div>
            ) : filteredItems.length ? (
              <div className={styles.queueList}>
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.queueItem} ${
                      form.id === item.id ? styles.queueItemActive : ""
                    }`}
                    onClick={() => selectItem(item)}
                  >
                    <strong>{item.nome}</strong>
                    <span>{ORACULO_INSTITUTION_STATUS_LABELS[item.status]}</span>
                    <small>Criada em {formatDate(item.created_at)}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>Nenhuma instituição neste filtro.</div>
            )}
          </aside>

          <section className={styles.editor}>
            <div className={styles.editorTop}>
              <div>
                <span className={styles.statusBadge} data-status={form.status}>
                  {ORACULO_INSTITUTION_STATUS_LABELS[form.status] || form.status}
                </span>
                <h2>{form.id ? form.nome : "Novo dossiê institucional"}</h2>
              </div>
              <div className={styles.progressPill}>
                <FileCheck2 size={16} aria-hidden="true" />
                {checklistDone}/{requiredChecklist.length} checklist
              </div>
            </div>

            <div className={styles.steps}>
              {STEPS.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={index === step ? styles.stepActive : ""}
                  onClick={() => setStep(index)}
                >
                  {index + 1}. {label}
                </button>
              ))}
            </div>

            <div className={styles.card}>
              {step === 0 && (
                <div className={styles.grid}>
                  <Field label="Nome interno do programa" value={form.nome_programa} onChange={(value) => update("nome_programa", value)} />
                  <Field label="Nome público/instituição" value={form.nome} onChange={(value) => update("nome", value)} />
                  <Field label="Modalidade da parceria" value={form.modalidade_parceria} onChange={(value) => update("modalidade_parceria", value)} as="select">
                    <option value="">Selecione</option>
                    {Object.entries(ORACULO_PARTNERSHIP_MODALITY_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Field>
                  <Field label="Papel do Social Jurídico" value={form.papel_social_juridico} onChange={(value) => update("papel_social_juridico", value)} as="select">
                    <option value="">Selecione</option>
                    <option value="INFRAESTRUTURA">Infraestrutura tecnológica</option>
                    <option value="APOIO_NPJ">Apoio tecnológico ao NPJ</option>
                    <option value="AGENTE_INTEGRACAO">Agente de integração</option>
                    <option value="PARTE_CONCEDENTE">Parte concedente do estágio</option>
                  </Field>
                  <Field label="Modalidade das atividades" value={form.modalidade_atividades} onChange={(value) => update("modalidade_atividades", value)} as="select">
                    <option value="">Selecione</option>
                    <option value="REMOTA">Remota</option>
                    <option value="HIBRIDA">Híbrida</option>
                    <option value="PRESENCIAL">Presencial</option>
                  </Field>
                  <Field label="Período mínimo permitido" value={form.periodo_minimo} onChange={(value) => update("periodo_minimo", value)} />
                  <Field label="Carga máxima por semestre" value={form.carga_horaria_max_semestre} onChange={(value) => update("carga_horaria_max_semestre", value)} type="number" />
                  <Field label="Máximo de alunos ativos" value={form.max_alunos_ativos} onChange={(value) => update("max_alunos_ativos", value)} type="number" />
                  <Field label="Início da parceria" value={form.parceria_inicio} onChange={(value) => update("parceria_inicio", value)} type="date" />
                  <Field label="Encerramento da parceria" value={form.parceria_fim} onChange={(value) => update("parceria_fim", value)} type="date" />
                  <Toggle label="Vinculado ao NPJ" checked={form.vinculado_npj} onChange={(value) => update("vinculado_npj", value)} />
                  <Toggle label="Computa horas acadêmicas" checked={form.computa_horas_academicas} onChange={(value) => update("computa_horas_academicas", value)} />
                  <Toggle label="Renovação automática" checked={form.renovacao_automatica} onChange={(value) => update("renovacao_automatica", value)} />
                </div>
              )}

              {step === 1 && (
                <div className={styles.grid}>
                  <Field label="Razão social" value={form.razao_social} onChange={(value) => update("razao_social", value)} />
                  <Field label="Sigla" value={form.sigla} onChange={(value) => update("sigla", value)} />
                  <Field label="CNPJ" value={form.cnpj} onChange={(value) => update("cnpj", value)} />
                  <Field label="Código da IES no e-MEC" value={form.codigo_emec_ies} onChange={(value) => update("codigo_emec_ies", value)} />
                  <Field label="Organização acadêmica" value={form.organizacao_academica} onChange={(value) => update("organizacao_academica", value)} />
                  <Field label="Categoria administrativa" value={form.categoria_administrativa} onChange={(value) => update("categoria_administrativa", value)} />
                  <Field label="Mantenedora" value={form.mantenedora_razao_social} onChange={(value) => update("mantenedora_razao_social", value)} />
                  <Field label="CNPJ da mantenedora" value={form.mantenedora_cnpj} onChange={(value) => update("mantenedora_cnpj", value)} />
                  <Field label="Site oficial" value={form.site_oficial} onChange={(value) => update("site_oficial", value)} />
                  <Field label="Domínio institucional" value={form.dominio_email} onChange={(value) => update("dominio_email", value)} />
                  <Field label="E-mail institucional" value={form.email_institucional} onChange={(value) => update("email_institucional", value)} />
                  <Field label="Telefone institucional" value={form.telefone_institucional} onChange={(value) => update("telefone_institucional", value)} />
                  <Field label="CEP" value={form.endereco.cep} onChange={(value) => updateNested("endereco", "cep", value)} />
                  <Field label="Cidade" value={form.endereco.cidade} onChange={(value) => updateNested("endereco", "cidade", value)} />
                  <Field label="Estado" value={form.endereco.estado} onChange={(value) => updateNested("endereco", "estado", value)} />
                  <Field label="Curso de Direito - código e-MEC" value={form.curso.codigo_emec_curso} onChange={(value) => updateNested("curso", "codigo_emec_curso", value)} />
                  <Field label="Nome oficial do curso" value={form.curso.nome_curso} onChange={(value) => updateNested("curso", "nome_curso", value)} />
                  <Field label="Campus" value={form.curso.campus} onChange={(value) => updateNested("curso", "campus", value)} />
                  <Field label="Status regulatório" value={form.curso.status_regulatorio} onChange={(value) => updateNested("curso", "status_regulatorio", value)} />
                </div>
              )}

              {step === 2 && (
                <div className={styles.grid}>
                  <h3 className={styles.groupTitle}>Representante legal</h3>
                  <Field label="Nome" value={form.pessoas.representante_legal.nome} onChange={(value) => updatePerson("representante_legal", "nome", value)} />
                  <Field label="CPF" value={form.pessoas.representante_legal.cpf} onChange={(value) => updatePerson("representante_legal", "cpf", value)} />
                  <Field label="Cargo" value={form.pessoas.representante_legal.cargo} onChange={(value) => updatePerson("representante_legal", "cargo", value)} />
                  <Field label="E-mail" value={form.pessoas.representante_legal.email} onChange={(value) => updatePerson("representante_legal", "email", value)} />
                  <Field label="Telefone" value={form.pessoas.representante_legal.telefone} onChange={(value) => updatePerson("representante_legal", "telefone", value)} />
                  <h3 className={styles.groupTitle}>Coordenação e orientação</h3>
                  <Field label="Coordenador do curso" value={form.pessoas.coordenador_curso.nome} onChange={(value) => updatePerson("coordenador_curso", "nome", value)} />
                  <Field label="E-mail do coordenador" value={form.pessoas.coordenador_curso.email} onChange={(value) => updatePerson("coordenador_curso", "email", value)} />
                  <Field label="Coordenador NPJ/estágio" value={form.pessoas.coordenador_npj.nome} onChange={(value) => updatePerson("coordenador_npj", "nome", value)} />
                  <Field label="Professor orientador" value={form.pessoas.professor_orientador.nome} onChange={(value) => updatePerson("professor_orientador", "nome", value)} />
                  <Field label="E-mail do orientador" value={form.pessoas.professor_orientador.email} onChange={(value) => updatePerson("professor_orientador", "email", value)} />
                </div>
              )}

              {step === 3 && (
                <div className={styles.grid}>
                  <Toggle label="Instituição possui NPJ" checked={form.estrutura_academica.possui_npj} onChange={(value) => updateNested("estrutura_academica", "possui_npj", value)} />
                  <Field label="Nome oficial do NPJ" value={form.estrutura_academica.nome_npj} onChange={(value) => updateNested("estrutura_academica", "nome_npj", value)} />
                  <Field label="Endereço do NPJ" value={form.estrutura_academica.endereco_npj} onChange={(value) => updateNested("estrutura_academica", "endereco_npj", value)} />
                  <Toggle label="NPJ possui regulamento próprio" checked={form.estrutura_academica.npj_regulamento_proprio} onChange={(value) => updateNested("estrutura_academica", "npj_regulamento_proprio", value)} />
                  <Field label="Períodos autorizados" value={form.estrutura_academica.periodos_autorizados} onChange={(value) => updateNested("estrutura_academica", "periodos_autorizados", value)} />
                  <Field label="Carga mínima exigida" value={form.estrutura_academica.carga_min} onChange={(value) => updateNested("estrutura_academica", "carga_min", value)} type="number" />
                  <Field label="Carga máxima reconhecida" value={form.estrutura_academica.carga_max} onChange={(value) => updateNested("estrutura_academica", "carga_max", value)} type="number" />
                  <Field label="Máximo por turma" value={form.estrutura_academica.max_alunos_turma} onChange={(value) => updateNested("estrutura_academica", "max_alunos_turma", value)} type="number" />
                  <Field label="Periodicidade relatório (meses, máx. 6)" value={form.estrutura_academica.periodicidade_relatorio_meses} onChange={(value) => updateNested("estrutura_academica", "periodicidade_relatorio_meses", value)} type="number" />
                  <Field label="Sistema de notas" value={form.estrutura_academica.sistema_notas} onChange={(value) => updateNested("estrutura_academica", "sistema_notas", value)} />
                  <Field label="Períodos de avaliação" value={form.estrutura_academica.periodos_avaliacao} onChange={(value) => updateNested("estrutura_academica", "periodos_avaliacao", value)} as="textarea" />
                </div>
              )}

              {step === 4 && (
                <div className={styles.grid}>
                  <div className={styles.notice}>
                    Padrinho é mentoria individual. Supervisor formal é vínculo
                    acadêmico do programa e só vale após designação e validação.
                  </div>
                  <Field label="Nome do supervisor principal" value={form.supervisor_principal.nome} onChange={(value) => updateSupervisor("nome", value)} />
                  <Field label="CPF" value={form.supervisor_principal.cpf} onChange={(value) => updateSupervisor("cpf", value)} />
                  <Field label="E-mail" value={form.supervisor_principal.email} onChange={(value) => updateSupervisor("email", value)} />
                  <Field label="Telefone" value={form.supervisor_principal.telefone} onChange={(value) => updateSupervisor("telefone", value)} />
                  <Field label="Número OAB" value={form.supervisor_principal.oab_numero} onChange={(value) => updateSupervisor("oab_numero", value)} />
                  <Field label="UF OAB" value={form.supervisor_principal.oab_uf} onChange={(value) => updateSupervisor("oab_uf", value)} />
                  <Field label="Data inscrição OAB" value={form.supervisor_principal.oab_inscricao_em} onChange={(value) => updateSupervisor("oab_inscricao_em", value)} type="date" />
                  <Field label="Anos de OAB (validação OAB)" value={form.supervisor_principal.poderes?.oab_anos_experiencia} onChange={(value) => updateSupervisorPower("oab_anos_experiencia", value)} type="number" />
                  <Field label="Vínculo" value={form.supervisor_principal.vinculo} onChange={(value) => updateSupervisor("vinculo", value)} as="select">
                    <option value="">Selecione</option>
                    <option value="INSTITUICAO">Instituição</option>
                    <option value="NPJ">NPJ</option>
                    <option value="SOCIAL_JURIDICO">Social Jurídico</option>
                    <option value="PARTE_CONCEDENTE">Parte concedente</option>
                  </Field>
                  <Field label="Máximo supervisionados" value={form.supervisor_principal.max_estudantes} onChange={(value) => updateSupervisor("max_estudantes", value)} type="number" />
                  <Toggle label="Pode revisar atividades" checked={form.supervisor_principal.poderes?.revisar} onChange={(value) => updateSupervisorPower("revisar", value)} />
                  <Toggle label="Pode aprovar atividades" checked={form.supervisor_principal.poderes?.aprovar} onChange={(value) => updateSupervisorPower("aprovar", value)} />
                  <Toggle label="Pode reprovar atividades" checked={form.supervisor_principal.poderes?.reprovar} onChange={(value) => updateSupervisorPower("reprovar", value)} />
                  <Toggle label="Pode solicitar correção" checked={form.supervisor_principal.poderes?.corrigir} onChange={(value) => updateSupervisorPower("corrigir", value)} />
                </div>
              )}

              {step === 5 && (
                <div className={styles.grid}>
                  <Field label="Número contrato/parceria" value={form.instrumentos.numero_contrato} onChange={(value) => updateNested("instrumentos", "numero_contrato", value)} />
                  <Field label="Número convênio" value={form.instrumentos.numero_convenio} onChange={(value) => updateNested("instrumentos", "numero_convenio", value)} />
                  <Field label="Vigência inicial" value={form.instrumentos.contrato_inicio} onChange={(value) => updateNested("instrumentos", "contrato_inicio", value)} type="date" />
                  <Field label="Vigência final" value={form.instrumentos.contrato_fim} onChange={(value) => updateNested("instrumentos", "contrato_fim", value)} type="date" />
                  <Field label="Responsável interno contrato" value={form.instrumentos.responsavel_contrato} onChange={(value) => updateNested("instrumentos", "responsavel_contrato", value)} />
                  <Field label="Horas diárias máximas" value={form.instrumentos.horas_dia} onChange={(value) => updateNested("instrumentos", "horas_dia", value)} type="number" />
                  <Field label="Horas semanais máximas" value={form.instrumentos.horas_semana} onChange={(value) => updateNested("instrumentos", "horas_semana", value)} type="number" />
                  <Field label="Horário permitido" value={form.instrumentos.horario_permitido} onChange={(value) => updateNested("instrumentos", "horario_permitido", value)} />
                  <Toggle label="Reduz carga durante avaliações" checked={form.instrumentos.reduz_avaliacao} onChange={(value) => updateNested("instrumentos", "reduz_avaliacao", value)} />
                  <Field label="Percentual de redução" value={form.instrumentos.reducao_percent} onChange={(value) => updateNested("instrumentos", "reducao_percent", value)} type="number" />
                  <Field label="Responsável pelo seguro" value={form.instrumentos.seguro_responsavel} onChange={(value) => updateNested("instrumentos", "seguro_responsavel", value)} />
                  <Field label="Seguradora" value={form.instrumentos.seguradora} onChange={(value) => updateNested("instrumentos", "seguradora", value)} />
                  <Field label="Número da apólice" value={form.instrumentos.apolice} onChange={(value) => updateNested("instrumentos", "apolice", value)} />
                  <Field label="Vencimento da apólice" value={form.instrumentos.seguro_fim} onChange={(value) => updateNested("instrumentos", "seguro_fim", value)} type="date" />
                  {form.modalidade_parceria === "ESTAGIO_NAO_OBRIGATORIO" && (
                    <>
                      <Field label="Valor da bolsa" value={form.instrumentos.bolsa_valor} onChange={(value) => updateNested("instrumentos", "bolsa_valor", value)} />
                      <Field label="Auxílio-transporte" value={form.instrumentos.auxilio_transporte} onChange={(value) => updateNested("instrumentos", "auxilio_transporte", value)} />
                    </>
                  )}
                  {form.modalidade_parceria === "ESTAGIO_OAB" && (
                    <>
                      <Field label="Seccional OAB" value={form.instrumentos.oab_seccional} onChange={(value) => updateNested("instrumentos", "oab_seccional", value)} />
                      <Field label="Validade credenciamento" value={form.instrumentos.validade_credenciamento} onChange={(value) => updateNested("instrumentos", "validade_credenciamento", value)} type="date" />
                    </>
                  )}
                </div>
              )}

              {step === 6 && (
                <div className={styles.grid}>
                  <Toggle label="Possui encarregado/canal de privacidade" checked={form.lgpd.possui_encarregado} onChange={(value) => updateNested("lgpd", "possui_encarregado", value)} />
                  <Field label="Encarregado LGPD" value={form.pessoas.encarregado_lgpd.nome} onChange={(value) => updatePerson("encarregado_lgpd", "nome", value)} />
                  <Field label="E-mail privacidade" value={form.pessoas.encarregado_lgpd.email} onChange={(value) => updatePerson("encarregado_lgpd", "email", value)} />
                  <Field label="E-mail incidentes" value={form.lgpd.incidentes_email} onChange={(value) => updateNested("lgpd", "incidentes_email", value)} />
                  <Field label="Prazo comunicação incidentes" value={form.lgpd.prazo_comunicacao} onChange={(value) => updateNested("lgpd", "prazo_comunicacao", value)} />
                  <Field label="Papel preliminar da instituição" value={form.lgpd.papel_instituicao} onChange={(value) => updateNested("lgpd", "papel_instituicao", value)} />
                  <Field label="Papel preliminar do Social Jurídico" value={form.lgpd.papel_social_juridico} onChange={(value) => updateNested("lgpd", "papel_social_juridico", value)} />
                  <Field label="Finalidades autorizadas" value={form.lgpd.finalidades} onChange={(value) => updateNested("lgpd", "finalidades", value)} as="textarea" />
                  <Field label="Perfis autorizados" value={form.lgpd.perfis_autorizados} onChange={(value) => updateNested("lgpd", "perfis_autorizados", value)} as="textarea" />
                  <Field label="Regra pós-contrato" value={form.lgpd.regra_pos_contrato} onChange={(value) => updateNested("lgpd", "regra_pos_contrato", value)} />
                  <Toggle label="Instituição acessa auditoria dos próprios estudantes" checked={form.lgpd.acesso_auditoria} onChange={(value) => updateNested("lgpd", "acesso_auditoria", value)} />
                  <Toggle label="Autoriza métricas anonimizadas" checked={form.lgpd.autoriza_metricas} onChange={(value) => updateNested("lgpd", "autoriza_metricas", value)} />
                  <Toggle label="Autoriza uso do nome" checked={form.lgpd.autoriza_nome} onChange={(value) => updateNested("lgpd", "autoriza_nome", value)} />
                  <Toggle label="Autoriza uso de marca/logotipo" checked={form.lgpd.autoriza_marca} onChange={(value) => updateNested("lgpd", "autoriza_marca", value)} />
                </div>
              )}

              {step === 7 && (
                <div className={styles.grid}>
                  <div className={styles.notice}>
                    A instituição não recebe senha compartilhada. O primeiro
                    administrador institucional receberá um convite individual
                    quando a instituição for ativada.
                  </div>
                  <Field label="Nome completo" value={form.acesso_institucional?.primeiro_admin?.nome} onChange={(value) => updateAccessAdmin("nome", value)} />
                  <Field label="CPF" value={form.acesso_institucional?.primeiro_admin?.cpf} onChange={(value) => updateAccessAdmin("cpf", value)} />
                  <Field label="Cargo" value={form.acesso_institucional?.primeiro_admin?.cargo} onChange={(value) => updateAccessAdmin("cargo", value)} />
                  <Field label="E-mail institucional" value={form.acesso_institucional?.primeiro_admin?.email} onChange={(value) => updateAccessAdmin("email", value)} />
                  <Field label="Telefone" value={form.acesso_institucional?.primeiro_admin?.telefone} onChange={(value) => updateAccessAdmin("telefone", value)} />
                  <Field label="Tipo de vínculo" value={form.acesso_institucional?.primeiro_admin?.tipo_vinculo} onChange={(value) => updateAccessAdmin("tipo_vinculo", value)} as="select">
                    <option value="">Selecione</option>
                    <option value="REITOR">Reitor</option>
                    <option value="DIRETOR">Diretor</option>
                    <option value="COORDENADOR">Coordenador</option>
                    <option value="GESTOR_NPJ">Gestor do NPJ</option>
                    <option value="RESPONSAVEL_ACADEMICO">Responsável acadêmico</option>
                    <option value="RESPONSAVEL_ADMINISTRATIVO">Responsável administrativo</option>
                    <option value="OUTRO">Outro</option>
                  </Field>
                  <Field label="Descrição se outro" value={form.acesso_institucional?.primeiro_admin?.tipo_vinculo_descricao} onChange={(value) => updateAccessAdmin("tipo_vinculo_descricao", value)} />
                  <Field label="Role inicial" value={form.acesso_institucional?.primeiro_admin?.role || "ORACULO_INSTITUICAO_ADMIN"} onChange={(value) => updateAccessAdmin("role", value)} as="select">
                    <option value="ORACULO_INSTITUICAO_ADMIN">Administrador institucional</option>
                    <option value="ORACULO_COORDENADOR_CURSO">Coordenador do curso</option>
                    <option value="ORACULO_COORDENADOR_NPJ">Coordenador do NPJ</option>
                    <option value="ORACULO_PROFESSOR_ORIENTADOR">Professor orientador</option>
                    <option value="ORACULO_SUPERVISOR_JURIDICO">Supervisor jurídico</option>
                  </Field>
                  <Field label="Domínio institucional" value={form.dominio_institucional || form.dominio_email} onChange={(value) => update("dominio_institucional", value)} />
                  <Field label="Política MFA da instituição" value={form.instituicao_mfa_policy} onChange={(value) => update("instituicao_mfa_policy", value)} as="select">
                    <option value="ROLE_BASED">Por role</option>
                    <option value="ALL_USERS">Todos os usuários</option>
                  </Field>
                  <Toggle label="Domínio institucional validado" checked={form.dominio_institucional_validado} onChange={(value) => update("dominio_institucional_validado", value)} />
                  <Toggle label="MFA obrigatório" checked={form.acesso_institucional?.primeiro_admin?.mfa_required ?? true} onChange={(value) => updateAccessAdmin("mfa_required", value)} />
                  <Toggle label="Pode convidar usuários institucionais" checked={form.acesso_institucional?.primeiro_admin?.pode_convidar_usuarios ?? true} onChange={(value) => updateAccessAdmin("pode_convidar_usuarios", value)} />
                  <Toggle label="Pode gerenciar roles" checked={form.acesso_institucional?.primeiro_admin?.pode_gerenciar_roles ?? true} onChange={(value) => updateAccessAdmin("pode_gerenciar_roles", value)} />
                  <Toggle label="Pode acessar auditoria institucional" checked={form.acesso_institucional?.primeiro_admin?.pode_acessar_auditoria ?? true} onChange={(value) => updateAccessAdmin("pode_acessar_auditoria", value)} />
                  <Toggle label="Pode visualizar relatórios acadêmicos" checked={form.acesso_institucional?.primeiro_admin?.pode_visualizar_relatorios ?? true} onChange={(value) => updateAccessAdmin("pode_visualizar_relatorios", value)} />
                  <Toggle label="Pode visualizar conteúdo integral dos atendimentos" checked={form.acesso_institucional?.primeiro_admin?.pode_visualizar_conteudo_integral} onChange={(value) => updateAccessAdmin("pode_visualizar_conteudo_integral", value)} />
                  <Toggle label="Pode gerenciar programas acadêmicos" checked={form.acesso_institucional?.primeiro_admin?.pode_gerenciar_programas ?? true} onChange={(value) => updateAccessAdmin("pode_gerenciar_programas", value)} />
                </div>
              )}
            </div>

            <section className={styles.validation}>
              <div>
                <h3>Validação administrativa e ativação</h3>
                <p>
                  Regras condicionais são conferidas no backend. Itens OAB e
                  seguro só entram como obrigatórios quando a modalidade exigir.
                </p>
              </div>
              <div className={styles.checklist}>
                {ORACULO_CHECKLIST_ITEMS.map((item) => {
                  const required = requiredChecklist.includes(item.key);
                  return (
                    <Toggle
                      key={item.key}
                      label={`${item.label}${required ? "" : " (não aplicável)"}`}
                      checked={form.checklist_ativacao?.[item.key]}
                      onChange={(value) =>
                        updateNested("checklist_ativacao", item.key, value)
                      }
                    />
                  );
                })}
              </div>
            </section>

            <section className={styles.actionsPanel}>
              <Field label="Observações internas" value={form.observacoes_internas} onChange={(value) => update("observacoes_internas", value)} as="textarea" />
              <Field label="Motivo da ação sensível" value={motivo} onChange={setMotivo} as="textarea" />
              <div className={styles.actionRow}>
                <button type="button" className={styles.saveBtn} onClick={() => save()} disabled={saving}>
                  {saving ? <Loader2 size={15} className={styles.spinner} /> : <Save size={15} />}
                  Salvar rascunho/dossiê
                </button>
                <select value={targetStatus} onChange={(event) => setTargetStatus(event.target.value)}>
                  <option value="">Ação administrativa</option>
                  {STATUS_ACTIONS.map((action) => (
                    <option key={action.status} value={action.status}>
                      {action.label}
                    </option>
                  ))}
                </select>
                <button type="button" className={styles.approveBtn} onClick={() => save(targetStatus)} disabled={!targetStatus || saving}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Executar ação
                </button>
              </div>
            </section>

            {form.historico_status?.length > 0 && (
              <section className={styles.history}>
                <h3>Histórico de status</h3>
                {form.historico_status.slice(0, 6).map((entry) => (
                  <div key={entry.id} className={styles.historyItem}>
                    <strong>
                      {entry.de_status || "Início"} → {entry.para_status}
                    </strong>
                    <span>{formatDate(entry.created_at)} - {entry.motivo || "Sem motivo registrado"}</span>
                  </div>
                ))}
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
