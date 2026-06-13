"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FileDown,
  FileKey2,
  FileText,
  Loader2,
  Mail,
  PenTool,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  UserRoundCheck,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../AssinaturaDigital.module.css";
import { useDigitalSignatures } from "../useDigitalSignatures";

const STATUS = {
  pending: { label: "Aguardando", className: "statusPending", icon: Clock3 },
  partially_signed: {
    label: "Parcialmente assinado",
    className: "statusPartial",
    icon: UserRoundCheck,
  },
  signed: { label: "Concluído", className: "statusSigned", icon: CheckCircle2 },
};

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({ status }) {
  const config = STATUS[status] || STATUS.pending;
  const Icon = config.icon;
  return (
    <span className={`${styles.status} ${styles[config.className]}`}>
      <Icon size={13} aria-hidden="true" /> {config.label}
    </span>
  );
}

function Signer({ label, party }) {
  return (
    <div className={styles.signer}>
      <span>{label}</span>
      <div>
        <strong>{party?.name || "Não informado"}</strong>
        <small>{party?.email || ""}</small>
      </div>
      <span
        className={party?.signed ? styles.signerSigned : styles.signerPending}
      >
        {party?.signed ? <Check size={11} /> : <Clock3 size={11} />}
        {party?.signed ? "Assinado" : "Pendente"}
      </span>
    </div>
  );
}

