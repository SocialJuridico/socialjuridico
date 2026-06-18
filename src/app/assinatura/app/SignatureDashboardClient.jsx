"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Crown,
  Download,
  ExternalLink,
  FileCheck2,
  FileClock,
  FileDown,
  FilePlus2,
  FileSignature,
  FileText,
  Gauge,
  LayoutDashboard,
  Link2,
  Loader2,
  MapPin,
  Menu,
  PenLine,
  Plus,
  QrCode,
  RefreshCw,
  Route,
  Search,
  Settings,
  ShieldCheck,
  Send,
  Sparkles,
  Trash2,
  UploadCloud,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";

import SignatureLogoutButton from "./SignatureLogoutButton";
import styles from "./app.module.css";

const PLAN_LABELS = {
  FREE: "Gratuito",
  ESSENTIAL: "Essencial",
  PROFESSIONAL: "Profissional",
  BUSINESS: "Negócios",
  UNLIMITED: "Ilimitado",
};

const PLAN_AI_LIMITS = {
  FREE: 0,
  ESSENTIAL: 2,
  PROFESSIONAL: 5,
  BUSINESS: 10,
  UNLIMITED: null,
};

const PLAN_NOTIFICATION_LIMITS = {
  FREE: 0,
  ESSENTIAL: 2,
  PROFESSIONAL: 5,
  BUSINESS: 10,
  UNLIMITED: null,
};

const PLAN_OPTIONS = [
  { code: "FREE", name: "Gratuito", limit: 3, description: "Para começar e conhecer o produto.", featured: false },
  { code: "ESSENTIAL", name: "Essencial", limit: 10, description: "Para rotinas com poucos documentos.", featured: false, checkoutUrl: "https://loja.infinitepay.io/carlos-henrique-1o7/ndi7446-essencial-assinaturas" },
  { code: "PROFESSIONAL", name: "Profissional", limit: 50, description: "Mais volume para equipes em crescimento.", featured: true, checkoutUrl: "https://loja.infinitepay.io/carlos-henrique-1o7/ebw4403-profissional-assinaturas" },
  { code: "BUSINESS", name: "Negócios", limit: 100, description: "Operações com demanda recorrente.", featured: false, checkoutUrl: "https://loja.infinitepay.io/carlos-henrique-1o7/tnh4256-negocios" },
  { code: "UNLIMITED", name: "Ilimitado", limit: null, description: "Para operações de alto volume.", featured: false, checkoutUrl: "https://loja.infinitepay.io/carlos-henrique-1o7/mwd2623-assinaturas-ilimitadas" },
];

const BLINDAGEM_CHECKOUT_URL = "https://loja.infinitepay.io/carlos-henrique-1o7/eir2319-certificado-blindagem";

const STATUS = {
  DRAFT: { label: "Rascunho", icon: FileClock, className: "statusDraft" },
  SENT: { label: "Enviado", icon: ArrowRight, className: "statusSent" },
  IN_PROGRESS: { label: "Em assinatura", icon: Clock3, className: "statusProgress" },
  COMPLETED: { label: "Concluído", icon: CheckCircle2, className: "statusCompleted" },
  VOIDED: { label: "Cancelado", icon: X, className: "statusVoided" },
  EXPIRED: { label: "Expirado", icon: AlertCircle, className: "statusVoided" },
};

const DOCUMENT_TYPES = {
  CONTRACT: "Contrato",
  AGREEMENT: "Acordo",
  AUTHORIZATION: "Autorização",
  PROPOSAL: "Proposta",
  OTHER: "Outro documento",
};

