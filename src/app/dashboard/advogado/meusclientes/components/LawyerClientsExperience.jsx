"use client";

import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Coins,
  Download,
  Edit3,
  ExternalLink,
  FileKey2,
  FileText,
  FolderOpen,
  Gavel,
  Infinity as InfinityIcon,
  Info,
  Loader2,
  Mail,
  MessageSquare,
  Mic,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  TrendingUp,
  UploadCloud,
  UserRound,
  UserRoundCheck,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../MeusClientes.module.css";
import voiceStyles from "../VoiceCapture.module.css";
import { useLawyerClients } from "../useLawyerClients";

const DOSSIER_TABS = [
  { id: "overview", label: "Visão geral", icon: UserRound },
  { id: "timeline", label: "Interações", icon: MessageSquare },
  { id: "finance", label: "Financeiro", icon: WalletCards },
  { id: "documents", label: "Documentos", icon: FolderOpen },
  { id: "cases", label: "Casos", icon: BriefcaseBusiness },
];

function currency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function RiskBadge({ score }) {
  const level = score >= 70 ? "high" : score >= 30 ? "medium" : "low";
  const label = level === "high" ? "Alto" : level === "medium" ? "Médio" : "Baixo";
  return (
    <span className={`${styles.risk} ${styles[`risk${level}`]}`}>
      {label} · {score}%
    </span>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status || "Ativo").toLowerCase();
  return (
    <span className={`${styles.status} ${styles[`status${normalized}`] || ""}`}>
      {status || "Ativo"}
    </span>
  );
}

function UsageStrip({ controller }) {
  const clients = controller.usage?.crmClients || {};
  const ai = controller.usage?.aiCapture || {};
  const isStart = controller.plan?.type === "START";
  const clientLabel =
    clients.limit === null
      ? "Ilimitados"
      : `${clients.used || 0} / ${clients.limit || 0}`;
  const aiPercent = ai.limit
    ? Math.min(100, ((ai.used || 0) / ai.limit) * 100)
    : 0;

  return (
    <section
      className={voiceStyles.usageStrip}
      aria-label="Limites do plano no CRM"
    >
      <article className={voiceStyles.planCard}>
        <span className={voiceStyles.usageIcon}>
          <ShieldCheck size={18} />
        </span>
        <div>
          <small>Plano atual</small>
          <strong>{controller.plan?.type || "FREE"}</strong>
          <p>
            {isStart
              ? "Entrada controlada para conhecer a plataforma"
              : "Uso profissional consolidado"}
          </p>
        </div>
      </article>
      <article>
        <span className={voiceStyles.usageIcon}>
          <Users size={18} />
        </span>
        <div>
          <small>Clientes no CRM</small>
          <strong>{clientLabel}</strong>
          <p>
            {clients.limit === null
              ? "Sem limite de clientes"
              : `${clients.remaining || 0} vagas restantes`}
          </p>
        </div>
      </article>
      <article>
        <span className={voiceStyles.usageIcon}>
          <Sparkles size={18} />
        </span>
        <div className={voiceStyles.usageProgressBlock}>
          <small>Voz e PDF neste mês</small>
          <strong>
            {ai.used || 0} / {ai.limit || 0}
          </strong>
          <div className={voiceStyles.progressTrack} aria-hidden="true">
            <span style={{ width: `${aiPercent}%` }} />
          </div>
          <p>{ai.remaining || 0} processamentos restantes</p>
        </div>
      </article>
      <article>
        <span className={voiceStyles.usageIcon}>
          <Coins size={18} />
        </span>
        <div>
          <small>Custo por processamento</small>
          <strong>{isStart ? `${ai.jurisCost || 3} Juris` : "Incluído"}</strong>
          <p>
            {isStart
              ? `Saldo atual: ${ai.balance || 0} Juris`
              : "Sem desconto de Juris no PRO"}
          </p>
        </div>
      </article>
    </section>
  );
}