function Actions({ item, controller }) {
  const lawyerSigned = Boolean(item.metadata?.lawyer?.signed);
  const clientSigned = Boolean(item.metadata?.client?.signed);
  const lawyerLink = controller.signingLink(item, "lawyer");
  const clientLink = controller.signingLink(item, "client");

  return (
    <div className={styles.actions}>
      {!lawyerSigned && (
        <a href={lawyerLink} target="_blank" rel="noopener noreferrer">
          <PenTool size={14} /> Assinar
        </a>
      )}
      {!clientSigned && (
        <button
          type="button"
          onClick={() =>
            controller.copyText(clientLink, "Link do cliente copiado.")
          }
        >
          <Copy size={14} /> Link do cliente
        </button>
      )}
      {!clientSigned && (
        <button
          type="button"
          onClick={() => controller.resendInvitation(item, "client")}
          disabled={controller.resendingId === item.id}
        >
          {controller.resendingId === item.id ? (
            <Loader2 size={14} className={styles.spinner} />
          ) : (
            <Mail size={14} />
          )}
          Reenviar convite
        </button>
      )}
      {item.download_url && (
        <a href={item.download_url}>
          <Download size={14} /> PDF final
        </a>
      )}
      <button type="button" onClick={() => controller.generateCertificate(item)}>
        <FileDown size={14} /> Certificado
      </button>
      <a
        href={`/validar?code=${encodeURIComponent(item.verification_code)}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink size={14} /> Validar
      </a>
    </div>
  );
}

function SignatureTable({ controller }) {
  return (
    <>
      <div className={styles.desktopTable}>
        <table>
          <thead>
            <tr>
              <th>Documento</th>
              <th>Signatários</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {controller.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className={styles.documentCell}>
                    <span className={styles.documentIcon}>
                      <FileText size={18} />
                    </span>
                    <div>
                      <strong>{item.document_name}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          controller.copyText(
                            item.verification_code,
                            "Código copiado.",
                          )
                        }
                      >
                        {item.verification_code} <Copy size={11} />
                      </button>
                    </div>
                  </div>
                </td>
                <td>
                  <div className={styles.signers}>
                    <Signer label="ADV" party={item.metadata?.lawyer} />
                    <Signer label="CLI" party={item.metadata?.client} />
                  </div>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
                <td>
                  <time className={styles.date}>{formatDate(item.created_at)}</time>
                </td>
                <td>
                  <Actions item={item} controller={controller} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {controller.items.map((item) => (
          <article key={item.id} className={styles.mobileCard}>
            <header>
              <span className={styles.documentIcon}>
                <FileText size={18} />
              </span>
              <div>
                <h3>{item.document_name}</h3>
                <button
                  type="button"
                  onClick={() =>
                    controller.copyText(item.verification_code, "Código copiado.")
                  }
                >
                  {item.verification_code} <Copy size={11} />
                </button>
              </div>
              <StatusBadge status={item.status} />
            </header>
            <div className={styles.mobileSigners}>
              <Signer label="ADV" party={item.metadata?.lawyer} />
              <Signer label="CLI" party={item.metadata?.client} />
            </div>
            <time>{formatDate(item.created_at)}</time>
            <Actions item={item} controller={controller} />
          </article>
        ))}
      </div>
    </>
  );
}

function NewSignatureModal({ controller }) {
  useEffect(() => {
    if (!controller.modalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") controller.closeModal();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [controller]);

  if (!controller.modalOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) controller.closeModal();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-signature-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>
              <PenTool size={16} /> Novo processo
            </span>
            <h2 id="new-signature-title">Iniciar assinatura digital</h2>
            <p>Envie o PDF e identifique o outro signatário.</p>
          </div>
          <button
            type="button"
            onClick={controller.closeModal}
            aria-label="Fechar"
            disabled={controller.submitting}
          >
            <X size={20} />
          </button>
        </header>

        <form className={styles.form} onSubmit={controller.submit} noValidate>
          <div className={styles.formGrid}>
            <label className={styles.fieldWide}>
              <span>Nome do documento *</span>
              <input
                type="text"
                value={controller.form.documentName}
                onChange={(event) =>
                  controller.updateField("documentName", event.target.value)
                }
                placeholder="Ex.: Contrato de honorários — Maria Silva"
                autoFocus
              />
              {controller.fieldErrors.documentName && (
                <small>{controller.fieldErrors.documentName}</small>
              )}
            </label>

            <label>
              <span>Tipo de documento</span>
              <select
                value={controller.form.documentType}
                onChange={(event) =>
                  controller.updateField("documentType", event.target.value)
                }
              >
                <option value="contrato">Contrato</option>
                <option value="procuracao">Procuração</option>
                <option value="outro">Outro documento</option>
              </select>
            </label>

            <label>
              <span>Selecionar cliente do CRM</span>
              <select
                value={controller.form.clientId}
                onChange={(event) => controller.selectClient(event.target.value)}
              >
                <option value="">Preencher manualmente</option>
                {controller.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Nome do outro signatário *</span>
              <input
                type="text"
                value={controller.form.clientName}
                onChange={(event) =>
                  controller.updateField("clientName", event.target.value)
                }
                placeholder="Nome completo"
              />
              {controller.fieldErrors.clientName && (
                <small>{controller.fieldErrors.clientName}</small>
              )}
            </label>

            <label>
              <span>E-mail do outro signatário *</span>
              <input
                type="email"
                value={controller.form.clientEmail}
                onChange={(event) =>
                  controller.updateField("clientEmail", event.target.value)
                }
                placeholder="email@exemplo.com"
              />
              {controller.fieldErrors.clientEmail && (
                <small>{controller.fieldErrors.clientEmail}</small>
              )}
            </label>
          </div>

          <div className={styles.identityBox}>
            <ShieldCheck size={20} />
            <div>
              <strong>Identidade do advogado protegida</strong>
              <p>
                Seu nome e e-mail são obtidos da sessão autenticada e não podem ser
                substituídos pelo formulário.
              </p>
            </div>
          </div>

          <div
            className={`${styles.dropzone} ${controller.fieldErrors.file ? styles.dropzoneError : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              controller.selectFile(event.dataTransfer.files?.[0]);
            }}
          >
            <input
              ref={controller.fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => controller.selectFile(event.target.files?.[0])}
            />
            <UploadCloud size={30} />
            <strong>
              {controller.file
                ? controller.file.name
                : "Arraste o PDF ou clique para selecionar"}
            </strong>
            <span>Somente PDF, até 15 MB. O hash SHA-256 é calculado no servidor.</span>
            <button
              type="button"
              onClick={() => controller.fileInputRef.current?.click()}
            >
              Selecionar arquivo
            </button>
            {controller.fieldErrors.file && (
              <small>{controller.fieldErrors.file}</small>
            )}
          </div>

          <footer className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={controller.closeModal}
              disabled={controller.submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={controller.submitting}
            >
              {controller.submitting ? (
                <Loader2 size={17} className={styles.spinner} />
              ) : (
                <PenTool size={17} />
              )}
              {controller.submitting ? "Protegendo e criando..." : "Iniciar processo"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function DigitalSignatureDashboard() {
  const controller = useDigitalSignatures();

  return (
    <LawyerDashboardShell
      activeRoute="assinaturadigital"
      title="Assinatura Digital"
      subtitle="Documentos, signatários e integridade criptográfica"
      icon={PenTool}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>
              <FileKey2 size={15} /> Central segura de assinaturas
            </span>
            <h1>
              Assine documentos com <span>rastreabilidade completa.</span>
            </h1>
            <p>
              Envie contratos e procurações, acompanhe cada signatário e valide a
              integridade do arquivo por hashes SHA-256 reais.
            </p>
          </div>
          <button type="button" onClick={controller.openModal}>
            <Plus size={17} /> Iniciar novo processo
          </button>
        </section>

        <section className={styles.trustBar}>
          <div>
            <ShieldCheck size={19} />
            <span>
              <strong>Fluxo protegido:</strong> PDF validado, OTP temporário, registro
              de IP, carimbo de tempo e auditoria de operações.
            </span>
          </div>
          <a href="/validar" target="_blank" rel="noopener noreferrer">
            Abrir validador público <ExternalLink size={14} />
          </a>
        </section>

        <section className={styles.metrics} aria-label="Resumo das assinaturas">
          <article>
            <span className={styles.metricIcon}>
              <FileText size={19} />
            </span>
            <div>
              <small>Total de processos</small>
              <strong>{controller.metrics.total}</strong>
            </div>
          </article>
          <article>
            <span className={`${styles.metricIcon} ${styles.metricSuccess}`}>
              <FileCheck2 size={19} />
            </span>
            <div>
              <small>Concluídos</small>
              <strong>{controller.metrics.signed}</strong>
            </div>
          </article>
          <article>
            <span className={`${styles.metricIcon} ${styles.metricPartial}`}>
              <UserRoundCheck size={19} />
            </span>
            <div>
              <small>Parcialmente assinados</small>
              <strong>{controller.metrics.partiallySigned}</strong>
            </div>
          </article>
          <article>
            <span className={`${styles.metricIcon} ${styles.metricPending}`}>
              <Clock3 size={19} />
            </span>
            <div>
              <small>Aguardando</small>
              <strong>{controller.metrics.pending}</strong>
            </div>
          </article>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <span>Seus documentos</span>
              <h2>Processos de assinatura</h2>
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
                  placeholder="Buscar documento ou código"
                />
              </label>
              <select
                aria-label="Filtrar por status"
                value={controller.filters.status}
                onChange={(event) =>
                  controller.setFilters((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                <option value="all">Todos os status</option>
                <option value="pending">Aguardando</option>
                <option value="partially_signed">Parcialmente assinado</option>
                <option value="signed">Concluído</option>
              </select>
              <button
                type="button"
                className={styles.refreshButton}
                onClick={controller.reload}
                aria-label="Atualizar lista"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </header>

          {controller.loading ? (
            <div className={styles.state}>
              <Loader2 size={30} className={styles.spinner} />
              <strong>Carregando processos...</strong>
              <span>Consultando status e signatários com segurança.</span>
            </div>
          ) : controller.error ? (
            <div className={`${styles.state} ${styles.errorState}`}>
              <AlertTriangle size={30} />
              <strong>Não foi possível carregar</strong>
              <span>{controller.error}</span>
              <button type="button" onClick={controller.reload}>
                <RefreshCw size={15} /> Tentar novamente
              </button>
            </div>
          ) : controller.items.length === 0 ? (
            <div className={styles.state}>
              <FileKey2 size={34} />
              <strong>Nenhum processo encontrado</strong>
              <span>
                Inicie uma assinatura ou ajuste os filtros para localizar um
                documento.
              </span>
              <button type="button" onClick={controller.openModal}>
                <Plus size={15} /> Iniciar primeira assinatura
              </button>
            </div>
          ) : (
            <SignatureTable controller={controller} />
          )}

          {!controller.loading && !controller.error && controller.pagination.total > 0 && (
            <footer className={styles.pagination}>
              <span>{controller.currentRange}</span>
              <div>
                <button
                  type="button"
                  onClick={() =>
                    controller.goToPage(controller.pagination.page - 1)
                  }
                  disabled={controller.pagination.page <= 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={16} />
                </button>
                <strong>
                  {controller.pagination.page} / {controller.pagination.totalPages}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    controller.goToPage(controller.pagination.page + 1)
                  }
                  disabled={
                    controller.pagination.page >= controller.pagination.totalPages
                  }
                  aria-label="Próxima página"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </footer>
          )}
        </section>
      </div>

      <NewSignatureModal controller={controller} />
    </LawyerDashboardShell>
  );
}