const initialDraft = {
  title: "",
  documentType: "CONTRACT",
  message: "",
  file: null,
  recipients: [{ name: "", email: "", role: "SIGNER" }],
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 KB";
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`;
}

function StatusBadge({ status }) {
  const config = STATUS[status] || STATUS.DRAFT;
  const Icon = config.icon;
  return (
    <span className={`${styles.status} ${styles[config.className]}`}>
      <Icon size={13} /> {config.label}
    </span>
  );
}

function PlansModal({ open, onClose, subscription, usage }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  const documentsLimit = subscription.documents_limit;
  const documentsUsed = Number(usage.documents_used || 0);
  const remaining = documentsLimit === null ? null : Math.max(0, documentsLimit - documentsUsed);
  const usagePercent = documentsLimit ? Math.min(100, (documentsUsed / documentsLimit) * 100) : 0;

  const aiLimit = PLAN_AI_LIMITS[subscription.plan_code] ?? 0;
  const aiUsed = Number(usage.ai_generations_used || 0);
  const aiRemaining = aiLimit === null ? null : Math.max(0, aiLimit - aiUsed);
  const aiPercent = aiLimit ? Math.min(100, (aiUsed / aiLimit) * 100) : 0;

  const notificationLimit = PLAN_NOTIFICATION_LIMITS[subscription.plan_code] ?? 0;
  const notificationUsed = Number(usage.extrajudicial_notifications_used || 0);
  const notificationRemaining = notificationLimit === null ? null : Math.max(0, notificationLimit - notificationUsed);
  const notificationPercent = notificationLimit ? Math.min(100, (notificationUsed / notificationLimit) * 100) : 0;

  return (
    <div className={styles.modalBackdrop} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`${styles.modal} ${styles.plansModal}`} role="dialog" aria-modal="true" aria-labelledby="plans-modal-title">
        <header className={styles.modalHeader}>
          <div>
            <span>Planos e limites</span>
            <h2 id="plans-modal-title">Escolha o espaço ideal para seus documentos</h2>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </header>

        <div className={styles.plansBody}>
          <section className={styles.currentPlanSummary} aria-label="Resumo do plano atual">
            <div className={styles.currentPlanIdentity}>
              <span><Crown size={20} /></span>
              <div><small>Seu plano atual</small><strong>{PLAN_LABELS[subscription.plan_code] || "Gratuito"}</strong></div>
            </div>
            <div className={styles.currentUsage}>
              <div className={styles.currentUsageRow}><span>Documentos utilizados</span><strong>{documentsLimit === null ? `${documentsUsed} de ∞` : `${documentsUsed} de ${documentsLimit}`}</strong></div>
              <div className={styles.bigUsageTrack}><i style={{ width: `${usagePercent}%` }} /></div>
              <p style={{ marginBottom: "14px" }}>{remaining === null ? "Uso mensal sem limite de documentos." : `${remaining} documento${remaining === 1 ? "" : "s"} disponível${remaining === 1 ? "" : "is"} neste ciclo.`}</p>

              <div className={styles.currentUsageRow}><span>Criações com IA</span><strong>{aiLimit === null ? `${aiUsed} de ∞` : `${aiUsed} de ${aiLimit}`}</strong></div>
              <div className={styles.bigUsageTrack}><i style={{ width: `${aiPercent}%` }} /></div>
              <p style={{ marginBottom: "14px" }}>{aiRemaining === null ? "Criações com IA ilimitadas." : `${aiRemaining} criação${aiRemaining === 1 ? "" : "s"} com IA disponível${aiRemaining === 1 ? "" : "is"} neste ciclo.`}</p>

              <div className={styles.currentUsageRow}><span>Notificações Extrajudiciais</span><strong>{notificationLimit === null ? `${notificationUsed} de ∞` : `${notificationUsed} de ${notificationLimit}`}</strong></div>
              <div className={styles.bigUsageTrack}><i style={{ width: `${notificationPercent}%` }} /></div>
              <p>{notificationRemaining === null ? "Notificações extrajudiciais ilimitadas." : `${notificationRemaining} envio${notificationRemaining === 1 ? "" : "s"} de notificação disponível${notificationRemaining === 1 ? "" : "is"} neste ciclo.`}</p>
            </div>
            <div className={styles.currentRenewal}><span>Próxima renovação</span><strong>{formatDate(subscription.current_period_end)}</strong></div>
          </section>

          <div className={styles.planCatalogHeading}>
            <div><span>Opções disponíveis</span><h3>Aumente seu limite mensal</h3></div>
            <p>A compra é concluída com segurança no checkout oficial da InfinitePay.</p>
          </div>

          <section className={styles.planCards} aria-label="Planos disponíveis">
            {PLAN_OPTIONS.map((plan) => {
              const isCurrent = subscription.plan_code === plan.code;
              return (
                <article key={plan.code} className={`${styles.planCard} ${plan.featured ? styles.planCardFeatured : ""} ${isCurrent ? styles.planCardCurrent : ""}`}>
                  <header>
                    <div><span>{plan.featured ? "Mais escolhido" : isCurrent ? "Plano atual" : "Plano"}</span><h4>{plan.name}</h4></div>
                    {isCurrent && <CheckCircle2 size={19} />}
                  </header>
                  <strong className={styles.planLimit}>{plan.limit === null ? "Ilimitado" : plan.limit}<small>{plan.limit === null ? " documentos por mês" : ` documento${plan.limit === 1 ? "" : "s"} por mês`}</small></strong>
                  <p>{plan.description}</p>
                  <ul>
                    <li><Check size={14} /> Documentos e signatários organizados</li>
                    <li><Check size={14} /> Evidências e validação incluídas</li>
                    <li>
                      <Check size={14} /> {
                        PLAN_AI_LIMITS[plan.code] === 0 ? "Sem criação por IA" :
                        PLAN_AI_LIMITS[plan.code] === null ? "Criação por IA ilimitada" :
                        `${PLAN_AI_LIMITS[plan.code]} criações por IA`
                      }
                    </li>
                    <li>
                      <Check size={14} /> {
                        PLAN_NOTIFICATION_LIMITS[plan.code] === 0 ? "Sem notificações extrajudiciais" :
                        PLAN_NOTIFICATION_LIMITS[plan.code] === null ? "Notificações extrajudiciais ilimitadas" :
                        `${PLAN_NOTIFICATION_LIMITS[plan.code]} notificações extrajudiciais`
                      }
                    </li>
                  </ul>
                  {isCurrent ? (
                    <button type="button" disabled>Plano atual</button>
                  ) : plan.checkoutUrl ? (
                    <a href={plan.checkoutUrl} target="_blank" rel="noopener noreferrer"><CreditCard size={15} /> Comprar plano</a>
                  ) : (
                    <button type="button" disabled>Plano gratuito</button>
                  )}
                </article>
              );
            })}
          </section>

          <section className={styles.addOnCard} aria-label="Adicional de certificado de blindagem">
            <span><ShieldCheck size={22} /></span>
            <div><small>Adicional avulso</small><h3>Certificado de Blindagem</h3><p>Adicione uma camada complementar de proteção e certificação ao documento.</p></div>
            <a href={BLINDAGEM_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">Comprar certificado <ArrowRight size={15} /></a>
          </section>
        </div>
      </section>
    </div>
  );
}

function DraftModal({ open, onClose, onCreated, account }) {
  const fileInputRef = useRef(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose, submitting]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setDraft({
        title: "",
        documentType: "CONTRACT",
        message: "",
        file: null,
        recipients: [
          {
            name: account?.name || "",
            email: account?.email || "",
            role: "SIGNER",
          },
        ],
      });
      setError("");
    }
  }, [open, account]);

  if (!open) return null;

  function selectFile(file) {
    setError("");
    if (!file) return;
    if (file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Selecione um arquivo PDF válido.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("O PDF deve possuir no máximo 15 MB.");
      return;
    }
    setDraft((current) => ({
      ...current,
      file,
      title: current.title || file.name.replace(/\.pdf$/i, ""),
    }));
  }

  function updateRecipient(index, field, value) {
    setDraft((current) => ({
      ...current,
      recipients: current.recipients.map((recipient, recipientIndex) =>
        recipientIndex === index ? { ...recipient, [field]: value } : recipient,
      ),
    }));
  }

  function addRecipient() {
    if (draft.recipients.length >= 20) return;
    setDraft((current) => ({
      ...current,
      recipients: [...current.recipients, { name: "", email: "", role: "SIGNER" }],
    }));
  }

  function removeRecipient(index) {
    if (draft.recipients.length === 1) return;
    setDraft((current) => ({
      ...current,
      recipients: current.recipients.filter((_, recipientIndex) => recipientIndex !== index),
    }));
  }

  function advance() {
    if (!draft.file) return setError("Selecione o PDF que fará parte do envelope.");
    if (draft.title.trim().length < 3) return setError("Informe um título com pelo menos 3 caracteres.");
    setError("");
    setStep(2);
  }

  async function submit(event) {
    event.preventDefault();
    const recipientsValid = draft.recipients.every(
      (recipient) =>
        recipient.name.trim().length >= 2 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email.trim()),
    );
    if (!recipientsValid) return setError("Preencha o nome e o e-mail de todos os destinatários.");

    const emails = draft.recipients.map((recipient) => recipient.email.trim().toLowerCase());
    if (new Set(emails).size !== emails.length) return setError("Cada destinatário deve possuir um e-mail diferente.");

    setSubmitting(true);
    setError("");
    try {
      const payload = new FormData();
      payload.set("title", draft.title.trim());
      payload.set("documentType", draft.documentType);
      payload.set("message", draft.message.trim());
      payload.set("file", draft.file);
      payload.set(
        "recipients",
        JSON.stringify(
          draft.recipients.map((recipient) => ({
            name: recipient.name.trim(),
            email: recipient.email.trim().toLowerCase(),
            role: recipient.role,
          })),
        ),
      );

      const response = await fetch("/api/assinatura/app/envelopes", {
        method: "POST",
        body: payload,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Não foi possível salvar o rascunho.");

      onCreated(data.data);
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Não foi possível salvar o rascunho.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onMouseDown={(event) => event.target === event.currentTarget && !submitting && onClose()}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="draft-modal-title">
        <header className={styles.modalHeader}>
          <div>
            <span>Novo envelope</span>
            <h2 id="draft-modal-title">Preparar documento</h2>
          </div>
          <button type="button" className={styles.modalClose} onClick={onClose} disabled={submitting} aria-label="Fechar"><X size={20} /></button>
        </header>

        <div className={styles.stepper} aria-label={`Etapa ${step} de 2`}>
          <div className={step >= 1 ? styles.stepActive : ""}><span>{step > 1 ? <Check size={14} /> : "1"}</span><div><strong>Documento</strong><small>PDF e identificação</small></div></div>
          <i />
          <div className={step >= 2 ? styles.stepActive : ""}><span>2</span><div><strong>Destinatários</strong><small>Quem participará</small></div></div>
        </div>

        <form onSubmit={submit}>
          <div className={styles.modalBody}>
            {step === 1 ? (
              <>
                <div
                  className={`${styles.dropzone} ${draft.file ? styles.dropzoneSelected : ""}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); selectFile(event.dataTransfer.files?.[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => selectFile(event.target.files?.[0])} />
                  {draft.file ? <FileCheck2 size={28} /> : <UploadCloud size={28} />}
                  <strong>{draft.file ? draft.file.name : "Arraste seu PDF para cá"}</strong>
                  <span>{draft.file ? `${formatBytes(draft.file.size)} · PDF pronto para o rascunho` : "ou clique para selecionar · máximo de 15 MB"}</span>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.fieldWide}><span>Título do envelope</span><input value={draft.title} maxLength={180} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ex.: Contrato de prestação de serviços" /></label>
                  <label><span>Tipo de documento</span><select value={draft.documentType} onChange={(event) => setDraft((current) => ({ ...current, documentType: event.target.value }))}>{Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className={styles.fieldWide}><span>Mensagem aos destinatários <small>opcional</small></span><textarea value={draft.message} maxLength={2000} onChange={(event) => setDraft((current) => ({ ...current, message: event.target.value }))} placeholder="Adicione um contexto breve sobre o documento." /></label>
                </div>
              </>
            ) : (
              <div className={styles.recipientStep}>
                <div className={styles.recipientIntro}><div><strong>Destinatários</strong><span>Defina quem deverá assinar, aprovar ou apenas receber uma cópia.</span></div><button type="button" onClick={addRecipient}><UserPlus size={16} /> Adicionar</button></div>
                <div className={styles.recipientList}>
                  {draft.recipients.map((recipient, index) => (
                    <div className={styles.recipientRow} key={index}>
                      <span className={styles.order}>{index + 1}</span>
                      <label><span>Nome</span><input value={recipient.name} maxLength={140} onChange={(event) => updateRecipient(index, "name", event.target.value)} placeholder="Nome completo" /></label>
                      <label><span>E-mail</span><input type="email" value={recipient.email} maxLength={320} onChange={(event) => updateRecipient(index, "email", event.target.value)} placeholder="email@exemplo.com" /></label>
                      <label><span>Participação</span><select value={recipient.role} onChange={(event) => updateRecipient(index, "role", event.target.value)}><option value="SIGNER">Assinar</option><option value="APPROVER">Aprovar</option><option value="COPY">Receber cópia</option></select></label>
                      <button type="button" className={styles.removeRecipient} onClick={() => removeRecipient(index)} disabled={draft.recipients.length === 1} aria-label="Remover destinatário"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <div className={styles.draftNotice}><ShieldCheck size={18} /><p><strong>Primeiro salvaremos o rascunho.</strong> Depois, use o botão de envio na tabela para disparar os convites. Se você também precisa assinar, inclua o seu próprio e-mail entre os destinatários.</p></div>
              </div>
            )}

            {error && <div className={styles.modalError} role="alert"><AlertCircle size={17} /> {error}</div>}
          </div>

          <footer className={styles.modalFooter}>
            {step === 2 ? <button type="button" className={styles.secondaryButton} onClick={() => { setStep(1); setError(""); }} disabled={submitting}><ArrowLeft size={17} /> Voltar</button> : <button type="button" className={styles.secondaryButton} onClick={onClose}>Cancelar</button>}
            {step === 1 ? <button type="button" className={styles.primaryButton} onClick={advance}>Continuar <ArrowRight size={17} /></button> : <button type="submit" className={styles.primaryButton} disabled={submitting}>{submitting ? <Loader2 size={17} className={styles.spin} /> : <Archive size={17} />}{submitting ? "Salvando..." : "Salvar rascunho"}</button>}
          </footer>
        </form>
      </section>
    </div>
  );
}

