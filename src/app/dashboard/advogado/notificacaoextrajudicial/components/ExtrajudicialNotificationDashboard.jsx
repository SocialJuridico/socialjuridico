"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Fingerprint,
  Link2,
  Loader2,
  Mail,
  MapPin,
  PenLine,
  RefreshCw,
  Route,
  Search,
  Send,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../NotificacaoExtrajudicial.module.css";
import { useExtrajudicialNotifications } from "../useExtrajudicialNotifications";

const STATUS = {
  enviado: {
    label: "Aguardando ciência",
    className: "statusPending",
    icon: Clock3,
  },
  lido: {
    label: "Ciência registrada",
    className: "statusRead",
    icon: CheckCircle2,
  },
  erro_envio: {
    label: "Falha no envio",
    className: "statusError",
    icon: AlertTriangle,
  },
};

function formatDateParts(value) {
  if (!value) return { date: "Não registrado", time: "" };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: "Não registrado", time: "" };
  }
  return {
    date: new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function StatusBadge({ status }) {
  const config = STATUS[status] || STATUS.enviado;
  const Icon = config.icon;
  return (
    <span className={`${styles.status} ${styles[config.className]}`}>
      <Icon size={12} aria-hidden="true" /> {config.label}
    </span>
  );
}

function NotificationActions({ controller, notification }) {
  const mapUrl = notification.readGeo
    ? `https://www.google.com/maps?q=${encodeURIComponent(notification.readGeo)}`
    : null;

  return (
    <div className={styles.actions}>
      {notification.trackingUrl && (
        <button
          type="button"
          onClick={() => controller.openTrackingPage(notification)}
          title="Abrir página rastreável"
        >
          <ExternalLink size={13} aria-hidden="true" /> Abrir
        </button>
      )}
      {notification.trackingUrl && (
        <button
          type="button"
          onClick={() => controller.copyTrackingLink(notification)}
          title="Copiar link rastreável"
        >
          <Link2 size={13} aria-hidden="true" /> Link
        </button>
      )}
      <button
        type="button"
        onClick={() => controller.openDocument(notification)}
        title="Baixar documento original"
      >
        <Download size={13} aria-hidden="true" /> Documento
      </button>
      <button
        type="button"
        onClick={() => controller.downloadCertificate(notification)}
        disabled={
          !notification.hash || controller.certificateId === notification.id
        }
        title="Baixar certificado de rastreabilidade"
      >
        {controller.certificateId === notification.id ? (
          <Loader2 size={13} className={styles.spinner} aria-hidden="true" />
        ) : (
          <FileDown size={13} aria-hidden="true" />
        )}
        Certificado
      </button>
      {mapUrl && (
        <a href={mapUrl} target="_blank" rel="noopener noreferrer">
          <MapPin size={13} aria-hidden="true" /> Mapa
        </a>
      )}
    </div>
  );
}

function NotificationTable({ controller }) {
  return (
    <>
      <div className={styles.desktopTable}>
        <table>
          <thead>
            <tr>
              <th>Destinatário</th>
              <th>Protocolo</th>
              <th>Status</th>
              <th>Evidências</th>
              <th>Envio</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {controller.items.map((notification) => {
              const sentAt = formatDateParts(notification.createdAt);
              return (
                <tr key={notification.id}>
                  <td>
                    <div className={styles.recipientCell}>
                      <span className={styles.recipientIcon}>
                        <Mail size={16} aria-hidden="true" />
                      </span>
                      <div>
                        <strong title={notification.recipientEmail}>
                          {notification.recipientEmail}
                        </strong>
                        <small>
                          {notification.clientName || "Envio sem vínculo ao CRM"}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.protocolCell}>
                      <strong>{notification.protocol}</strong>
                      <button
                        type="button"
                        onClick={() =>
                          controller.copyText(
                            notification.protocol,
                            "Protocolo copiado.",
                          )
                        }
                      >
                        <Copy size={11} aria-hidden="true" /> copiar
                      </button>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={notification.status} />
                  </td>
                  <td>
                    <div className={styles.evidence}>
                      <span
                        className={
                          notification.hasReadEvidence ? styles.positive : ""
                        }
                      >
                        <Eye size={12} aria-hidden="true" />
                        {notification.hasReadEvidence
                          ? "Leitura comprovada"
                          : "Sem leitura registrada"}
                      </span>
                      <span
                        className={
                          notification.hasLocation ? styles.positive : ""
                        }
                      >
                        <MapPin size={12} aria-hidden="true" />
                        {notification.hasLocation
                          ? "Localização registrada"
                          : "Localização pendente"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.date}>
                      <strong>{sentAt.date}</strong>
                      <small>{sentAt.time}</small>
                    </div>
                  </td>
                  <td>
                    <NotificationActions
                      controller={controller}
                      notification={notification}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {controller.items.map((notification) => {
          const sentAt = formatDateParts(notification.createdAt);
          return (
            <article key={notification.id} className={styles.mobileCard}>
              <header className={styles.mobileHeader}>
                <span className={styles.recipientIcon}>
                  <Mail size={16} aria-hidden="true" />
                </span>
                <div>
                  <h3>{notification.recipientEmail}</h3>
                  <p>{notification.protocol}</p>
                </div>
                <StatusBadge status={notification.status} />
              </header>

              <div className={styles.mobileMeta}>
                <div>
                  <small>Cliente</small>
                  <strong>{notification.clientName || "Sem vínculo"}</strong>
                </div>
                <div>
                  <small>Enviado em</small>
                  <strong>
                    {sentAt.date} {sentAt.time}
                  </strong>
                </div>
                <div>
                  <small>Leitura</small>
                  <strong>
                    {notification.readAt
                      ? formatDateParts(notification.readAt).date
                      : "Pendente"}
                  </strong>
                </div>
                <div>
                  <small>Geolocalização</small>
                  <strong>
                    {notification.hasLocation ? "Registrada" : "Pendente"}
                  </strong>
                </div>
              </div>

              <NotificationActions
                controller={controller}
                notification={notification}
              />
            </article>
          );
        })}
      </div>
    </>
  );
}

function NewNotificationModal({ controller }) {
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
        aria-labelledby="new-notification-title"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>
              <BellRing size={15} aria-hidden="true" /> Novo envio blindado
            </span>
            <h2 id="new-notification-title">
              Criar Notificação Extrajudicial
            </h2>
            <p>
              Gere a minuta na plataforma ou envie um documento pronto para
              rastreamento.
            </p>
          </div>
          <button
            type="button"
            onClick={controller.closeModal}
            disabled={controller.submitting}
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form className={styles.form} onSubmit={controller.submit} noValidate>
          <div className={styles.modeTabs}>
            <button
              type="button"
              className={
                controller.form.mode === "draft" ? styles.activeMode : undefined
              }
              onClick={() => controller.selectMode("draft")}
            >
              <span>
                <PenLine size={17} aria-hidden="true" />
              </span>
              <div>
                <strong>Redigir uma minuta</strong>
                <small>O sistema gera o PDF blindado automaticamente.</small>
              </div>
            </button>
            <button
              type="button"
              className={
                controller.form.mode === "upload" ? styles.activeMode : undefined
              }
              onClick={() => controller.selectMode("upload")}
            >
              <span>
                <UploadCloud size={17} aria-hidden="true" />
              </span>
              <div>
                <strong>Enviar documento pronto</strong>
                <small>Use PDF, JPG ou PNG com até 15 MB.</small>
              </div>
            </button>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>Cliente do CRM</span>
              <select
                value={controller.form.clientId}
                onChange={(event) => controller.selectClient(event.target.value)}
              >
                <option value="">Envio sem vínculo ao CRM</option>
                {controller.clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>E-mail do destinatário *</span>
              <input
                type="email"
                value={controller.form.recipientEmail}
                onChange={(event) =>
                  controller.updateField("recipientEmail", event.target.value)
                }
                placeholder="destinatario@exemplo.com"
              />
              {controller.fieldErrors.recipientEmail && (
                <small>{controller.fieldErrors.recipientEmail}</small>
              )}
            </label>

            <label>
              <span>Tom da comunicação</span>
              <select
                value={controller.form.tone}
                onChange={(event) =>
                  controller.updateField("tone", event.target.value)
                }
              >
                <option value="formal">Formal e objetivo</option>
                <option value="conciliador">Conciliador</option>
                <option value="firme">Firme e assertivo</option>
                <option value="urgente">Urgente</option>
              </select>
            </label>

            <label>
              <span>ID do caso, se houver</span>
              <input
                type="text"
                value={controller.form.caseId}
                onChange={(event) =>
                  controller.updateField("caseId", event.target.value)
                }
                placeholder="Vínculo opcional"
              />
            </label>
          </div>

          {controller.form.mode === "draft" ? (
            <label className={styles.fieldWide}>
              <span>Conteúdo da notificação *</span>
              <textarea
                value={controller.form.draftText}
                onChange={(event) =>
                  controller.updateField("draftText", event.target.value)
                }
                placeholder="Descreva os fatos, a obrigação, o prazo para cumprimento e as consequências jurídicas do não atendimento..."
              />
              {controller.fieldErrors.draftText && (
                <small>{controller.fieldErrors.draftText}</small>
              )}
            </label>
          ) : (
            <div
              className={styles.dropzone}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                controller.selectFile(event.dataTransfer.files?.[0]);
              }}
            >
              <input
                ref={controller.fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                onChange={(event) =>
                  controller.selectFile(event.target.files?.[0])
                }
              />
              <UploadCloud size={30} aria-hidden="true" />
              <strong>
                {controller.file
                  ? controller.file.name
                  : "Arraste o documento ou clique para selecionar"}
              </strong>
              <span>PDF, JPG ou PNG com até 15 MB.</span>
              <button
                type="button"
                onClick={() => controller.fileInputRef.current?.click()}
              >
                Selecionar documento
              </button>
              {controller.fieldErrors.file && (
                <small>{controller.fieldErrors.file}</small>
              )}
            </div>
          )}

          <div className={styles.evidenceBox}>
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <strong>Envio com cadeia técnica de evidências</strong>
              <p>
                O documento recebe protocolo e hash SHA-512. A página exclusiva
                registra data, horário, IP, navegador e geolocalização quando
                autorizada pelo destinatário.
              </p>
            </div>
          </div>

          <footer className={styles.modalFooter}>
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={controller.closeModal}
              disabled={controller.submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.primaryAction}
              disabled={controller.submitting}
            >
              {controller.submitting ? (
                <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
              ) : (
                <Send size={16} aria-hidden="true" />
              )}
              {controller.submitting
                ? "Processando envio..."
                : "Blindar e enviar notificação"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function ExtrajudicialNotificationDashboard() {
  const controller = useExtrajudicialNotifications();

  return (
    <LawyerDashboardShell
      activeRoute="notificacaoextrajudicial"
      title="Notificação Extrajudicial"
      subtitle="Envio blindado, ciência digital e rastreabilidade"
      icon={BellRing}
    >
      <div className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <ShieldCheck size={15} aria-hidden="true" /> Prova técnica de envio e
              acesso
            </span>
            <h1>
              Notifique com segurança. <span>Comprove cada etapa.</span>
            </h1>
            <p>
              Crie ou envie a notificação, gere o protocolo criptográfico e
              acompanhe a ciência do destinatário com data, IP, navegador e
              geolocalização autorizada.
            </p>
          </div>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={controller.openModal}
          >
            <Send size={17} aria-hidden="true" /> Nova notificação
          </button>
        </section>

        <section className={styles.metrics} aria-label="Resumo das notificações">
          <article className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <BellRing size={18} aria-hidden="true" />
            </span>
            <div>
              <small>Total enviado</small>
              <strong>{controller.metrics.total}</strong>
              <p>protocolos registrados</p>
            </div>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <Clock3 size={18} aria-hidden="true" />
            </span>
            <div>
              <small>Aguardando ciência</small>
              <strong>{controller.metrics.pending}</strong>
              <p>links ainda não acessados</p>
            </div>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <CheckCircle2 size={18} aria-hidden="true" />
            </span>
            <div>
              <small>Ciência registrada</small>
              <strong>{controller.metrics.read}</strong>
              <p>aberturas comprovadas</p>
            </div>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <MapPin size={18} aria-hidden="true" />
            </span>
            <div>
              <small>Com localização</small>
              <strong>{controller.metrics.located}</strong>
              <p>autorizações registradas</p>
            </div>
          </article>
          <article className={styles.metricCard}>
            <span className={styles.metricIcon}>
              <Route size={18} aria-hidden="true" />
            </span>
            <div>
              <small>Taxa de ciência</small>
              <strong>{controller.metrics.readRate}%</strong>
              <p>sobre todos os envios</p>
            </div>
          </article>
        </section>

        <section className={styles.flow} aria-label="Cadeia de evidências">
          <article>
            <span>
              <FileText size={15} aria-hidden="true" />
            </span>
            <div>
              <small>Etapa 1</small>
              <strong>Documento blindado</strong>
            </div>
          </article>
          <article>
            <span>
              <Fingerprint size={15} aria-hidden="true" />
            </span>
            <div>
              <small>Etapa 2</small>
              <strong>Protocolo e SHA-512</strong>
            </div>
          </article>
          <article>
            <span>
              <Eye size={15} aria-hidden="true" />
            </span>
            <div>
              <small>Etapa 3</small>
              <strong>Ciência rastreada</strong>
            </div>
          </article>
          <article>
            <span>
              <FileDown size={15} aria-hidden="true" />
            </span>
            <div>
              <small>Etapa 4</small>
              <strong>Certificado probatório</strong>
            </div>
          </article>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <span>Central de acompanhamento</span>
              <h2>Notificações enviadas</h2>
            </div>
            <div className={styles.filters}>
              <label className={styles.searchField}>
                <Search size={14} aria-hidden="true" />
                <input
                  type="search"
                  value={controller.filters.search}
                  onChange={(event) =>
                    controller.setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  placeholder="Buscar protocolo, e-mail ou cliente"
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
                aria-label="Filtrar por status"
              >
                <option value="all">Todos os status</option>
                <option value="enviado">Aguardando ciência</option>
                <option value="lido">Ciência registrada</option>
                <option value="erro_envio">Falha no envio</option>
              </select>
              <button
                type="button"
                className={styles.refresh}
                onClick={controller.reload}
                aria-label="Atualizar notificações"
              >
                <RefreshCw size={15} aria-hidden="true" />
              </button>
            </div>
          </header>

          {controller.loading ? (
            <div className={styles.state}>
              <Loader2 size={30} className={styles.spinner} aria-hidden="true" />
              <strong>Carregando notificações...</strong>
              <span>
                Conferindo protocolos, status de leitura e evidências registradas.
              </span>
            </div>
          ) : controller.error ? (
            <div className={`${styles.state} ${styles.errorState}`}>
              <AlertTriangle size={30} aria-hidden="true" />
              <strong>Não foi possível carregar o painel</strong>
              <span>{controller.error}</span>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={controller.reload}
              >
                Tentar novamente
              </button>
            </div>
          ) : controller.items.length === 0 ? (
            <div className={styles.state}>
              <BellRing size={34} aria-hidden="true" />
              <strong>Nenhuma notificação encontrada</strong>
              <span>
                Crie o primeiro envio blindado ou ajuste os filtros da pesquisa.
              </span>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={controller.openModal}
              >
                <Send size={15} aria-hidden="true" /> Nova notificação
              </button>
            </div>
          ) : (
            <NotificationTable controller={controller} />
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
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                  </button>
                  <strong>
                    {controller.pagination.page} / {controller.pagination.totalPages}
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
                    aria-label="Próxima página"
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </div>
              </footer>
            )}
        </section>
      </div>

      <NewNotificationModal controller={controller} />
    </LawyerDashboardShell>
  );
}