function buildVoiceChecklist(transcript) {
  const text = String(transcript || "").toLowerCase();
  return [
    {
      id: "name",
      label: "Nome do cliente",
      matched: text.trim().length > 5,
    },
    {
      id: "type",
      label: "Tipo (Física/Jurídica)",
      matched: ["física", "jurídica", "empresa", "limitada", "ltda"].some(
        (term) => text.includes(term),
      ),
    },
    {
      id: "document",
      label: "CPF / CNPJ",
      matched:
        text.includes("cpf") || text.includes("cnpj") || /\d{3}/.test(text),
    },
    {
      id: "rg",
      label: "RG / IE",
      matched: [" rg ", " ie ", "identidade", "inscrição estadual"].some(
        (term) => ` ${text} `.includes(term),
      ),
    },
    {
      id: "civil",
      label: "Estado civil",
      matched: [
        "solteir",
        "casad",
        "divorciad",
        "viúv",
        "união estável",
        "estado civil",
      ].some((term) => text.includes(term)),
    },
    {
      id: "profession",
      label: "Profissão",
      matched: [
        "profissão",
        "trabalha",
        "autônomo",
        "aposentado",
        "empresário",
        "advogado",
        "engenheiro",
        "médico",
        "professor",
      ].some((term) => text.includes(term)),
    },
    {
      id: "phone",
      label: "Telefone",
      matched:
        ["telefone", "celular", "whats"].some((term) => text.includes(term)) ||
        /\d{8}/.test(text.replace(/\s/g, "")),
    },
    {
      id: "email",
      label: "E-mail",
      matched:
        text.includes("@") || text.includes("email") || text.includes("e-mail"),
    },
    {
      id: "address",
      label: "Endereço",
      matched: ["rua", "avenida", "reside", "mora", "bairro", "cidade"].some(
        (term) => text.includes(term),
      ),
    },
    {
      id: "facts",
      label: "Fatos do caso",
      matched: ["caso", "danos", "processo", "contrato", "ação", "fato"].some(
        (term) => text.includes(term),
      ),
    },
  ];
}