function AiCreatorView({ account, subscription, usage, onEnvelopeCreated, onLimitReached }) {
  const [title, setTitle] = useState("Contrato de Prestação de Serviços");
  const [documentType, setDocumentType] = useState("CONTRACT");
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [error, setError] = useState("");
  
  const [recipients, setRecipients] = useState([
    { name: account?.name || "", email: account?.email || "", role: "SIGNER" }
  ]);
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const planCode = subscription.plan_code;
  const aiLimit = PLAN_AI_LIMITS[planCode] ?? 0;
  const aiUsed = Number(usage.ai_generations_used || 0);
  const hasAiFeature = aiLimit !== 0;
  const quotaExceeded = aiLimit !== null && aiUsed >= aiLimit;

  function addRecipient() {
    if (recipients.length >= 20) return;
    setRecipients([...recipients, { name: "", email: "", role: "SIGNER" }]);
  }

  function removeRecipient(index) {
    if (recipients.length === 1) return;
    setRecipients(recipients.filter((_, idx) => idx !== index));
  }

  function updateRecipient(index, field, value) {
    setRecipients(recipients.map((rec, idx) => idx === index ? { ...rec, [field]: value } : rec));
  }

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return setError("Escreva o que deseja no documento.");
    setGenerating(true);
    setError("");
    try {
      const response = await fetch("/api/assinatura/app/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), title: title.trim() })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        if (data?.code === "AI_LIMIT_REACHED") {
          onLimitReached();
        }
        throw new Error(data?.message || "Erro ao gerar minuta.");
      }
      setGeneratedText(data.text);
    } catch (err) {
      setError(err.message || "Não foi possível gerar a minuta agora.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateEnvelope(e) {
    e.preventDefault();
    const recipientsValid = recipients.every(
      (r) => r.name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())
    );
    if (!recipientsValid) return setError("Preencha o nome e e-mail de todos os destinatários.");
    
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/assinatura/app/envelopes/from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          documentType,
          message: message.trim(),
          recipients: recipients.map(r => ({ ...r, email: r.email.trim().toLowerCase() })),
          text: generatedText
        })
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível criar o envelope.");
      }
      onEnvelopeCreated(data.data);
    } catch (err) {
      setError(err.message || "Erro ao salvar envelope.");
    } finally {
      setCreating(false);
    }
  }

  if (!hasAiFeature) {
    return (
      <div className={styles.aiBlockAlert}>
        <Sparkles size={36} style={{ color: "var(--gold)" }} />
        <h2>Recurso exclusivo de Inteligência Artificial</h2>
        <p>A criação assistida de minutas com IA está disponível a partir do plano <strong>Essencial</strong>.</p>
        <button type="button" className={styles.primaryButton} onClick={onLimitReached}>Ver planos e limites</button>
      </div>
    );
  }

  if (quotaExceeded && !generatedText) {
    return (
      <div className={styles.aiBlockAlert}>
        <Sparkles size={36} style={{ color: "var(--gold)" }} />
        <h2>Limite de geração com IA atingido</h2>
        <p>Você utilizou todas as {aiLimit} cotas de geração por IA do seu plano {PLAN_LABELS[planCode]}. Faça upgrade para continuar criando minutas inteligentes.</p>
        <button type="button" className={styles.primaryButton} onClick={onLimitReached}>Aumentar limite <ArrowRight size={15} /></button>
      </div>
    );
  }

  return (
    <div className={styles.aiCreatorContainer}>
      <div className={styles.aiPromptForm}>
        {generatedText ? (
          <div className={styles.aiEditorFlow}>
            <div className={styles.editorPane}>
              <div className={styles.paneTitle}>
                <strong>Minuta Gerada por IA</strong>
                <span>Você pode editar e revisar o texto abaixo livremente</span>
              </div>
              <textarea
                className={styles.aiTextareaEditor}
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                rows={18}
              />
              <div className={styles.editorActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setGeneratedText("")}>
                  Recomeçar / Gerar Outra
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateEnvelope} className={styles.recipientsPane}>
              <div className={styles.paneTitle}>
                <strong>Configurar Envelope</strong>
                <span>Defina quem assinará o documento gerado</span>
              </div>
              
              <div className={styles.aiFormFields}>
                <label><span>Título do documento</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título do documento" required /></label>
                <label><span>Tipo de documento</span><select value={documentType} onChange={(e) => setDocumentType(e.target.value)}><option value="CONTRACT">Contrato</option><option value="AGREEMENT">Acordo</option><option value="AUTHORIZATION">Autorização</option><option value="PROPOSAL">Proposta</option><option value="OTHER">Outro documento</option></select></label>
              </div>

              <div className={styles.aiRecipientsSection}>
                <div className={styles.aiRecipientsHeader}>
                  <span>Destinatários ({recipients.length})</span>
                  <button type="button" onClick={addRecipient}><Plus size={14} /> Adicionar</button>
                </div>
                
                <div className={styles.aiRecipientsList}>
                  {recipients.map((recipient, index) => (
                    <div key={index} className={styles.aiRecipientRow}>
                      <label><span>Nome</span><input value={recipient.name} onChange={(e) => updateRecipient(index, "name", e.target.value)} placeholder="Nome completo" required /></label>
                      <label><span>E-mail</span><input type="email" value={recipient.email} onChange={(e) => updateRecipient(index, "email", e.target.value)} placeholder="email@exemplo.com" required /></label>
                      <label><span>Participação</span><select value={recipient.role} onChange={(e) => updateRecipient(index, "role", e.target.value)}><option value="SIGNER">Assinar</option><option value="APPROVER">Aprovar</option><option value="COPY">Cópia</option></select></label>
                      <button type="button" className={styles.aiRemoveRecipient} onClick={() => removeRecipient(index)} disabled={recipients.length === 1}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              </div>

              <label className={styles.aiMessageField}><span>Mensagem aos destinatários <small>opcional</small></span><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Breve contexto..." rows={2} /></label>

              {error && <div className={styles.aiError} role="alert"><AlertCircle size={15} /> {error}</div>}

              <button type="submit" className={styles.primaryButton} style={{ width: "100%", marginTop: "15px" }} disabled={creating}>
                {creating ? <Loader2 size={16} className={styles.spin} /> : <FileCheck2 size={16} />}
                {creating ? "Criando rascunho..." : "Criar Rascunho de Envelope"}
              </button>
            </form>
          </div>
        ) : (
          <form onSubmit={handleGenerate}>
            <div className={styles.aiFormGrid}>
              <label className={styles.fieldWide}>
                <span>Título da Minuta</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Contrato de Prestação de Serviços de TI" required />
              </label>
              <label className={styles.fieldWide}>
                <span>Instruções e Regras do Documento</span>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Descreva o que o documento precisa conter de forma detalhada. Ex: Detalhar cláusula penal de 10%, vigência de 12 meses, foro de São Paulo e obrigações da contratada Z..."
                  rows={8}
                  required
                />
              </label>
            </div>

            <div className={styles.aiQuotaMeter}>
              <span>Uso de IA neste ciclo: <strong>{aiLimit === null ? `${aiUsed} de ∞` : `${aiUsed} de ${aiLimit} gerações`}</strong></span>
            </div>

            {error && <div className={styles.aiError} role="alert"><AlertCircle size={15} /> {error}</div>}

            <button type="submit" className={styles.primaryButton} disabled={generating} style={{ marginTop: "15px" }}>
              {generating ? <Loader2 size={16} className={styles.spin} /> : <Sparkles size={16} />}
              {generating ? "Gerando minuta técnica..." : "Gerar Documento com IA"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ExtrajudicialNotificationsView({ account, subscription, usage, onNotificationSent, onLimitReached }) {
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({ total: 0, read: 0, located: 0, errors: 0, pending: 0, readRate: 0 });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal Send states
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ mode: "draft", recipientEmail: "", tone: "formal", draftText: "", caseId: "" });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef(null);

  // Autocomplete states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);

  // Details tracking states
  const [trackingDetail, setTrackingDetail] = useState(null);

  const planCode = subscription.plan_code;
  const limit = PLAN_NOTIFICATION_LIMITS[planCode] ?? 0;
  const used = usage.extrajudicial_notifications_used || 0;
  const remaining = limit === null ? null : Math.max(0, limit - used);
  const hasFeature = limit !== 0;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Load list
  const load = useCallback(async (targetPage = 1) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(targetPage),
      pageSize: "12",
      status: filters.status,
    });
    if (debouncedSearch) params.set("search", debouncedSearch);

    try {
      const response = await fetch(`/api/assinatura/app/notificacao-extrajudicial?${params}`);
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar as notificações.");
      }
      setItems(data.data || []);
      setMetrics(data.metrics || { total: 0, read: 0, located: 0, errors: 0, pending: 0, readRate: 0 });
      setClients(data.clients || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setPage(targetPage);
    } catch (err) {
      console.error(err);
      setError(err.message || "Erro ao carregar notificações.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters.status]);

  useEffect(() => {
    if (hasFeature) {
      load(1);
    }
  }, [hasFeature, load]);

  // Autocomplete filtering
  const handleEmailChange = (val) => {
    setForm(f => ({ ...f, recipientEmail: val }));
    setFieldErrors(e => ({ ...e, recipientEmail: "" }));
    if (!val.trim()) {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const query = val.toLowerCase().trim();
    const matches = clients.filter(c => c.name.toLowerCase().includes(query) || c.email.toLowerCase().includes(query));
    setFilteredSuggestions(matches);
    setShowSuggestions(matches.length > 0);
  };

  const selectSuggestion = (c) => {
    setForm(f => ({ ...f, recipientEmail: c.email }));
    setFilteredSuggestions([]);
    setShowSuggestions(false);
  };

  // Generate draft via IA
  const handleGenerateDraft = async () => {
    if (!form.draftText.trim()) {
      setFieldErrors(e => ({ ...e, draftText: "Descreva brevemente as instruções para a minuta." }));
      return;
    }
    setGeneratingDraft(true);
    setFormError("");
    try {
      const response = await fetch("/api/assinatura/app/notificacao-extrajudicial/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: form.draftText.trim(), tone: form.tone })
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível gerar a minuta.");
      }
      setForm(f => ({ ...f, draftText: data.text }));
    } catch (err) {
      setFormError(err.message || "Erro ao gerar minuta por IA.");
    } finally {
      setGeneratingDraft(false);
    }
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const errors = {};
    if (!form.recipientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.recipientEmail.trim())) {
      errors.recipientEmail = "E-mail do destinatário inválido.";
    }
    if (form.mode === "draft" && !form.draftText.trim()) {
      errors.draftText = "Escreva ou gere o texto da minuta.";
    }
    if (form.mode === "upload" && !file) {
      errors.file = "Selecione o arquivo PDF da notificação.";
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.set("recipient_email", form.recipientEmail.trim().toLowerCase());
      payload.set("tone", form.tone);
      if (form.caseId) payload.set("case_id", form.caseId.trim());
      if (form.mode === "upload") {
        payload.set("file", file);
      } else {
        payload.set("draft_text", form.draftText.trim());
      }

      const response = await fetch("/api/assinatura/app/notificacao-extrajudicial/enviar", {
        method: "POST",
        body: payload
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        if (data?.code === "NOTIFICATION_LIMIT_REACHED") {
          onLimitReached();
          setModalOpen(false);
          return;
        }
        throw new Error(data?.message || "Erro ao enviar a notificação.");
      }

      onNotificationSent(data.data);
      setModalOpen(false);
      load(1);
    } catch (err) {
      setFormError(err.message || "Não foi possível enviar a notificação.");
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic jsPDF certificate downloader
  const downloadNotificationCertificate = async (notification) => {
    if (!notification?.id || !notification?.protocol || !notification?.hash) {
      alert("A notificação não possui todos os dados necessários para o certificado.");
      return;
    }

    try {
      const { default: jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const isRead = notification.status === "lido";

      const formatCertificateDate = (val) => {
        if (!val) return "Não registrado";
        const date = new Date(val);
        if (isNaN(date.getTime())) return "Não registrado";
        return new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "long",
          timeStyle: "medium",
        }).format(date);
      };

      const sanitizeFileName = (val) => {
        return String(val || "notificacao")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 90) || "notificacao";
      };

      const addField = (pdfDoc, label, value, yVal) => {
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(8);
        pdfDoc.setTextColor(105, 105, 112);
        pdfDoc.text(label.toUpperCase(), 18, yVal);

        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(9.5);
        pdfDoc.setTextColor(24, 24, 27);
        const lines = pdfDoc.splitTextToSize(String(value || "Não registrado"), 118);
        pdfDoc.text(lines, 70, yVal);
        return yVal + Math.max(9, lines.length * 5.2);
      };

      pdf.setProperties({
        title: `Certificado de Notificação - ${notification.protocol}`,
        subject: "Rastreabilidade de notificação extrajudicial digital",
        author: "Social Jurídico",
        creator: "Social Jurídico",
      });

      pdf.setFillColor(9, 10, 13);
      pdf.rect(0, 0, 210, 46, "F");
      pdf.setTextColor(230, 189, 72);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.text("SOCIAL JURÍDICO", 18, 15);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.text("Certificado de Rastreabilidade", 18, 29);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(205, 205, 212);
      pdf.text("Notificação Extrajudicial Digital Blindada", 18, 37);

      pdf.setDrawColor(230, 189, 72);
      pdf.setLineWidth(0.6);
      pdf.roundedRect(18, 55, 174, 27, 3, 3);
      pdf.setTextColor(95, 75, 20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.text("PROTOCOLO DE ENVIO", 24, 65);
      pdf.setTextColor(24, 24, 27);
      pdf.setFontSize(16);
      pdf.text(notification.protocol, 24, 75);

      pdf.setFillColor(isRead ? 233 : 247, isRead ? 248 : 244, isRead ? 239 : 232);
      pdf.setDrawColor(isRead ? 34 : 230, isRead ? 197 : 189, isRead ? 94 : 72);
      pdf.roundedRect(145, 61, 39, 14, 3, 3, "FD");
      pdf.setFontSize(8);
      pdf.setTextColor(isRead ? 21 : 95, isRead ? 128 : 75, isRead ? 61 : 20);
      pdf.text(isRead ? "CIÊNCIA REGISTRADA" : "AGUARDANDO CIÊNCIA", 164.5, 69.5, {
        align: "center",
      });

      let y = 96;
      y = addField(pdf, "Destinatário", notification.recipientEmail, y);
      y = addField(pdf, "Documento", notification.fileName, y);
      y = addField(pdf, "Responsável", notification.lawyerName, y);
      y = addField(pdf, "Cliente vinculado", notification.clientName, y);
      y = addField(pdf, "Enviado em", formatCertificateDate(notification.createdAt), y);
      y = addField(pdf, "Primeira leitura", formatCertificateDate(notification.readAt), y);
      y = addField(pdf, "IP da leitura", notification.readIp, y);
      y = addField(pdf, "Geolocalização", notification.readGeo, y);
      y = addField(pdf, "Navegador da leitura", notification.readUserAgent, y);

      y += 3;
      pdf.setFillColor(247, 244, 232);
      pdf.setDrawColor(230, 189, 72);
      pdf.roundedRect(18, y, 174, 45, 3, 3, "FD");
      pdf.setTextColor(95, 75, 20);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.text("HASH CRIPTOGRÁFICO SHA-512 DO DOCUMENTO", 24, y + 10);
      pdf.setFont("courier", "normal");
      pdf.setFontSize(7.2);
      pdf.text(pdf.splitTextToSize(notification.hash, 160), 24, y + 18);

      y += 58;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(24, 24, 27);
      pdf.text("Evidências registradas", 18, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.8);
      pdf.setTextColor(75, 75, 82);
      const evidenceText = isRead
        ? "O link exclusivo foi acessado pelo destinatário. A plataforma registrou data, horário, endereço IP, agente do navegador e, quando autorizada, geolocalização do dispositivo."
        : "O envio foi registrado e o link exclusivo permanece disponível ao destinatário. Até a emissão deste certificado, a plataforma ainda não registrou a primeira leitura.";
      pdf.text(pdf.splitTextToSize(evidenceText, 174), 18, y + 7);

      y += 29;
      pdf.setDrawColor(220, 220, 224);
      pdf.line(18, y, 192, y);
      pdf.setFontSize(7.8);
      pdf.setTextColor(105, 105, 112);
      pdf.text(
        pdf.splitTextToSize(
          "Este certificado consolida evidências técnicas de envio, integridade e acesso. Sua força probatória deve ser analisada em conjunto com os demais elementos do caso e com a legislação aplicável.",
          174
        ),
        18,
        y + 8
      );

      pdf.text(`Emitido em ${formatCertificateDate(new Date().toISOString())}.`, 18, 283);
      pdf.text("www.socialjuridico.com.br", 192, 283, { align: "right" });

      pdf.save(
        `certificado-notificacao-${sanitizeFileName(notification.protocol)}.pdf`
      );
    } catch (certErr) {
      console.error(certErr);
      alert("Houve um erro ao tentar gerar o certificado em PDF.");
    }
  };

  if (!hasFeature) {
    return (
      <div className={styles.aiBlockAlert}>
        <BellRing size={36} style={{ color: "var(--gold)" }} />
        <h2>Notificação Extrajudicial Digital</h2>
        <p>O envio e rastreamento de notificações extrajudiciais está disponível a partir do plano <strong>Essencial</strong>.</p>
        <button type="button" className={styles.primaryButton} onClick={onLimitReached}>Ver planos e limites</button>
      </div>
    );
  }

  return (
    <div className={styles.notificationsView}>
      {/* Metrics Grid */}
      <section className={styles.metricsGrid} style={{ marginTop: 0 }} aria-label="Métricas de notificações">
        <article>
          <div>
            <span>Ciência comprovada</span>
            <strong>{metrics.read}</strong>
            <small>Notificações abertas</small>
          </div>
          <i className={styles.metricSuccess}><BadgeCheck size={20} /></i>
        </article>
        <article>
          <div>
            <span>Taxa de leitura</span>
            <strong>{metrics.readRate}%</strong>
            <small>Percentual de abertura</small>
          </div>
          <i className={styles.metricNeutral}><FileText size={20} /></i>
        </article>
        <article>
          <div>
            <span>Destinatários localizados</span>
            <strong>{metrics.located}</strong>
            <small>Evidência de GPS aceita</small>
          </div>
          <i className={styles.metricPending}><MapPin size={20} /></i>
        </article>
        <article>
          <div>
            <span>Notificações enviadas</span>
            <strong>{metrics.total}</strong>
            <small>No ciclo atual: {used} de {limit ?? "∞"}</small>
          </div>
          <i className={styles.metricDraft}><BellRing size={20} /></i>
        </article>
      </section>

      {/* Main Panel */}
      <section className={styles.documentsPanel}>
        <header className={styles.panelHeader}>
          <div>
            <span>Histórico</span>
            <h2>Notificações Enviadas</h2>
          </div>
          <div className={styles.filters}>
            <label>
              <Search size={16} />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                placeholder="Buscar por e-mail, protocolo..."
              />
            </label>
            <select value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="all">Todos os status</option>
              <option value="enviado">Enviado</option>
              <option value="lido">Ciência confirmada</option>
              <option value="erro_envio">Erro de envio</option>
            </select>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => {
                if (limit !== null && used >= limit) {
                  onLimitReached();
                } else {
                  setForm({ mode: "draft", recipientEmail: "", tone: "formal", draftText: "", caseId: "" });
                  setFile(null);
                  setFieldErrors({});
                  setFormError("");
                  setModalOpen(true);
                }
              }}
            >
              <Plus size={16} /> Nova notificação
            </button>
          </div>
        </header>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <Loader2 className={styles.spin} size={28} />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <div><BellRing size={28} /></div>
            <h3>Nenhuma notificação encontrada</h3>
            <p>Envie sua primeira notificação extrajudicial com rastreabilidade digital e cadeia de custódia blindada.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Protocolo</th>
                    <th>Destinatário</th>
                    <th>Ref / Caso</th>
                    <th>Status</th>
                    <th>Enviado em</th>
                    <th>Evidências</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td><strong style={{ color: "rgba(255, 255, 255, 0.85)" }}>{item.protocol}</strong></td>
                      <td>{item.recipientEmail}</td>
                      <td>{item.caseId || "—"}</td>
                      <td>
                        <span
                          className={`${styles.status} ${
                            item.status === "lido"
                              ? styles.statusCompleted
                              : item.status === "erro_envio"
                              ? styles.statusVoided
                              : styles.statusSent
                          }`}
                        >
                          {item.status === "lido" ? "Ciência" : item.status === "erro_envio" ? "Erro" : "Enviado"}
                        </span>
                      </td>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {item.hasReadEvidence && (
                            <span title="IP e User Agent registrados" style={{ color: "var(--gold-soft)", display: "flex" }}>
                              <ShieldCheck size={15} />
                            </span>
                          )}
                          {item.hasLocation && (
                            <span title="Localização GPS confirmada" style={{ color: "#67d5a6", display: "flex" }}>
                              <MapPin size={15} />
                            </span>
                          )}
                          {!item.hasReadEvidence && <span style={{ color: "var(--muted)" }}>Aguardando</span>}
                        </div>
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <a href={item.documentUrl} target="_blank" rel="noopener noreferrer" title="Baixar Notificação (PDF)">
                            <FileDown size={16} />
                          </a>
                          <button
                            type="button"
                            title="Certificado de Rastreabilidade"
                            onClick={() => downloadNotificationCertificate({
                              id: item.id,
                              protocol: item.protocol,
                              recipientEmail: item.recipientEmail,
                              fileName: item.fileName,
                              lawyerName: account.name,
                              clientName: item.caseId || "Portal de Assinaturas",
                              createdAt: item.createdAt,
                              readAt: item.readAt,
                              readIp: item.readIp,
                              readGeo: item.readGeo,
                              readUserAgent: item.readUserAgent,
                              hash: item.hash,
                              status: item.status,
                            })}
                          >
                            <BadgeCheck size={16} />
                          </button>
                          <button
                            type="button"
                            title="Ver detalhes de custódia"
                            onClick={() => setTrackingDetail(item)}
                          >
                            <ExternalLink size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", padding: "20px", borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  style={{ minHeight: "32px", padding: "0 12px" }}
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                >
                  Anterior
                </button>
                <span style={{ alignSelf: "center", fontSize: "0.65rem", color: "var(--muted)" }}>Página {page} de {totalPages}</span>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  style={{ minHeight: "32px", padding: "0 12px" }}
                  disabled={page >= totalPages}
                  onClick={() => load(page + 1)}
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Details modal */}
      {trackingDetail && (
        <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && setTrackingDetail(null)}>
          <section className={styles.modal} style={{ maxWidth: "560px" }}>
            <header className={styles.modalHeader}>
              <div>
                <span>Trilha de Custódia</span>
                <h2>Evidências da Notificação {trackingDetail.protocol}</h2>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setTrackingDetail(null)}><X size={20} /></button>
            </header>
            <div className={styles.modalBody} style={{ fontSize: "0.68rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <strong style={{ color: "rgba(255,255,255,0.4)" }}>INTEGRIDADE DO DOCUMENTO (SHA-512)</strong>
                  <div style={{ fontFamily: "monospace", wordBreak: "break-all", background: "#0d0f11", padding: "8px", borderRadius: "4px", marginTop: "4px", color: "var(--gold-soft)" }}>
                    {trackingDetail.hash}
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <strong style={{ color: "rgba(255,255,255,0.4)" }}>STATUS DO ENVIO</strong>
                    <p style={{ margin: "4px 0 0 0", fontWeight: "bold" }}>
                      {trackingDetail.status === "lido" ? "Ciência registrada" : trackingDetail.status === "erro_envio" ? "Erro no envio" : "Enviado"}
                    </p>
                  </div>
                  <div>
                    <strong style={{ color: "rgba(255,255,255,0.4)" }}>ENVIADO EM</strong>
                    <p style={{ margin: "4px 0 0 0" }}>{formatDate(trackingDetail.createdAt)}</p>
                  </div>
                </div>
                {trackingDetail.status === "lido" ? (
                  <>
                    <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px" }}>
                      <strong style={{ color: "rgba(255,255,255,0.4)" }}>CONFIRMAÇÃO DE CIÊNCIA</strong>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
                        <div>
                          <strong>Data/Hora Leitura:</strong>
                          <p style={{ margin: "2px 0 0 0" }}>{formatDate(trackingDetail.readAt)}</p>
                        </div>
                        <div>
                          <strong>IP do Acesso:</strong>
                          <p style={{ margin: "2px 0 0 0" }}>{trackingDetail.readIp || "Não registrado"}</p>
                        </div>
                      </div>
                      <div style={{ marginTop: "10px" }}>
                        <strong>Geolocalização (GPS):</strong>
                        <p style={{ margin: "2px 0 0 0", display: "flex", alignItems: "center", gap: "4px" }}>
                          <MapPin size={12} /> {trackingDetail.readGeo || "Não autorizada pelo destinatário"}
                        </p>
                      </div>
                      <div style={{ marginTop: "10px" }}>
                        <strong>Navegador / Dispositivo:</strong>
                        <p style={{ margin: "2px 0 0 0", fontFamily: "monospace", fontSize: "0.6rem", color: "var(--muted)", wordBreak: "break-all" }}>
                          {trackingDetail.readUserAgent || "Não registrado"}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: "12px", color: "var(--muted)" }}>
                    Aguardando abertura ou leitura do destinatário para coletar evidências eletrônicas complementares.
                  </div>
                )}
              </div>
            </div>
            <footer className={styles.modalFooter}>
              <button type="button" className={styles.secondaryButton} onClick={() => setTrackingDetail(null)}>Fechar</button>
            </footer>
          </section>
        </div>
      )}

      {/* New Notification Modal */}
      {modalOpen && (
        <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && !submitting && setModalOpen(false)}>
          <section className={styles.modal} style={{ maxWidth: "700px" }}>
            <header className={styles.modalHeader}>
              <div>
                <span>Novo Envio</span>
                <h2>Enviar Notificação Extrajudicial</h2>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setModalOpen(false)} disabled={submitting}><X size={20} /></button>
            </header>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                  <div style={{ position: "relative" }}>
                    <label className={styles.aiFormFields} style={{ margin: 0 }}>
                      <span>E-mail do Destinatário</span>
                      <input
                        type="email"
                        value={form.recipientEmail}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        onFocus={() => { if (filteredSuggestions.length > 0) setShowSuggestions(true); }}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder="email@exemplo.com"
                        required
                        disabled={submitting}
                      />
                    </label>
                    {showSuggestions && (
                      <div
                        style={{
                          position: "absolute",
                          zIndex: 10,
                          top: "100%",
                          left: 0,
                          right: 0,
                          background: "#16191d",
                          border: "1px solid var(--line)",
                          borderRadius: "4px",
                          maxHeight: "150px",
                          overflowY: "auto",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                        }}
                      >
                        {filteredSuggestions.map((c) => (
                          <div
                            key={c.email}
                            onClick={() => selectSuggestion(c)}
                            style={{ padding: "8px 12px", cursor: "pointer", fontSize: "0.62rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                            onMouseDown={(e) => e.preventDefault()}
                          >
                            <strong>{c.name}</strong> <span style={{ color: "var(--muted)" }}>({c.email})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {fieldErrors.recipientEmail && <p style={{ color: "#ed8a8a", fontSize: "0.55rem", margin: "4px 0 0 0" }}>{fieldErrors.recipientEmail}</p>}
                  </div>
                  <div>
                    <label className={styles.aiFormFields} style={{ margin: 0 }}>
                      <span>Caso / Referência <small>opcional</small></span>
                      <input
                        type="text"
                        value={form.caseId}
                        onChange={(e) => setForm(f => ({ ...f, caseId: e.target.value }))}
                        placeholder="Ex: Proc. 12345 ou Contrato X"
                        disabled={submitting}
                      />
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "15px", marginBottom: "14px", borderBottom: "1px solid var(--line)", paddingBottom: "10px" }}>
                  <button
                    type="button"
                    style={{ background: "transparent", border: 0, borderBottom: form.mode === "draft" ? "2px solid var(--gold)" : "2px solid transparent", color: form.mode === "draft" ? "var(--gold-soft)" : "var(--muted)", fontWeight: "bold", padding: "5px 0", fontSize: "0.65rem", cursor: "pointer" }}
                    onClick={() => setForm(f => ({ ...f, mode: "draft" }))}
                    disabled={submitting}
                  >
                    Escrever minuta
                  </button>
                  <button
                    type="button"
                    style={{ background: "transparent", border: 0, borderBottom: form.mode === "upload" ? "2px solid var(--gold)" : "2px solid transparent", color: form.mode === "upload" ? "var(--gold-soft)" : "var(--muted)", fontWeight: "bold", padding: "5px 0", fontSize: "0.65rem", cursor: "pointer" }}
                    onClick={() => setForm(f => ({ ...f, mode: "upload" }))}
                    disabled={submitting}
                  >
                    Anexar PDF pronto
                  </button>
                </div>

                {form.mode === "draft" ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <label className={styles.aiFormFields} style={{ margin: 0, flexDirection: "row", alignItems: "center", gap: "6px" }}>
                        <span>Tom da redação:</span>
                        <select
                          value={form.tone}
                          onChange={(e) => setForm(f => ({ ...f, tone: e.target.value }))}
                          style={{ height: "28px", padding: "0 8px", fontSize: "0.6rem" }}
                          disabled={submitting}
                        >
                          <option value="formal">Formal</option>
                          <option value="conciliador">Conciliador</option>
                          <option value="assertivo">Assertivo / Cobrança</option>
                        </select>
                      </label>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        style={{ minHeight: "28px", fontSize: "0.58rem", padding: "0 10px" }}
                        disabled={generatingDraft || submitting}
                        onClick={handleGenerateDraft}
                      >
                        {generatingDraft ? <Loader2 className={styles.spin} size={11} /> : <Sparkles size={11} />}
                        {generatingDraft ? "Gerando..." : "Redigir com IA"}
                      </button>
                    </div>
                    <label className={styles.aiMessageField} style={{ gap: "4px" }}>
                      <span>Texto da minuta ou instruções para a IA</span>
                      <textarea
                        value={form.draftText}
                        onChange={(e) => {
                          setForm(f => ({ ...f, draftText: e.target.value }));
                          setFieldErrors(err => ({ ...err, draftText: "" }));
                        }}
                        placeholder="Insira o texto da sua notificação extrajudicial aqui, ou descreva as regras do caso para a nossa IA gerar uma redação jurídica qualificada."
                        rows={10}
                        required
                        disabled={submitting || generatingDraft}
                        style={{ background: "#0d0f12", border: "1px solid var(--line)", color: "#fff", borderRadius: "5px", fontSize: "0.68rem", padding: "10px", resize: "vertical" }}
                      />
                    </label>
                    {fieldErrors.draftText && <p style={{ color: "#ed8a8a", fontSize: "0.55rem", margin: "4px 0 0 0" }}>{fieldErrors.draftText}</p>}
                  </div>
                ) : (
                  <div>
                    <div
                      className={`${styles.dropzone} ${file ? styles.dropzoneSelected : ""}`}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: "30px 20px" }}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => {
                          const selected = e.target.files?.[0];
                          if (selected) {
                            if (selected.type !== "application/pdf") {
                              setFieldErrors(err => ({ ...err, file: "Selecione um arquivo PDF válido." }));
                              setFile(null);
                            } else if (selected.size > 15 * 1024 * 1024) {
                              setFieldErrors(err => ({ ...err, file: "O arquivo deve possuir no máximo 15 MB." }));
                              setFile(null);
                            } else {
                              setFile(selected);
                              setFieldErrors(err => ({ ...err, file: "" }));
                            }
                          }
                        }}
                        disabled={submitting}
                      />
                      {file ? <FileCheck2 size={24} /> : <UploadCloud size={24} />}
                      <strong>{file ? file.name : "Arraste seu PDF para cá"}</strong>
                      <span>{file ? `${formatBytes(file.size)} · PDF selecionado` : "ou clique para selecionar · máximo de 15 MB"}</span>
                    </div>
                    {fieldErrors.file && <p style={{ color: "#ed8a8a", fontSize: "0.55rem", margin: "4px 0 0 0", textAlign: "center" }}>{fieldErrors.file}</p>}
                  </div>
                )}

                {formError && (
                  <div className={styles.modalError} role="alert" style={{ marginTop: "14px" }}>
                    <AlertCircle size={15} /> {formError}
                  </div>
                )}
              </div>
              <footer className={styles.modalFooter}>
                <button type="button" className={styles.secondaryButton} onClick={() => setModalOpen(false)} disabled={submitting}>Cancelar</button>
                <button type="submit" className={styles.primaryButton} disabled={submitting || generatingDraft}>
                  {submitting ? <Loader2 size={15} className={styles.spin} /> : <Send size={15} />}
                  {submitting ? "Processando..." : "Enviar Notificação"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default function SignatureDashboardClient({
  account,
  organization,
  subscription,
  usage,
  initialEnvelopes,
  migrationRequired,
}) {
  const [envelopes, setEnvelopes] = useState(initialEnvelopes);
  const [currentUsage, setCurrentUsage] = useState(usage);
  const [activeView, setActiveView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const [signingId, setSigningId] = useState(null);
  const [notice, setNotice] = useState("");

  const metrics = useMemo(() => ({
    total: envelopes.length,
    completed: envelopes.filter((item) => item.status === "COMPLETED").length,
    progress: envelopes.filter((item) => ["SENT", "IN_PROGRESS"].includes(item.status)).length,
    drafts: envelopes.filter((item) => item.status === "DRAFT").length,
  }), [envelopes]);

  const filteredEnvelopes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return envelopes.filter((item) => {
      const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchesSearch = !query || item.title.toLowerCase().includes(query) || item.verificationCode.toLowerCase().includes(query) || item.recipients.some((recipient) => recipient.name.toLowerCase().includes(query) || recipient.email.includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [envelopes, search, statusFilter]);

  const documentsLimit = subscription.documents_limit;
  const documentsUsed = currentUsage.documents_used || 0;
  const usagePercent = documentsLimit ? Math.min(100, (documentsUsed / documentsLimit) * 100) : 0;

  function copyCode(code) {
    navigator.clipboard.writeText(code).then(() => {
      setNotice("Código copiado.");
      window.setTimeout(() => setNotice(""), 1800);
    });
  }

  async function deleteDraft(item) {
    if (!window.confirm(`Excluir o rascunho “${item.title}”?`)) return;
    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/assinatura/app/envelopes?id=${encodeURIComponent(item.id)}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) throw new Error(data?.message || "Não foi possível excluir.");
      setEnvelopes((current) => current.filter((envelope) => envelope.id !== item.id));
    } catch (error) {
      setNotice(error.message || "Não foi possível excluir o rascunho.");
    } finally {
      setDeletingId(null);
    }
  }

  async function sendEnvelope(item) {
    const pending = item.recipients.filter((recipient) => !["COMPLETED", "DECLINED"].includes(recipient.status));
    const firstSend = item.status === "DRAFT";
    const confirmation = firstSend
      ? `Enviar “${item.title}” para ${pending.length} destinatário${pending.length === 1 ? "" : "s"}? O envio consumirá 1 documento da franquia mensal.`
      : `Reenviar os convites pendentes de “${item.title}”?`;
    if (!window.confirm(confirmation)) return;

    setSendingId(item.id);
    setNotice("");
    try {
      const response = await fetch(`/api/assinatura/app/envelopes/${encodeURIComponent(item.id)}/send`, {
        method: "POST",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        if (data?.code === "DOCUMENT_LIMIT_REACHED") setPlansModalOpen(true);
        throw new Error(data?.message || "Não foi possível enviar o envelope.");
      }

      setEnvelopes((current) => current.map((envelope) => envelope.id === item.id ? data.data : envelope));
      if (data.firstSend) {
        setCurrentUsage((current) => ({
          ...current,
          documents_used: Number(current.documents_used || 0) + 1,
        }));
      }
      setNotice(data.message || "Convites enviados por e-mail.");
      window.setTimeout(() => setNotice(""), 4200);
    } catch (sendError) {
      setNotice(sendError.message || "Não foi possível enviar o envelope.");
    } finally {
      setSendingId(null);
    }
  }

  async function signEnvelope(item) {
    setSigningId(item.id);
    setNotice("");
    try {
      const response = await fetch(`/api/assinatura/app/envelopes/${encodeURIComponent(item.id)}/sign-redirect`, {
        method: "POST",
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível iniciar a assinatura.");
      }

      const newWindow = window.open(data.url, "_blank");
      if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
        window.location.href = data.url;
      }
    } catch (error) {
      setNotice(error.message || "Não foi possível iniciar a assinatura.");
    } finally {
      setSigningId(null);
    }
  }

  const navItems = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "documents", label: "Documentos", icon: FileSignature, count: envelopes.length },
    { id: "ai_creator", label: "Criar com IA", icon: Sparkles },
    { id: "extrajudicial_notifications", label: "Notificação Extrajudicial", icon: BellRing },
  ];

  return (
    <div className={styles.productShell}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.sidebarBrand}>
          <span><FileSignature size={21} /></span>
          <div><strong>Social Jurídico</strong><small>Assinatura</small></div>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>

        <button type="button" className={styles.newEnvelopeButton} onClick={() => setModalOpen(true)} disabled={migrationRequired}><Plus size={18} /> Novo documento</button>

        <nav className={styles.sidebarNav} aria-label="Navegação do produto">
          <span className={styles.navLabel}>Workspace</span>
          {navItems.map(({ id, label, icon: Icon, count }) => <button key={id} type="button" className={activeView === id ? styles.navActive : ""} onClick={() => { setActiveView(id); setSidebarOpen(false); }}><Icon size={18} /><span>{label}</span>{typeof count === "number" && <small>{count}</small>}</button>)}
          <Link href="/validar"><QrCode size={18} /><span>Validar documento</span></Link>
          <span className={styles.navLabel}>Conta</span>
          <button type="button" onClick={() => { setPlansModalOpen(true); setSidebarOpen(false); }}><Gauge size={18} /><span>Planos e limites</span></button>
          <button type="button" disabled><UsersRound size={18} /><span>Equipe</span><em>Em breve</em></button>
          <button type="button" disabled><Settings size={18} /><span>Configurações</span></button>
        </nav>

        <div className={styles.sidebarPlan}>
          <div><span>Plano {PLAN_LABELS[subscription.plan_code] || "Gratuito"}</span><strong>{documentsLimit === null ? "Ilimitado" : `${documentsUsed} de ${documentsLimit}`}</strong></div>
          <div className={styles.usageTrack}><i style={{ width: `${usagePercent}%` }} /></div>
          <p style={{ marginBottom: "12px" }}>{documentsLimit === null ? "Documentos sem limite mensal" : `${Math.max(0, documentsLimit - documentsUsed)} documentos disponíveis`}</p>

          {PLAN_AI_LIMITS[subscription.plan_code] !== 0 && (
            <>
              <div>
                <span>Uso de IA</span>
                <strong>
                  {PLAN_AI_LIMITS[subscription.plan_code] === null
                    ? `${Number(currentUsage.ai_generations_used || 0)} de ∞`
                    : `${Number(currentUsage.ai_generations_used || 0)} de ${PLAN_AI_LIMITS[subscription.plan_code]}`}
                </strong>
              </div>
              <div className={styles.usageTrack}>
                <i
                  style={{
                    width: `${
                      PLAN_AI_LIMITS[subscription.plan_code]
                        ? Math.min(
                            100,
                            ((currentUsage.ai_generations_used || 0) /
                              PLAN_AI_LIMITS[subscription.plan_code]) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p style={{ marginBottom: "12px" }}>
                {PLAN_AI_LIMITS[subscription.plan_code] === null
                  ? "Criações com IA ilimitadas"
                  : `${Math.max(
                      0,
                      PLAN_AI_LIMITS[subscription.plan_code] - (currentUsage.ai_generations_used || 0),
                    )} criações com IA disponíveis`}
              </p>
            </>
          )}

          {PLAN_NOTIFICATION_LIMITS[subscription.plan_code] !== 0 && (
            <>
              <div>
                <span>Notificações Extrajudiciais</span>
                <strong>
                  {PLAN_NOTIFICATION_LIMITS[subscription.plan_code] === null
                    ? `${Number(currentUsage.extrajudicial_notifications_used || 0)} de ∞`
                    : `${Number(currentUsage.extrajudicial_notifications_used || 0)} de ${PLAN_NOTIFICATION_LIMITS[subscription.plan_code]}`}
                </strong>
              </div>
              <div className={styles.usageTrack}>
                <i
                  style={{
                    width: `${
                      PLAN_NOTIFICATION_LIMITS[subscription.plan_code]
                        ? Math.min(
                            100,
                            ((currentUsage.extrajudicial_notifications_used || 0) /
                              PLAN_NOTIFICATION_LIMITS[subscription.plan_code]) *
                              100,
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p>
                {PLAN_NOTIFICATION_LIMITS[subscription.plan_code] === null
                  ? "Notificações ilimitadas"
                  : `${Math.max(
                      0,
                      PLAN_NOTIFICATION_LIMITS[subscription.plan_code] - (currentUsage.extrajudicial_notifications_used || 0),
                    )} envios de notificação disponíveis`}
              </p>
            </>
          )}

          <button type="button" className={styles.openPlansButton} onClick={() => setPlansModalOpen(true)}>Ver planos <ArrowRight size={14} /></button>
        </div>

        <div className={styles.sidebarUser}>
          <span>{account.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>
          <div><strong>{account.name}</strong><small>{account.email}</small></div>
          <SignatureLogoutButton />
        </div>
      </aside>

      {sidebarOpen && <button type="button" className={styles.sidebarBackdrop} onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}

      <div className={styles.mainArea}>
        <header className={styles.topbar}>
          <button type="button" className={styles.mobileMenu} onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <div className={styles.organizationSwitcher}><span>{organization.name}</span><ChevronDown size={15} /></div>
          <div className={styles.topbarActions}><span className={styles.securityStatus}><ShieldCheck size={15} /> Ambiente protegido</span><button type="button" className={styles.iconButton} title="Atalhos"><Sparkles size={18} /><span className={styles.srOnly}>Atalhos</span></button></div>
        </header>

        <main className={styles.workspace}>
          {migrationRequired && <div className={styles.migrationAlert}><AlertCircle size={19} /><div><strong>Estrutura de documentos pendente</strong><span>A migration do produto precisa ser aplicada antes de criar rascunhos.</span></div></div>}

          <section className={styles.workspaceHeading}>
            <div>
              <span>
                {activeView === "overview"
                  ? "Visão geral"
                  : activeView === "ai_creator"
                  ? "Criar com IA"
                  : activeView === "extrajudicial_notifications"
                  ? "Notificações"
                  : "Documentos"}
              </span>
              <h1>
                {activeView === "overview"
                  ? `Olá, ${account.name.split(" ")[0]}.`
                  : activeView === "ai_creator"
                  ? "Criação inteligente"
                  : activeView === "extrajudicial_notifications"
                  ? "Notificação Extrajudicial"
                  : "Seus documentos"}
              </h1>
              <p>
                {activeView === "overview"
                  ? "Acompanhe o que precisa da sua atenção hoje."
                  : activeView === "ai_creator"
                  ? "Elabore minutas jurídicas estruturadas com auxílio de inteligência artificial."
                  : activeView === "extrajudicial_notifications"
                  ? "Envie e rastreie notificações extrajudiciais com validade jurídica e geolocalização."
                  : "Organize e acompanhe todos os envelopes da organização."}
              </p>
            </div>
            {activeView !== "ai_creator" && activeView !== "extrajudicial_notifications" && (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setModalOpen(true)}
                disabled={migrationRequired}
              >
                <FilePlus2 size={18} /> Novo documento
              </button>
            )}
          </section>

          {activeView === "overview" && (
            <>
              <section className={styles.metricsGrid} aria-label="Resumo dos documentos">
                <article><div><span>Total de envelopes</span><strong>{metrics.total}</strong><small>Todos os períodos</small></div><i className={styles.metricNeutral}><FileText size={20} /></i></article>
                <article><div><span>Aguardando ação</span><strong>{metrics.progress}</strong><small>Enviados ou em assinatura</small></div><i className={styles.metricPending}><Clock3 size={20} /></i></article>
                <article><div><span>Concluídos</span><strong>{metrics.completed}</strong><small>Com evidências registradas</small></div><i className={styles.metricSuccess}><BadgeCheck size={20} /></i></article>
                <article><div><span>Rascunhos</span><strong>{metrics.drafts}</strong><small>Ainda não enviados</small></div><i className={styles.metricDraft}><Archive size={20} /></i></article>
              </section>

              <section className={styles.insightRow}>
                <div className={styles.planOverview}>
                  <header><div><span>Uso mensal</span><h2>Plano {PLAN_LABELS[subscription.plan_code] || "Gratuito"}</h2></div><Gauge size={22} /></header>
                  <div className={styles.planNumbers}><strong>{documentsUsed}</strong><span>de {documentsLimit ?? "∞"} documentos</span></div>
                  <div className={styles.bigUsageTrack}><i style={{ width: `${usagePercent}%` }} /></div>
                  <footer><span>Renova em {formatDate(subscription.current_period_end)}</span><button type="button" className={styles.openPlansButton} onClick={() => setPlansModalOpen(true)}>Aumentar limite <ArrowRight size={14} /></button></footer>
                </div>
                <div className={styles.quickActions}>
                  <header><span>Acesso rápido</span><h2>Continue seu trabalho</h2></header>
                  <button type="button" onClick={() => setModalOpen(true)} disabled={migrationRequired}><span><FilePlus2 size={19} /></span><div><strong>Novo rascunho</strong><small>Prepare um PDF e os destinatários</small></div><ArrowRight size={16} /></button>
                  <Link href="/validar"><span><QrCode size={19} /></span><div><strong>Validar documento</strong><small>Consulte um código de autenticidade</small></div><ArrowRight size={16} /></Link>
                </div>
              </section>
            </>
          )}

          {activeView === "ai_creator" && (
            <AiCreatorView
              account={account}
              subscription={subscription}
              usage={currentUsage}
              onEnvelopeCreated={(item) => {
                setEnvelopes((current) => [item, ...current]);
                setCurrentUsage((current) => ({
                  ...current,
                  ai_generations_used: Number(current.ai_generations_used || 0) + 1,
                }));
                setActiveView("documents");
                setNotice("Rascunho criado a partir da IA com sucesso.");
                window.setTimeout(() => setNotice(""), 2200);
              }}
              onLimitReached={() => setPlansModalOpen(true)}
            />
          )}

          {activeView === "extrajudicial_notifications" && (
            <ExtrajudicialNotificationsView
              account={account}
              subscription={subscription}
              usage={currentUsage}
              onNotificationSent={(newNotification) => {
                setCurrentUsage((current) => ({
                  ...current,
                  extrajudicial_notifications_used: Number(current.extrajudicial_notifications_used || 0) + 1,
                }));
                setNotice("Notificação extrajudicial enviada com sucesso.");
                window.setTimeout(() => setNotice(""), 3500);
              }}
              onLimitReached={() => setPlansModalOpen(true)}
            />
          )}

          {(activeView === "overview" || activeView === "documents") && (
            <section className={styles.documentsPanel}>
            <header className={styles.panelHeader}>
              <div><span>{activeView === "overview" ? "Atividade recente" : "Biblioteca"}</span><h2>{activeView === "overview" ? "Últimos documentos" : "Todos os envelopes"}</h2></div>
              <div className={styles.filters}><label><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar título, pessoa ou código" /></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filtrar por status"><option value="ALL">Todos os status</option>{Object.entries(STATUS).map(([value, config]) => <option key={value} value={value}>{config.label}</option>)}</select></div>
            </header>

            {filteredEnvelopes.length === 0 ? (
              <div className={styles.emptyState}><div><FileSignature size={28} /></div><h3>{envelopes.length ? "Nenhum documento encontrado" : "Comece pelo primeiro documento"}</h3><p>{envelopes.length ? "Ajuste a busca ou o filtro para localizar um envelope." : "Prepare um PDF e seus destinatários. Ele será salvo como rascunho até o fluxo de envio estar concluído."}</p><button type="button" onClick={() => setModalOpen(true)} disabled={migrationRequired}><Plus size={16} /> Criar rascunho</button></div>
            ) : (
              <div className={styles.tableWrap}>
                <table>
                  <thead><tr><th>Documento</th><th>Destinatários</th><th>Status</th><th>Atualizado</th><th>Código</th><th><span className={styles.srOnly}>Ações</span></th></tr></thead>
                  <tbody>
                    {filteredEnvelopes.slice(0, activeView === "overview" ? 6 : undefined).map((item) => {
                      const userEmail = account?.email?.toLowerCase().trim();
                      const selfRecipient = item.recipients.find(
                        (recipient) => recipient.email.toLowerCase().trim() === userEmail
                      );
                      const canSign =
                        ["SENT", "IN_PROGRESS"].includes(item.status) &&
                        selfRecipient &&
                        ["SIGNER", "APPROVER"].includes(selfRecipient.role) &&
                        !["COMPLETED", "DECLINED"].includes(selfRecipient.status);

                      return (
                        <tr key={item.id}>
                          <td>
                            <div className={styles.documentCell}>
                              <span><FileText size={18} /></span>
                              <div>
                                <strong>{item.title}</strong>
                                <small>{DOCUMENT_TYPES[item.documentType] || "Documento"} · {(item.documents.find((document) => document.kind === "ORIGINAL") || item.documents[0])?.name || "PDF"}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.recipientAvatars}>
                              {item.recipients.slice(0, 3).map((recipient) => (
                                <span key={recipient.id} title={`${recipient.name} · ${recipient.email}`}>
                                  {recipient.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
                                </span>
                              ))}
                              {item.recipients.length > 3 && <small>+{item.recipients.length - 3}</small>}
                              <em>{item.recipients.length} pessoa{item.recipients.length === 1 ? "" : "s"}</em>
                            </div>
                          </td>
                          <td><StatusBadge status={item.status} /></td>
                          <td><time>{formatDate(item.updatedAt)}</time></td>
                          <td>
                            <button type="button" className={styles.codeButton} onClick={() => copyCode(item.verificationCode)}>
                              {item.verificationCode}<Copy size={12} />
                            </button>
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              <a href={`/api/assinatura/app/envelopes/${encodeURIComponent(item.id)}/documento${item.status === "COMPLETED" ? "?final=1" : ""}`} target="_blank" rel="noopener noreferrer" title={item.status === "COMPLETED" ? "Baixar documento final" : "Visualizar PDF"}>
                                <Download size={16} />
                              </a>
                              {item.status === "COMPLETED" && (
                                <a href={`/api/assinatura/app/envelopes/${encodeURIComponent(item.id)}/certificado`} target="_blank" rel="noopener noreferrer" title="Baixar Certificado Separado">
                                  <BadgeCheck size={16} />
                                </a>
                              )}
                              {canSign && (
                                <button
                                  type="button"
                                  onClick={() => signEnvelope(item)}
                                  disabled={signingId === item.id}
                                  title="Assinar documento"
                                  className={styles.signButton}
                                >
                                  {signingId === item.id ? <Loader2 size={16} className={styles.spin} /> : <FileSignature size={16} />}
                                </button>
                              )}
                              {item.status === "DRAFT" && (
                                <button type="button" onClick={() => sendEnvelope(item)} disabled={sendingId === item.id} title="Enviar para assinatura">
                                  {sendingId === item.id ? <Loader2 size={16} className={styles.spin} /> : <Send size={16} />}
                                </button>
                              )}
                              {["SENT", "IN_PROGRESS"].includes(item.status) && item.recipients.some((recipient) => !["COMPLETED", "DECLINED"].includes(recipient.status)) && (
                                <button type="button" onClick={() => sendEnvelope(item)} disabled={sendingId === item.id} title="Reenviar convites pendentes">
                                  {sendingId === item.id ? <Loader2 size={16} className={styles.spin} /> : <RefreshCw size={16} />}
                                </button>
                              )}
                              {item.status === "DRAFT" && (
                                <button type="button" onClick={() => deleteDraft(item)} disabled={deletingId === item.id || sendingId === item.id} title="Excluir rascunho">
                                  {deletingId === item.id ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          )}
        </main>
      </div>

      {notice && <div className={styles.toast} role="status"><CheckCircle2 size={17} /> {notice}</div>}
      <PlansModal open={plansModalOpen} onClose={() => setPlansModalOpen(false)} subscription={subscription} usage={currentUsage} />
      <DraftModal open={modalOpen} account={account} onClose={() => setModalOpen(false)} onCreated={(item) => { setEnvelopes((current) => [item, ...current]); setActiveView("documents"); setNotice("Rascunho salvo com segurança."); window.setTimeout(() => setNotice(""), 2200); }} />
    </div>
  );
}
