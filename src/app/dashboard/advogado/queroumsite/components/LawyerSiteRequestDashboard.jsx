"use client";

import {
  AlertTriangle,
  AppWindow,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clock3,
  Code2,
  Globe2,
  LayoutDashboard,
  Loader2,
  Mail,
  MessageCircle,
  MonitorSmartphone,
  RefreshCw,
  Rocket,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { SITE_PROJECTS } from "@/lib/siteRequests/siteRequestValidation";
import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../QueroUmSite.module.css";
import { useLawyerSiteRequest } from "../useLawyerSiteRequest";

const PROJECT_ICONS = {
  LANDING_PAGE: Rocket,
  SITE_INSTITUCIONAL: Globe2,
  SISTEMA_SOB_MEDIDA: LayoutDashboard,
  PRODUTO_COMPLETO: MonitorSmartphone,
  OUTRO: Code2,
};

const FEATURE_OPTIONS = [
  ["WHATSAPP", "Botão de WhatsApp"],
  ["CONTACT_FORM", "Formulário de contato"],
  ["BLOG", "Blog jurídico"],
  ["CLIENT_AREA", "Área do cliente"],
  ["ONLINE_SCHEDULING", "Agendamento online"],
  ["PAYMENTS", "Pagamentos"],
  ["ADMIN_PANEL", "Painel administrativo"],
  ["MOBILE_APP", "Aplicativo mobile"],
  ["SEO", "SEO para Google"],
  ["OTHER", "Outro recurso"],
];

const STATUS_LABELS = {
  NEW: ["Solicitação recebida", "statusNew"],
  CONTACTED: ["Contato iniciado", "statusContacted"],
  QUALIFIED: ["Em análise técnica", "statusQualified"],
  PROPOSAL_SENT: ["Proposta enviada", "statusProposal"],
  CONVERTED: ["Projeto aprovado", "statusConverted"],
  CLOSED: ["Solicitação encerrada", "statusClosed"],
};

const DEADLINE_LABELS = {
  UP_TO_7_DAYS: "Até 7 dias",
  UP_TO_30_DAYS: "Até 30 dias",
  UP_TO_60_DAYS: "Até 60 dias",
  FLEXIBLE: "Prazo flexível",
};

const BUDGET_LABELS = {
  UP_TO_500: "Até R$ 500",
  FROM_500_TO_1500: "De R$ 500 a R$ 1.500",
  FROM_1500_TO_6000: "De R$ 1.500 a R$ 6.000",
  ABOVE_6000: "Acima de R$ 6.000",
  TO_DEFINE: "Ainda não definido",
};

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function FieldError({ message }) {
  return message ? <small className={styles.fieldError}>{message}</small> : null;
}

function ProjectCard({ type, selected, onSelect }) {
  const project = SITE_PROJECTS[type];
  const Icon = PROJECT_ICONS[type];

  return (
    <article className={`${styles.projectCard} ${selected ? styles.projectCardSelected : ""}`}>
      <header>
        <span className={styles.projectIcon}>
          <Icon size={22} />
        </span>
        {selected && (
          <span className={styles.selectedBadge}>
            <Check size={13} /> Selecionado
          </span>
        )}
      </header>
      <h3>{project.title}</h3>
      <strong>{project.priceLabel}</strong>
      <p>{project.description}</p>
      <ul>
        {project.highlights.map((item) => (
          <li key={item}>
            <CheckCircle2 size={14} /> {item}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onSelect(type)}>
        Escolher este projeto <ArrowRight size={15} />
      </button>
    </article>
  );
}

function RecentRequests({ controller }) {
  if (controller.loading) {
    return (
      <div className={styles.historyState}>
        <Loader2 size={22} className={styles.spinner} />
        <span>Carregando solicitações...</span>
      </div>
    );
  }

  if (controller.error) {
    return (
      <div className={styles.historyState}>
        <AlertTriangle size={23} />
        <span>{controller.error}</span>
        <button type="button" onClick={controller.reload}>
          <RefreshCw size={14} /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!controller.requests.length) {
    return (
      <div className={styles.historyState}>
        <BriefcaseBusiness size={24} />
        <span>Você ainda não enviou nenhuma solicitação.</span>
      </div>
    );
  }

  return (
    <div className={styles.historyList}>
      {controller.requests.map((item) => {
        const [label, className] = STATUS_LABELS[item.status] || STATUS_LABELS.NEW;
        return (
          <article key={item.id} className={styles.historyCard}>
            <div>
              <span className={`${styles.statusBadge} ${styles[className]}`}>{label}</span>
              <time>{formatDate(item.createdAt)}</time>
            </div>
            <h4>{item.project?.title || "Projeto digital"}</h4>
            <p>{item.objective}</p>
            <footer>
              <span>
                <Clock3 size={13} /> {DEADLINE_LABELS[item.deadline] || "Prazo a definir"}
              </span>
              <span>{BUDGET_LABELS[item.budgetRange] || "Investimento a definir"}</span>
              <button
                type="button"
                onClick={() => controller.openContact(item)}
                disabled={controller.contactingId === item.id}
              >
                {controller.contactingId === item.id ? (
                  <Loader2 size={14} className={styles.spinner} />
                ) : (
                  <MessageCircle size={14} />
                )}
                Falar sobre esta solicitação
              </button>
            </footer>
          </article>
        );
      })}
    </div>
  );
}

function SuccessPanel({ request, onClose, onContact, loading }) {
  if (!request) return null;

  return (
    <div className={styles.successPanel}>
      <button type="button" className={styles.successClose} onClick={onClose}>
        <X size={18} />
      </button>
      <span className={styles.successIcon}>
        <CheckCircle2 size={30} />
      </span>
      <div>
        <h3>Solicitação enviada com sucesso</h3>
        <p>
          O projeto <strong>{request.project?.title || "selecionado"}</strong> foi
          registrado para análise. Você pode continuar a conversa pelo WhatsApp.
        </p>
      </div>
      {request.contactAvailable && (
        <button type="button" onClick={() => onContact(request)} disabled={loading}>
          {loading ? <Loader2 size={16} className={styles.spinner} /> : <MessageCircle size={16} />}
          Abrir WhatsApp
        </button>
      )}
    </div>
  );
}

export default function LawyerSiteRequestDashboard() {
  const controller = useLawyerSiteRequest();

  return (
    <LawyerDashboardShell
      activeRoute="queroumsite"
      title="Quero um Site"
      subtitle="Presença digital profissional para sua atuação jurídica"
      icon={Globe2}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              <Sparkles size={15} /> Tecnologia feita para advogados
            </span>
            <h2>
              Seu escritório merece uma presença digital à altura da sua
              <span> autoridade.</span>
            </h2>
            <p>
              Solicite uma landing page, um site institucional ou uma plataforma
              completa com design profissional, SEO e estrutura preparada para
              gerar oportunidades.
            </p>
            <div className={styles.heroActions}>
              <button
                type="button"
                onClick={() => controller.selectProject("SITE_INSTITUCIONAL")}
              >
                Solicitar orçamento <ArrowRight size={16} />
              </button>
              <span>
                <ShieldCheck size={15} /> Sem consumo de Juris
              </span>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.browserMockup}>
              <header>
                <span /> <span /> <span />
              </header>
              <div className={styles.mockupBody}>
                <div className={styles.mockupLogo} />
                <div className={styles.mockupTitle} />
                <div className={styles.mockupText} />
                <div className={styles.mockupButton} />
                <div className={styles.mockupCards}>
                  <span /> <span /> <span />
                </div>
              </div>
            </div>
            <div className={styles.mobileMockup}>
              <div className={styles.mobileSpeaker} />
              <div className={styles.mobileContent} />
            </div>
          </div>
        </section>

        <section className={styles.proofGrid}>
          <article>
            <SearchCheck size={21} />
            <div>
              <strong>SEO desde o início</strong>
              <span>Estrutura preparada para mecanismos de busca.</span>
            </div>
          </article>
          <article>
            <AppWindow size={21} />
            <div>
              <strong>Design responsivo</strong>
              <span>Experiência consistente em celular, tablet e desktop.</span>
            </div>
          </article>
          <article>
            <Code2 size={21} />
            <div>
              <strong>Arquitetura moderna</strong>
              <span>Projetos profissionais com tecnologias atuais.</span>
            </div>
          </article>
          <article>
            <BadgeCheck size={21} />
            <div>
              <strong>Atendimento especializado</strong>
              <span>Escopo e proposta definidos conforme sua necessidade.</span>
            </div>
          </article>
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <span>Formatos disponíveis</span>
            <h2>Escolha o ponto de partida do seu projeto</h2>
            <p>
              Os valores abaixo são iniciais e podem variar conforme recursos,
              integrações e complexidade.
            </p>
          </header>

          <div className={styles.projectsGrid}>
            {Object.keys(SITE_PROJECTS)
              .filter((type) => type !== "OUTRO")
              .map((type) => (
                <ProjectCard
                  key={type}
                  type={type}
                  selected={controller.selectedProject === type}
                  onSelect={controller.selectProject}
                />
              ))}
          </div>
        </section>

        <section ref={controller.formRef} className={styles.formSection}>
          <header className={styles.formHeader}>
            <div>
              <span>Solicitação de orçamento</span>
              <h2>Conte o que você precisa construir</h2>
              <p>
                Os dados serão utilizados exclusivamente para análise técnica e
                contato comercial relacionado a esta solicitação.
              </p>
            </div>
            <div className={styles.selectedProjectSummary}>
              <strong>{SITE_PROJECTS[controller.form.projectType]?.title}</strong>
              <span>{SITE_PROJECTS[controller.form.projectType]?.priceLabel}</span>
            </div>
          </header>

          <SuccessPanel
            request={controller.successRequest}
            onClose={() => controller.setSuccessRequest(null)}
            onContact={controller.openContact}
            loading={controller.contactingId === controller.successRequest?.id}
          />

          <form className={styles.form} onSubmit={controller.submit} noValidate>
            <label className={styles.field}>
              <span>Tipo de projeto</span>
              <select
                value={controller.form.projectType}
                onChange={(event) => controller.updateField("projectType", event.target.value)}
              >
                {Object.entries(SITE_PROJECTS).map(([value, project]) => (
                  <option key={value} value={value}>
                    {project.title}
                  </option>
                ))}
              </select>
              <FieldError message={controller.fieldErrors.projectType} />
            </label>

            <label className={styles.field}>
              <span>Nome profissional ou do escritório</span>
              <input
                value={controller.form.officeName}
                onChange={(event) => controller.updateField("officeName", event.target.value)}
                placeholder="Ex.: Pavanello Advocacia"
                maxLength={140}
              />
              <FieldError message={controller.fieldErrors.officeName} />
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span>Qual é o principal objetivo do projeto?</span>
              <textarea
                value={controller.form.objective}
                onChange={(event) => controller.updateField("objective", event.target.value)}
                placeholder="Ex.: Quero fortalecer minha autoridade, apresentar minhas áreas de atuação e captar contatos qualificados pelo WhatsApp."
                maxLength={1600}
                rows={5}
              />
              <small className={styles.counter}>{controller.form.objective.length}/1600</small>
              <FieldError message={controller.fieldErrors.objective} />
            </label>

            <fieldset className={`${styles.fieldset} ${styles.fieldFull}`}>
              <legend>Recursos desejados</legend>
              <div className={styles.featuresGrid}>
                {FEATURE_OPTIONS.map(([value, label]) => {
                  const checked = controller.form.desiredFeatures.includes(value);
                  return (
                    <label key={value} className={checked ? styles.featureChecked : ""}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => controller.toggleFeature(value)}
                      />
                      <span>{checked && <Check size={13} />}</span>
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className={styles.field}>
              <span>Situação do domínio</span>
              <select
                value={controller.form.domainStatus}
                onChange={(event) => controller.updateField("domainStatus", event.target.value)}
              >
                <option value="HAS_DOMAIN">Já possuo domínio</option>
                <option value="NEEDS_DOMAIN">Preciso registrar um domínio</option>
                <option value="UNSURE">Ainda não sei</option>
              </select>
              <FieldError message={controller.fieldErrors.domainStatus} />
            </label>

            {controller.form.domainStatus === "HAS_DOMAIN" ? (
              <label className={styles.field}>
                <span>Domínio atual</span>
                <input
                  value={controller.form.currentDomain}
                  onChange={(event) => controller.updateField("currentDomain", event.target.value)}
                  placeholder="www.seuescritorio.com.br"
                  maxLength={180}
                />
                <FieldError message={controller.fieldErrors.currentDomain} />
              </label>
            ) : (
              <div className={styles.infoField}>
                <Globe2 size={18} />
                <span>O registro e a configuração do domínio poderão ser orientados na proposta.</span>
              </div>
            )}

            <label className={styles.field}>
              <span>Prazo desejado</span>
              <select
                value={controller.form.deadline}
                onChange={(event) => controller.updateField("deadline", event.target.value)}
              >
                {Object.entries(DEADLINE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <FieldError message={controller.fieldErrors.deadline} />
            </label>

            <label className={styles.field}>
              <span>Faixa de investimento</span>
              <select
                value={controller.form.budgetRange}
                onChange={(event) => controller.updateField("budgetRange", event.target.value)}
              >
                {Object.entries(BUDGET_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <FieldError message={controller.fieldErrors.budgetRange} />
            </label>

            <fieldset className={`${styles.fieldset} ${styles.fieldFull}`}>
              <legend>Como prefere receber o contato?</legend>
              <div className={styles.contactChoices}>
                <label className={controller.form.preferredContact === "WHATSAPP" ? styles.contactActive : ""}>
                  <input
                    type="radio"
                    name="preferredContact"
                    value="WHATSAPP"
                    checked={controller.form.preferredContact === "WHATSAPP"}
                    onChange={() => controller.updateField("preferredContact", "WHATSAPP")}
                  />
                  <MessageCircle size={18} />
                  <span><strong>WhatsApp</strong><small>Contato mais rápido</small></span>
                </label>
                <label className={controller.form.preferredContact === "EMAIL" ? styles.contactActive : ""}>
                  <input
                    type="radio"
                    name="preferredContact"
                    value="EMAIL"
                    checked={controller.form.preferredContact === "EMAIL"}
                    onChange={() => controller.updateField("preferredContact", "EMAIL")}
                  />
                  <Mail size={18} />
                  <span><strong>E-mail</strong><small>Resposta formal por escrito</small></span>
                </label>
              </div>
              <FieldError message={controller.fieldErrors.preferredContact} />
            </fieldset>

            {controller.form.preferredContact === "WHATSAPP" ? (
              <label className={styles.field}>
                <span>WhatsApp com DDD</span>
                <input
                  inputMode="tel"
                  value={controller.form.contactPhone}
                  onChange={(event) => controller.updateField("contactPhone", event.target.value)}
                  placeholder="(51) 99999-9999"
                  maxLength={20}
                />
                <FieldError message={controller.fieldErrors.contactPhone} />
              </label>
            ) : (
              <label className={styles.field}>
                <span>E-mail para contato</span>
                <input
                  type="email"
                  value={controller.form.contactEmail}
                  onChange={(event) => controller.updateField("contactEmail", event.target.value)}
                  placeholder="voce@escritorio.com.br"
                  maxLength={180}
                />
                <FieldError message={controller.fieldErrors.contactEmail} />
              </label>
            )}

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span>Observações adicionais</span>
              <textarea
                value={controller.form.notes}
                onChange={(event) => controller.updateField("notes", event.target.value)}
                placeholder="Referências, integrações necessárias, identidade visual existente ou outras informações relevantes."
                maxLength={1600}
                rows={4}
              />
            </label>

            <label className={`${styles.consent} ${styles.fieldFull}`}>
              <input
                type="checkbox"
                checked={controller.form.consent}
                onChange={(event) => controller.updateField("consent", event.target.checked)}
              />
              <span>
                Autorizo o uso destes dados para análise técnica e contato comercial referente ao projeto solicitado.
              </span>
            </label>
            <FieldError message={controller.fieldErrors.consent} />

            <div className={`${styles.submitArea} ${styles.fieldFull}`}>
              <div>
                <ShieldCheck size={18} />
                <span>
                  O envio é gratuito, não consome Juris e não representa contratação automática.
                </span>
              </div>
              <button type="submit" disabled={controller.submitting}>
                {controller.submitting ? (
                  <Loader2 size={17} className={styles.spinner} />
                ) : (
                  <Rocket size={17} />
                )}
                Enviar solicitação
              </button>
            </div>
          </form>
        </section>

        <section className={styles.historySection}>
          <header>
            <div>
              <span>Acompanhamento</span>
              <h2>Minhas solicitações recentes</h2>
            </div>
            <button type="button" onClick={controller.reload} disabled={controller.loading}>
              <RefreshCw size={14} className={controller.loading ? styles.spinner : ""} />
              Atualizar
            </button>
          </header>
          <RecentRequests controller={controller} />
        </section>
      </div>
    </LawyerDashboardShell>
  );
}