function VoiceCaptureModal({ controller }) {
  const checklist = useMemo(
    () => buildVoiceChecklist(controller.voiceTranscript),
    [controller.voiceTranscript],
  );
  const completed = checklist.filter((item) => item.matched).length;
  const ai = controller.usage?.aiCapture || {};
  const isStart = controller.plan?.type === "START";
  const isProcessing = controller.voiceStage === "processing";
  const isListening = controller.voiceStage === "listening";
  const blocked = !ai.canUse;

  useEffect(() => {
    if (!controller.voiceModalOpen) return undefined;
    const previous = document.body.style.overflow;
    const handleKey = (event) => {
      if (event.key === "Escape" && !isProcessing) {
        controller.cancelVoiceCapture();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKey);
    };
  }, [controller.voiceModalOpen, controller.cancelVoiceCapture, isProcessing]);

  if (!controller.voiceModalOpen) return null;

  return (
    <div className={voiceStyles.voiceBackdrop}>
      <section
        className={voiceStyles.voiceModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-title"
      >
        <header className={voiceStyles.voiceHeader}>
          <div>
            <span>
              <Mic size={15} /> Cadastro inteligente por voz
            </span>
            <h2 id="voice-title">
              Fale. Confira o gabarito. Revise antes de salvar.
            </h2>
            <p>
              A cobrança ocorre somente quando a IA começa a processar a
              transcrição.
            </p>
          </div>
          <button
            type="button"
            onClick={controller.cancelVoiceCapture}
            disabled={isProcessing}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>

        <div className={voiceStyles.voiceGrid}>
          <div className={voiceStyles.recorderPanel}>
            <div
              className={`${voiceStyles.micOrb} ${
                isListening ? voiceStyles.micListening : ""
              }`}
            >
              {isProcessing ? (
                <Loader2 size={38} className={styles.spin} />
              ) : (
                <Mic size={38} />
              )}
            </div>
            <div className={voiceStyles.recorderTitle}>
              <small>
                {isStart
                  ? `Plano START · ${ai.jurisCost || 3} Juris`
                  : "Plano PRO · incluído"}
              </small>
              <h3>
                {isProcessing
                  ? "Processando com IA..."
                  : isListening
                    ? "Estou ouvindo..."
                    : "Pronto para começar?"}
              </h3>
              <p>
                {isListening
                  ? "Fale naturalmente e acompanhe o gabarito ao lado."
                  : "A IA organiza os dados nos campos do CRM para sua revisão."}
              </p>
            </div>

            <div className={voiceStyles.transcriptBox} aria-live="polite">
              <span>Transcrição em tempo real</span>
              <p>
                {controller.voiceTranscript ||
                  "Sua fala aparecerá aqui enquanto o microfone estiver ativo."}
              </p>
            </div>

            {blocked && (
              <div className={voiceStyles.voiceBlocked}>
                <AlertTriangle size={18} />
                <div>
                  <strong>
                    {ai.limitReached
                      ? "Limite mensal atingido"
                      : ai.insufficientJuris
                        ? "Saldo de Juris insuficiente"
                        : "Recurso indisponível"}
                  </strong>
                  <p>
                    {ai.limitReached
                      ? `Você já utilizou os ${ai.limit || 0} processamentos deste mês.`
                      : ai.insufficientJuris
                        ? `São necessários ${ai.jurisCost || 3} Juris. Seu saldo atual é ${ai.balance || 0}.`
                        : "Conheça os planos START e PRO para usar o cadastro inteligente."}
                  </p>
                </div>
              </div>
            )}

            <footer className={voiceStyles.voiceActions}>
              <button
                type="button"
                onClick={controller.cancelVoiceCapture}
                disabled={isProcessing}
              >
                <X size={16} /> Cancelar
              </button>
              {isListening ? (
                <button
                  type="button"
                  className={voiceStyles.voicePrimary}
                  onClick={controller.finishVoiceCapture}
                >
                  <Square size={14} fill="currentColor" /> Concluir e processar
                </button>
              ) : isProcessing ? (
                <button
                  type="button"
                  className={voiceStyles.voicePrimary}
                  disabled
                >
                  <Loader2 size={16} className={styles.spin} /> Estruturando dados
                </button>
              ) : (
                <button
                  type="button"
                  className={voiceStyles.voicePrimary}
                  onClick={controller.beginVoiceCapture}
                  disabled={blocked}
                >
                  <Mic size={16} /> Iniciar gravação
                </button>
              )}
            </footer>
          </div>

          <aside className={voiceStyles.guidePanel}>
            <div className={voiceStyles.guideHeading}>
              <div>
                <span>Gabarito de informações</span>
                <h3>
                  {completed} de {checklist.length} itens identificados
                </h3>
              </div>
              <span className={voiceStyles.guideScore}>
                {completed}/{checklist.length}
              </span>
            </div>

            <div className={voiceStyles.checklist}>
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.matched
                      ? voiceStyles.checkComplete
                      : voiceStyles.checkItem
                  }
                >
                  <span>
                    {item.matched ? <Check size={12} strokeWidth={3} /> : null}
                  </span>
                  <strong>{item.label}</strong>
                </div>
              ))}
            </div>

            <div className={voiceStyles.scriptBox}>
              <span>
                <Info size={14} /> Roteiro sugerido
              </span>
              <p>
                “Cadastre <b>[nome]</b>, pessoa <b>[física/jurídica]</b>, estado
                civil <b>[estado]</b>, profissão <b>[profissão]</b>, CPF/CNPJ{" "}
                <b>[número]</b>, RG/IE <b>[número]</b>, telefone <b>[número]</b>,
                e-mail <b>[endereço]</b>, residente em <b>[endereço completo]</b>.
                O caso é sobre <b>[fatos principais]</b>.”
              </p>
            </div>

            <div className={voiceStyles.planSummary}>
              <div>
                <span>
                  <Sparkles size={15} /> Uso mensal de IA
                </span>
                <strong>
                  {ai.used || 0} / {ai.limit || 0}
                </strong>
              </div>
              <div>
                <span>
                  <Coins size={15} /> Custo desta operação
                </span>
                <strong>{isStart ? `${ai.jurisCost || 3} Juris` : "0 Juris"}</strong>
              </div>
              <div>
                <span>
                  {controller.usage?.crmClients?.limit === null ? (
                    <InfinityIcon size={15} />
                  ) : (
                    <Users size={15} />
                  )}{" "}
                  Clientes no CRM
                </span>
                <strong>
                  {controller.usage?.crmClients?.limit === null
                    ? "Ilimitados"
                    : `${controller.usage?.crmClients?.used || 0} / ${
                        controller.usage?.crmClients?.limit || 0
                      }`}
                </strong>
              </div>
            </div>

            {isStart && (
              <button
                type="button"
                className={voiceStyles.upgradeButton}
                onClick={controller.openPlansModal}
              >
                <Sparkles size={15} /> Conhecer benefícios do PRO
              </button>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}

function ClientFormModal({ controller }) {
  useEffect(() => {
    if (!controller.formOpen) return undefined;
    const previous = document.body.style.overflow;
    const onKey = (event) => event.key === "Escape" && controller.closeForm();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [controller.formOpen, controller.closeForm]);

  if (!controller.formOpen) return null;
  const fields = [
    ["name", "Nome completo *", "text", "Nome ou razão social"],
    ["cpfCnpj", "CPF ou CNPJ", "text", "Somente números"],
    ["rg", "RG ou inscrição estadual", "text", "Documento complementar"],
    ["civilStatus", "Estado civil", "text", "Ex.: Casado(a)"],
    ["profession", "Profissão", "text", "Profissão ou atividade"],
    ["phone", "Telefone", "tel", "DDD + número"],
    ["email", "E-mail", "email", "cliente@exemplo.com"],
    ["address", "Endereço completo", "text", "Rua, número, cidade e UF"],
  ];

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) controller.closeForm();
      }}
    >
      <section className={styles.formModal} role="dialog" aria-modal="true">
        <header className={styles.modalHeader}>
          <div>
            <span>
              {controller.editingClient ? "Editar cadastro" : "Revisão obrigatória"}
            </span>
            <h2>
              {controller.editingClient
                ? "Atualizar cliente"
                : "Revise os dados antes de cadastrar"}
            </h2>
            <p>
              A IA preenche o formulário, mas o advogado mantém o controle e
              confirma as informações.
            </p>
          </div>
          <button
            type="button"
            onClick={controller.closeForm}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>
        <form
          className={styles.clientForm}
          onSubmit={controller.saveClient}
          noValidate
        >
          <div className={styles.formGrid}>
            <label>
              <span>Tipo de cliente</span>
              <select
                value={controller.form.type}
                onChange={(event) =>
                  controller.updateForm("type", event.target.value)
                }
              >
                <option>Pessoa Física</option>
                <option>Pessoa Jurídica</option>
              </select>
            </label>
            <label>
              <span>Status</span>
              <select
                value={controller.form.status}
                onChange={(event) =>
                  controller.updateForm("status", event.target.value)
                }
              >
                <option>Ativo</option>
                <option>Potencial</option>
                <option>Inativo</option>
                <option>Arquivado</option>
              </select>
            </label>
            {fields.map(([name, label, type, placeholder]) => (
              <label
                key={name}
                className={name === "address" ? styles.fieldWide : ""}
              >
                <span>{label}</span>
                <input
                  type={type}
                  value={controller.form[name]}
                  onChange={(event) =>
                    controller.updateForm(name, event.target.value)
                  }
                  placeholder={placeholder}
                />
                {controller.fieldErrors[name] && (
                  <small>{controller.fieldErrors[name]}</small>
                )}
              </label>
            ))}
            <label className={styles.fieldWide}>
              <span>Notas internas e fatos do caso</span>
              <textarea
                value={controller.form.notes}
                onChange={(event) =>
                  controller.updateForm("notes", event.target.value)
                }
                placeholder="Contexto do atendimento e fatos principais"
              />
            </label>
          </div>
          <div className={styles.privacyNotice}>
            <ShieldCheck size={20} />
            <div>
              <strong>Tratamento protegido de dados</strong>
              <p>
                CPF/CNPJ e telefone são mascarados na carteira e exibidos
                integralmente apenas no dossiê.
              </p>
            </div>
          </div>
          <footer className={styles.modalFooter}>
            <button
              type="button"
              onClick={controller.closeForm}
              disabled={controller.saving}
            >
              Cancelar
            </button>
            <button type="submit" disabled={controller.saving}>
              {controller.saving ? (
                <Loader2 size={17} className={styles.spin} />
              ) : (
                <Check size={17} />
              )}
              {controller.saving
                ? "Salvando..."
                : controller.editingClient
                  ? "Salvar alterações"
                  : "Confirmar cadastro"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function OverviewTab({ controller }) {
  const client = controller.dossier.client;
  const fields = [
    ["Tipo", client.type],
    ["CPF/CNPJ", client.cpfCnpj || "—"],
    ["RG/IE", client.rg || "—"],
    ["Estado civil", client.civilStatus || "—"],
    ["Profissão", client.profession || "—"],
    ["Telefone", client.phone || "—"],
    ["E-mail", client.email || "—"],
    ["Endereço", client.address || "—"],
  ];
  return (
    <div className={styles.dossierGrid}>
      <section className={styles.dossierCard}>
        <header>
          <div>
            <span>Cadastro e KYC</span>
            <h3>Dados do cliente</h3>
          </div>
          <RiskBadge score={client.riskScore} />
        </header>
        <dl className={styles.detailList}>
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className={styles.notesBox}>
          <span>Notas internas</span>
          <p>{client.notes || "Nenhuma observação registrada."}</p>
        </div>
      </section>
      <section className={`${styles.dossierCard} ${styles.insightCard}`}>
        <header>
          <div>
            <span>Inteligência do relacionamento</span>
            <h3>Insight KYC com IA</h3>
          </div>
          <Sparkles size={20} />
        </header>
        {controller.insight ? (
          <p className={styles.insightText}>{controller.insight}</p>
        ) : (
          <div className={styles.insightEmpty}>
            <BarChart3 size={30} />
            <p>
              Analise risco, comportamento, prontidão documental e saúde
              financeira.
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={controller.generateInsight}
          disabled={controller.dossierAction === "insight"}
        >
          {controller.dossierAction === "insight" ? (
            <Loader2 size={16} className={styles.spin} />
          ) : (
            <Sparkles size={16} />
          )}
          {controller.insight ? "Atualizar insight" : "Gerar insight estratégico"}
        </button>
      </section>
    </div>
  );
}

function TimelineTab({ controller }) {
  const requiresSchedule = ["reunião", "ligação"].includes(
    controller.interactionForm.type,
  );

  return (
    <section className={styles.dossierCard}>
      <form className={styles.inlineForm} onSubmit={controller.addInteraction}>
        <textarea
          value={controller.interactionForm.content}
          onChange={(event) =>
            controller.setInteractionForm((current) => ({
              ...current,
              content: event.target.value,
            }))
          }
          placeholder="Registrar ligação, reunião, e-mail, WhatsApp ou nota interna"
        />
        <div>
          <select
            value={controller.interactionForm.type}
            onChange={(event) =>
              controller.setInteractionForm((current) => ({
                ...current,
                type: event.target.value,
                scheduledAt: ["reunião", "ligação"].includes(event.target.value)
                  ? current.scheduledAt
                  : "",
              }))
            }
          >
            <option value="nota">Nota interna</option>
            <option value="reunião">Reunião</option>
            <option value="ligação">Ligação</option>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          {requiresSchedule && (
            <label className={styles.inlineDateField}>
              <CalendarDays size={15} />
              <input
                type="datetime-local"
                value={controller.interactionForm.scheduledAt}
                onChange={(event) =>
                  controller.setInteractionForm((current) => ({
                    ...current,
                    scheduledAt: event.target.value,
                  }))
                }
                aria-label="Data e hora do compromisso"
                required
              />
            </label>
          )}
          <button
            type="submit"
            disabled={
              controller.dossierAction === "interaction" ||
              !controller.interactionForm.content.trim() ||
              (requiresSchedule && !controller.interactionForm.scheduledAt)
            }
          >
            <Plus size={16} /> Registrar
          </button>
        </div>
      </form>
      <div className={styles.timeline}>
        {controller.dossier.interactions?.length ? (
          controller.dossier.interactions.map((item) => (
            <article key={item.id}>
              <span className={styles.timelineIcon}>
                {item.type === "ligação" ? (
                  <Phone size={15} />
                ) : item.type === "email" ? (
                  <Mail size={15} />
                ) : (
                  <MessageSquare size={15} />
                )}
              </span>
              <div>
                <header>
                  <strong>{item.type}</strong>
                  <time>{formatDate(item.created_at, true)}</time>
                </header>
                <p>{item.content}</p>
              </div>
            </article>
          ))
        ) : (
          <div className={styles.emptyCompact}>Nenhuma interação registrada.</div>
        )}
      </div>
    </section>
  );
}

function FinanceTab({ controller }) {
  return (
    <section className={styles.dossierCard}>
      <form className={styles.financeForm} onSubmit={controller.addFinance}>
        <input
          value={controller.financeForm.description}
          onChange={(event) =>
            controller.setFinanceForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder="Descrição do lançamento"
        />
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={controller.financeForm.amount}
          onChange={(event) =>
            controller.setFinanceForm((current) => ({
              ...current,
              amount: event.target.value,
            }))
          }
          placeholder="Valor"
        />
        <input
          type="date"
          value={controller.financeForm.dueDate}
          onChange={(event) =>
            controller.setFinanceForm((current) => ({
              ...current,
              dueDate: event.target.value,
            }))
          }
        />
        <button
          type="submit"
          disabled={controller.dossierAction === "finance"}
        >
          <Plus size={16} /> Adicionar
        </button>
      </form>
      <div className={styles.financeList}>
        {controller.dossier.finance?.length ? (
          controller.dossier.finance.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.description}</strong>
                <span>Vencimento: {formatDate(item.due_date)}</span>
              </div>
              <b>{currency(item.amount)}</b>
              <button
                type="button"
                className={item.status === "PAGO" ? styles.paid : styles.pending}
                onClick={() => controller.toggleFinance(item)}
                disabled={controller.dossierAction === item.id}
              >
                {item.status === "PAGO" ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <CalendarDays size={14} />
                )}
                {item.status}
              </button>
            </article>
          ))
        ) : (
          <div className={styles.emptyCompact}>
            Nenhum lançamento financeiro.
          </div>
        )}
      </div>
    </section>
  );
}

