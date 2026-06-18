"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  FileCheck2,
  FileClock,
  FilePlus2,
  FileSignature,
  FileText,
  Gauge,
  LayoutDashboard,
  Loader2,
  Menu,
  MoreHorizontal,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
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

function DraftModal({ open, onClose, onCreated }) {
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
      setDraft(initialDraft);
      setError("");
    }
  }, [open]);

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
                <div className={styles.draftNotice}><ShieldCheck size={18} /><p><strong>Salvo como rascunho.</strong> Nenhum convite será enviado nesta etapa e o rascunho não consome a franquia mensal.</p></div>
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

export default function SignatureDashboardClient({
  account,
  organization,
  subscription,
  usage,
  initialEnvelopes,
  migrationRequired,
}) {
  const [envelopes, setEnvelopes] = useState(initialEnvelopes);
  const [activeView, setActiveView] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState(null);
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
  const documentsUsed = usage.documents_used || 0;
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

  const navItems = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "documents", label: "Documentos", icon: FileSignature, count: envelopes.length },
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
          <Link href="/assinatura#planos"><Gauge size={18} /><span>Planos e limites</span></Link>
          <button type="button" disabled><UsersRound size={18} /><span>Equipe</span><em>Em breve</em></button>
          <button type="button" disabled><Settings size={18} /><span>Configurações</span></button>
        </nav>

        <div className={styles.sidebarPlan}>
          <div><span>Plano {PLAN_LABELS[subscription.plan_code] || "Gratuito"}</span><strong>{documentsLimit === null ? "Ilimitado" : `${documentsUsed} de ${documentsLimit}`}</strong></div>
          <div className={styles.usageTrack}><i style={{ width: `${usagePercent}%` }} /></div>
          <p>{documentsLimit === null ? "Documentos sem limite mensal" : `${Math.max(0, documentsLimit - documentsUsed)} documentos disponíveis`}</p>
          <Link href="/assinatura#planos">Ver planos <ArrowRight size={14} /></Link>
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
            <div><span>{activeView === "overview" ? "Visão geral" : "Documentos"}</span><h1>{activeView === "overview" ? `Olá, ${account.name.split(" ")[0]}.` : "Seus documentos"}</h1><p>{activeView === "overview" ? "Acompanhe o que precisa da sua atenção hoje." : "Organize e acompanhe todos os envelopes da organização."}</p></div>
            <button type="button" className={styles.primaryButton} onClick={() => setModalOpen(true)} disabled={migrationRequired}><FilePlus2 size={18} /> Novo documento</button>
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
                  <footer><span>Renova em {formatDate(subscription.current_period_end)}</span><Link href="/assinatura#planos">Aumentar limite <ArrowRight size={14} /></Link></footer>
                </div>
                <div className={styles.quickActions}>
                  <header><span>Acesso rápido</span><h2>Continue seu trabalho</h2></header>
                  <button type="button" onClick={() => setModalOpen(true)} disabled={migrationRequired}><span><FilePlus2 size={19} /></span><div><strong>Novo rascunho</strong><small>Prepare um PDF e os destinatários</small></div><ArrowRight size={16} /></button>
                  <Link href="/validar"><span><QrCode size={19} /></span><div><strong>Validar documento</strong><small>Consulte um código de autenticidade</small></div><ArrowRight size={16} /></Link>
                </div>
              </section>
            </>
          )}

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
                  <tbody>{filteredEnvelopes.slice(0, activeView === "overview" ? 6 : undefined).map((item) => <tr key={item.id}><td><div className={styles.documentCell}><span><FileText size={18} /></span><div><strong>{item.title}</strong><small>{DOCUMENT_TYPES[item.documentType] || "Documento"} · {item.documents[0]?.name || "PDF"}</small></div></div></td><td><div className={styles.recipientAvatars}>{item.recipients.slice(0, 3).map((recipient) => <span key={recipient.id} title={`${recipient.name} · ${recipient.email}`}>{recipient.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</span>)}{item.recipients.length > 3 && <small>+{item.recipients.length - 3}</small>}<em>{item.recipients.length} pessoa{item.recipients.length === 1 ? "" : "s"}</em></div></td><td><StatusBadge status={item.status} /></td><td><time>{formatDate(item.updatedAt)}</time></td><td><button type="button" className={styles.codeButton} onClick={() => copyCode(item.verificationCode)}>{item.verificationCode}<Copy size={12} /></button></td><td><div className={styles.rowActions}>{item.status === "DRAFT" && <button type="button" onClick={() => deleteDraft(item)} disabled={deletingId === item.id} title="Excluir rascunho">{deletingId === item.id ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}</button>}<button type="button" disabled title="Mais ações"><MoreHorizontal size={17} /></button></div></td></tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {notice && <div className={styles.toast} role="status"><CheckCircle2 size={17} /> {notice}</div>}
      <DraftModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={(item) => { setEnvelopes((current) => [item, ...current]); setActiveView("documents"); setNotice("Rascunho salvo com segurança."); window.setTimeout(() => setNotice(""), 2200); }} />
    </div>
  );
}