function DocumentsTab({ controller }) {
  return (
    <section className={styles.dossierCard}>
      <input
        ref={controller.documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        hidden
        onChange={(event) => controller.uploadDocument(event.target.files?.[0])}
      />
      <div className={styles.documentToolbar}>
        <label>
          <input
            type="checkbox"
            checked={controller.protectDocument}
            onChange={(event) =>
              controller.setProtectDocument(event.target.checked)
            }
          />
          <ShieldCheck size={15} /> Blindar prova
        </label>
        <button
          type="button"
          onClick={() => controller.documentInputRef.current?.click()}
          disabled={controller.dossierAction === "document"}
        >
          <UploadCloud size={16} /> Anexar documento
        </button>
      </div>
      <div className={styles.documentList}>
        {controller.dossier.documents?.length ? (
          controller.dossier.documents.map((document) => (
            <article key={document.id}>
              <span className={styles.fileIcon}>
                {document.protected ? (
                  <FileKey2 size={18} />
                ) : (
                  <FileText size={18} />
                )}
              </span>
              <div>
                <strong>{document.fileName}</strong>
                <span>
                  {document.documentType} · {formatDate(document.createdAt)}
                  {document.protected ? " · Blindado" : ""}
                </span>
              </div>
              <a
                href={document.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Abrir documento"
              >
                <ExternalLink size={15} />
              </a>
              <button
                type="button"
                onClick={() => controller.deleteDocument(document.id)}
                disabled={controller.dossierAction === document.id}
                aria-label="Excluir documento"
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))
        ) : (
          <div className={styles.emptyCompact}>Nenhum documento anexado.</div>
        )}
      </div>
    </section>
  );
}

function CasesTab({ controller }) {
  return (
    <section className={styles.dossierCard}>
      <div className={styles.caseList}>
        {controller.dossier.cases?.length ? (
          controller.dossier.cases.map((item) => (
            <article key={item.id}>
              <span className={styles.caseIcon}>
                {item.isProcess ? (
                  <Gavel size={18} />
                ) : (
                  <BriefcaseBusiness size={18} />
                )}
              </span>
              <div>
                <strong>{item.titulo}</strong>
                <span>
                  {item.area_atuacao || "Direito Geral"} ·{" "}
                  {formatDate(item.created_at)}
                </span>
              </div>
              <StatusBadge status={item.status} />
              {item.isProcess ? (
                <a href={`/dashboard/advogado/processos?open=${item.id}`}>
                  Abrir pasta <ExternalLink size={13} />
                </a>
              ) : (
                <a href="/dashboard/advogado/mensagens">
                  Abrir mensagens <ExternalLink size={13} />
                </a>
              )}
            </article>
          ))
        ) : (
          <div className={styles.emptyCompact}>
            Nenhum caso do marketplace vinculado.
          </div>
        )}
      </div>
    </section>
  );
}

function DossierModal({ controller }) {
  useEffect(() => {
    if (!controller.dossierOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [controller.dossierOpen]);

  if (!controller.dossierOpen) return null;
  const client = controller.dossier?.client;
  return (
    <div className={styles.dossierBackdrop}>
      <section className={styles.dossierModal} role="dialog" aria-modal="true">
        <header className={styles.dossierHeader}>
          <div className={styles.dossierIdentity}>
            <span>{client?.name?.slice(0, 2).toUpperCase() || "CL"}</span>
            <div>
              <small>Dossiê protegido</small>
              <h2>{client?.name || "Carregando cliente..."}</h2>
              {client && (
                <p>
                  {client.lawyerName} · cadastro em {formatDate(client.createdAt)}
                </p>
              )}
            </div>
          </div>
          <div className={styles.dossierActions}>
            {client && controller.permissions.canDelegate && (
              <select
                value={client.lawyerId}
                onChange={(event) =>
                  controller.delegateClient(client.id, event.target.value)
                }
                disabled={controller.dossierAction === "delegate"}
                aria-label="Delegar responsável"
              >
                {controller.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            )}
            {client && (
              <button type="button" onClick={() => controller.openEdit(client)}>
                <Edit3 size={16} /> Editar
              </button>
            )}
            <button
              type="button"
              onClick={controller.generateReport}
              disabled={!client || controller.dossierAction === "report"}
            >
              <Download size={16} /> Exportar
            </button>
            <button
              type="button"
              onClick={() => controller.setDossierOpen(false)}
              aria-label="Fechar dossiê"
            >
              <X size={19} />
            </button>
          </div>
        </header>
        {controller.dossierLoading || !controller.dossier ? (
          <div className={styles.modalState}>
            <Loader2 size={30} className={styles.spin} />
            <strong>Montando dossiê...</strong>
          </div>
        ) : (
          <>
            <nav className={styles.dossierTabs} aria-label="Seções do dossiê">
              {DOSSIER_TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={
                      controller.activeDossierTab === tab.id
                        ? styles.tabActive
                        : ""
                    }
                    onClick={() => controller.setActiveDossierTab(tab.id)}
                  >
                    <Icon size={15} /> {tab.label}
                  </button>
                );
              })}
            </nav>
            <div className={styles.dossierBody}>
              {controller.activeDossierTab === "overview" && (
                <OverviewTab controller={controller} />
              )}
              {controller.activeDossierTab === "timeline" && (
                <TimelineTab controller={controller} />
              )}
              {controller.activeDossierTab === "finance" && (
                <FinanceTab controller={controller} />
              )}
              {controller.activeDossierTab === "documents" && (
                <DocumentsTab controller={controller} />
              )}
              {controller.activeDossierTab === "cases" && (
                <CasesTab controller={controller} />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function LawyerClientsExperience() {
  const controller = useLawyerClients();
  const ai = controller.usage?.aiCapture || {};
  const isStart = controller.plan?.type === "START";

  return (
    <LawyerDashboardShell
      activeRoute="meusclientes"
      title="Meus Clientes"
      subtitle="CRM jurídico, KYC e relacionamento"
      icon={Users}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              <ShieldCheck size={15} /> CRM jurídico protegido
            </span>
            <h1>
              Carteira de clientes com <span>visão completa.</span>
            </h1>
            <p>
              Centralize dados, interações, documentos, financeiro, casos e
              insights KYC em um único dossiê.
            </p>
          </div>
          <div className={styles.heroActions}>
            <input
              ref={controller.pdfInputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              hidden
              onChange={(event) =>
                controller.extractFromFile(event.target.files?.[0])
              }
            />
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={controller.openVoiceCapture}
            >
              <Mic size={17} /> Cadastrar por voz
              <small>{isStart ? `${ai.jurisCost || 3} Juris` : "PRO"}</small>
            </button>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={controller.openPdfCapture}
              disabled={controller.extracting}
            >
              {controller.extracting ? (
                <Loader2 size={17} className={styles.spin} />
              ) : (
                <Sparkles size={17} />
              )}
              Extrair PDF ou foto
              <small>{isStart ? `${ai.jurisCost || 3} Juris` : "PRO"}</small>
            </button>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={() => controller.openCreate()}
            >
              <Plus size={17} /> Novo cliente
            </button>
          </div>
        </section>

        <UsageStrip controller={controller} />

        <section className={styles.metrics}>
          <article>
            <span>
              <Users size={19} />
            </span>
            <div>
              <small>Carteira total</small>
              <strong>{controller.metrics.total || 0}</strong>
            </div>
          </article>
          <article>
            <span className={styles.successIcon}>
              <UserRoundCheck size={19} />
            </span>
            <div>
              <small>Clientes ativos</small>
              <strong>{controller.metrics.active || 0}</strong>
            </div>
          </article>
          <article>
            <span className={styles.alertIcon}>
              <AlertTriangle size={19} />
            </span>
            <div>
              <small>Risco elevado</small>
              <strong>{controller.metrics.highRisk || 0}</strong>
            </div>
          </article>
          <article>
            <span className={styles.moneyIcon}>
              <TrendingUp size={19} />
            </span>
            <div>
              <small>Previsto no mês</small>
              <strong>{currency(controller.metrics.expected)}</strong>
            </div>
          </article>
          <article>
            <span className={styles.successIcon}>
              <CircleDollarSign size={19} />
            </span>
            <div>
              <small>Recebido no mês</small>
              <strong>{currency(controller.metrics.received)}</strong>
            </div>
          </article>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <span>Carteira profissional</span>
              <h2>Clientes cadastrados</h2>
            </div>
            <div className={styles.filters}>
              <label className={styles.searchField}>
                <Search size={16} />
                <input
                  type="search"
                  value={controller.filters.search}
                  onChange={(event) =>
                    controller.setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Buscar por nome, e-mail ou profissão"
                />
              </label>
              <select
                value={controller.filters.status}
                onChange={(event) =>
                  controller.setFilters((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                <option value="all">Todos os status</option>
                <option value="Ativo">Ativos</option>
                <option value="Potencial">Potenciais</option>
                <option value="Inativo">Inativos</option>
                <option value="Arquivado">Arquivados</option>
              </select>
              {controller.members.length > 1 && (
                <select
                  value={controller.filters.scope}
                  onChange={(event) =>
                    controller.setFilters((current) => ({
                      ...current,
                      scope: event.target.value,
                    }))
                  }
                >
                  <option value="all">Todo o escritório</option>
                  <option value="mine">Somente meus clientes</option>
                </select>
              )}
              <button
                type="button"
                className={styles.refresh}
                onClick={controller.reload}
                aria-label="Atualizar"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </header>

          {controller.loading ? (
            <div className={styles.state}>
              <Loader2 size={30} className={styles.spin} />
              <strong>Carregando carteira...</strong>
              <span>Validando permissões e consolidando indicadores.</span>
            </div>
          ) : controller.error ? (
            <div className={`${styles.state} ${styles.errorState}`}>
              <AlertTriangle size={30} />
              <strong>Não foi possível carregar</strong>
              <span>{controller.error}</span>
              <button type="button" onClick={controller.reload}>
                Tentar novamente
              </button>
            </div>
          ) : controller.items.length === 0 ? (
            <div className={styles.state}>
              <Users size={36} />
              <strong>Nenhum cliente encontrado</strong>
              <span>Cadastre o primeiro cliente ou ajuste os filtros.</span>
              <button type="button" onClick={() => controller.openCreate()}>
                <Plus size={15} /> Cadastrar cliente
              </button>
            </div>
          ) : (
            <div className={styles.clientGrid}>
              {controller.items.map((client) => (
                <article key={client.id} className={styles.clientCard}>
                  <header>
                    <span className={styles.avatar}>
                      {client.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3>{client.name}</h3>
                      <p>
                        {client.type} ·{" "}
                        {client.profession || "Profissão não informada"}
                      </p>
                    </div>
                  </header>
                  <div className={styles.clientContact}>
                    <span>
                      <Mail size={14} /> {client.email || "Sem e-mail"}
                    </span>
                    <span>
                      <Phone size={14} />
                      {client.phoneMasked || "Sem telefone"}
                    </span>
                    <span>
                      <FileText size={14} />
                      {client.documentMasked || "Sem documento"}
                    </span>
                  </div>
                  <div className={styles.clientBadges}>
                    <StatusBadge status={client.status} />
                    <RiskBadge score={client.riskScore} />
                  </div>
                  <footer>
                    <div>
                      <small>Responsável</small>
                      <strong>{client.lawyerName}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => controller.openDossier(client.id)}
                    >
                      Abrir dossiê <ChevronRight size={15} />
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}

          {!controller.loading &&
            !controller.error &&
            controller.pagination.total > 0 && (
              <footer className={styles.pagination}>
                <span>{controller.currentRange}</span>
                <div>
                  <button
                    type="button"
                    onClick={() =>
                      controller.load(controller.pagination.page - 1)
                    }
                    disabled={controller.pagination.page <= 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <strong>
                    {controller.pagination.page} /{" "}
                    {controller.pagination.totalPages}
                  </strong>
                  <button
                    type="button"
                    onClick={() =>
                      controller.load(controller.pagination.page + 1)
                    }
                    disabled={
                      controller.pagination.page >=
                      controller.pagination.totalPages
                    }
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </footer>
            )}
        </section>
      </div>

      <VoiceCaptureModal controller={controller} />
      <ClientFormModal controller={controller} />
      <DossierModal controller={controller} />
    </LawyerDashboardShell>
  );
}
