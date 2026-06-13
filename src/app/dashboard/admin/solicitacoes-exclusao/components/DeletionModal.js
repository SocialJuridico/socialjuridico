"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileSearch,
  History,
  KeyRound,
  LockKeyhole,
  Mail,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import {
  ACTION_META,
  AUDIT_LABELS,
  DETAIL_PURPOSE_OPTIONS,
  LEGAL_BASIS_OPTIONS,
  PROFILE_LABELS,
  STATUS_META,
} from "../deletionConstants";
import styles from "../DeletionRequests.module.css";

function formatDate(value) {
  if (!value) return "Não informado";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ModalClose({ controller }) {
  return (
    <button
      type="button"
      className={styles.modalClose}
      onClick={controller.closeModal}
      disabled={controller.busy}
      aria-label="Fechar"
    >
      <X size={18} aria-hidden="true" />
    </button>
  );
}

function AccessScreen({ controller }) {
  const modal = controller.modal;

  return (
    <section className={styles.accessModal} role="dialog" aria-modal="true">
      <ModalClose controller={controller} />

      <span className={styles.accessIcon}>
        <LockKeyhole size={24} aria-hidden="true" />
      </span>
      <span className={styles.eyebrow}>Acesso a dados protegidos</span>
      <h2>Justifique a consulta</h2>
      <p>
        Nome completo, e-mail, motivo e situação da conta somente serão exibidos
        após o registro da finalidade administrativa.
      </p>

      <label className={styles.field}>
        <span>Finalidade do acesso</span>
        <select
          value={modal.purpose}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              purpose: event.target.value,
            }))
          }
          disabled={controller.busy}
        >
          {DETAIL_PURPOSE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className={styles.field}>
        <span>Justificativa específica</span>
        <textarea
          rows={4}
          minLength={15}
          maxLength={500}
          placeholder="Explique por que os dados completos são necessários para esta análise..."
          value={modal.justification}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              justification: event.target.value,
            }))
          }
          disabled={controller.busy}
        />
        <small>{modal.justification.length}/500 caracteres · mínimo de 15</small>
      </label>

      <div className={styles.privacyNotice}>
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          O acesso registrará administrador, finalidade, justificativa, campos
          consultados, data e hash do endereço de rede.
        </span>
      </div>

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={controller.closeModal}
          disabled={controller.busy}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={controller.accessDetails}
          disabled={controller.busy || modal.justification.trim().length < 15}
        >
          <KeyRound size={15} aria-hidden="true" />
          {controller.busy
            ? "Registrando acesso..."
            : "Acessar dados protegidos"}
        </button>
      </div>
    </section>
  );
}

function PreflightPanel({ details }) {
  const metrics = [
    ["Casos vinculados", details.counts.totalCases],
    ["Casos ativos", details.counts.activeCases],
    ["Transações pendentes", details.counts.pendingTransactions],
    ["Documentos próprios", details.counts.ownedDocuments],
  ];

  return (
    <div className={styles.preflightPanel}>
      <div className={styles.blockTitle}>
        <ShieldCheck size={17} aria-hidden="true" />
        <div>
          <h3>Pré-verificação operacional</h3>
          <p>Contagens calculadas no servidor no momento da abertura.</p>
        </div>
      </div>

      <div className={styles.preflightGrid}>
        {metrics.map(([label, value]) => (
          <div key={label}>
            <strong>{value || 0}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className={styles.accountStateGrid}>
        <span>
          <UserRound size={13} aria-hidden="true" />
          Perfil no banco: <strong>{details.subject.profileExists ? "presente" : "ausente"}</strong>
        </span>
        <span>
          <KeyRound size={13} aria-hidden="true" />
          Usuário Auth: <strong>{details.subject.authExists ? "presente" : "ausente"}</strong>
        </span>
        <span>
          <Scale size={13} aria-hidden="true" />
          Plano: <strong>{details.subject.planType || "não informado"}</strong>
        </span>
      </div>

      {details.blockers.map((item) => (
        <div key={item.code} className={styles.blockerNotice}>
          <AlertTriangle size={16} aria-hidden="true" />
          <div>
            <strong>Bloqueio: {item.code}</strong>
            <span>{item.message}</span>
          </div>
        </div>
      ))}

      {details.warnings.map((item) => (
        <div key={item.code} className={styles.warningNotice}>
          <ShieldAlert size={16} aria-hidden="true" />
          <div>
            <strong>Atenção: {item.code}</strong>
            <span>{item.message}</span>
          </div>
        </div>
      ))}

      {details.canProcess && (
        <div className={styles.readyNotice}>
          <CheckCircle2 size={16} aria-hidden="true" />
          <span>Nenhum bloqueio operacional identificado.</span>
        </div>
      )}
    </div>
  );
}

function AuditTimeline({ items }) {
  return (
    <div className={styles.timelineBlock}>
      <div className={styles.blockTitle}>
        <History size={17} aria-hidden="true" />
        <div>
          <h3>Histórico da solicitação</h3>
          <p>Registro append-only das operações administrativas.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className={styles.timelineEmpty}>
          Nenhum evento administrativo registrado.
        </p>
      ) : (
        <div className={styles.timelineList}>
          {items.map((item) => (
            <div key={item.id} className={styles.timelineItem}>
              <span className={styles.timelineDot} />
              <div>
                <strong>{AUDIT_LABELS[item.action] || item.action}</strong>
                {item.justification && <p>{item.justification}</p>}
                <small>
                  {formatDate(item.created_at)}
                  {item.admin_id
                    ? ` · Admin ${item.admin_id.slice(0, 8)}`
                    : " · Sistema"}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailsScreen({ controller }) {
  const modal = controller.modal;
  const details = modal.details;
  const request = details.request;
  const status = STATUS_META[request.status] || STATUS_META.PENDENTE;

  const canStartReview = request.status === "PENDENTE";
  const canReopen = ["REJEITADA", "FALHA", "AGUARDANDO_USUARIO"].includes(
    request.status,
  );
  const canApprove = [
    "PENDENTE",
    "EM_ANALISE",
    "AGUARDANDO_USUARIO",
    "FALHA",
  ].includes(request.status);
  const canRequestInformation = [
    "PENDENTE",
    "EM_ANALISE",
    "APROVADA",
  ].includes(request.status);
  const canReject = [
    "PENDENTE",
    "EM_ANALISE",
    "AGUARDANDO_USUARIO",
    "APROVADA",
  ].includes(request.status);
  const canProcess = ["APROVADA", "FALHA"].includes(request.status);

  return (
    <section className={styles.detailsModal} role="dialog" aria-modal="true">
      <div className={styles.modalHeader}>
        <div>
          <span className={styles.eyebrow}>Análise protegida</span>
          <h2>{details.subject.name || request.nome}</h2>
          <p>
            {PROFILE_LABELS[request.profile_type] || PROFILE_LABELS.UNKNOWN} ·{" "}
            {details.subject.email || request.email_masked}
          </p>
        </div>
        <ModalClose controller={controller} />
      </div>

      <div className={styles.detailBadges}>
        <span
          className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}
        >
          {status.label}
        </span>
        <span>
          <Clock3 size={12} aria-hidden="true" />
          Solicitada em {formatDate(request.created_at)}
        </span>
        <span>
          <CalendarClock size={12} aria-hidden="true" />
          Prazo {formatDate(request.due_at)}
        </span>
      </div>

      <div className={styles.protectedContent}>
        <div>
          <span>Nome confirmado</span>
          <strong>{request.nome}</strong>
        </div>
        <div>
          <span>E-mail da conta</span>
          <strong>{details.subject.email || request.email_masked}</strong>
        </div>
        <div className={styles.reasonFull}>
          <span>Motivo informado pelo titular</span>
          <p>{request.motivo}</p>
        </div>
      </div>

      {request.decision_reason && (
        <div className={styles.decisionNotice}>
          <FileSearch size={16} aria-hidden="true" />
          <div>
            <strong>Última decisão administrativa</strong>
            <span>{request.decision_reason}</span>
            {request.legal_basis && (
              <small>Fundamento: {request.legal_basis}</small>
            )}
          </div>
        </div>
      )}

      <PreflightPanel details={details} />

      <div className={styles.actionPanel}>
        <div className={styles.blockTitle}>
          <Scale size={17} aria-hidden="true" />
          <div>
            <h3>Ações administrativas</h3>
            <p>Cada decisão altera o estado e gera um evento de auditoria.</p>
          </div>
        </div>

        <div className={styles.actionGrid}>
          {canStartReview && (
            <button
              type="button"
              onClick={() => controller.openDecision("START_REVIEW")}
            >
              <FileSearch size={15} aria-hidden="true" />
              Iniciar análise
            </button>
          )}

          {canReopen && (
            <button
              type="button"
              onClick={() => controller.openDecision("REOPEN")}
            >
              <FileSearch size={15} aria-hidden="true" />
              Reabrir análise
            </button>
          )}

          {canApprove && (
            <button
              type="button"
              onClick={() => controller.openDecision("APPROVE")}
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              Aprovar
            </button>
          )}

          {canRequestInformation && (
            <button
              type="button"
              onClick={() => controller.openDecision("REQUEST_INFORMATION")}
            >
              <Mail size={15} aria-hidden="true" />
              Solicitar complementação
            </button>
          )}

          {canReject && (
            <button
              type="button"
              className={styles.dangerOutlineButton}
              onClick={() => controller.openDecision("REJECT")}
            >
              <X size={15} aria-hidden="true" />
              Rejeitar
            </button>
          )}

          {canProcess && (
            <button
              type="button"
              className={styles.dangerButton}
              onClick={controller.openProcess}
              disabled={!details.canProcess}
            >
              <Trash2 size={15} aria-hidden="true" />
              Processar remoção da conta
            </button>
          )}
        </div>
      </div>

      <AuditTimeline items={details.audit || []} />
    </section>
  );
}

function DecisionScreen({ controller }) {
  const modal = controller.modal;
  const action = ACTION_META[modal.action];

  return (
    <section className={styles.decisionModal} role="dialog" aria-modal="true">
      <button
        type="button"
        className={styles.backModalButton}
        onClick={controller.backToDetails}
        disabled={controller.busy}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Voltar aos detalhes
      </button>
      <ModalClose controller={controller} />

      <span className={styles.eyebrow}>Decisão administrativa</span>
      <h2>{action?.title || "Atualizar solicitação"}</h2>
      <p>{action?.description}</p>

      {action?.requiresLegalBasis && (
        <label className={styles.field}>
          <span>Fundamento da decisão</span>
          <select
            value={modal.legalBasis}
            onChange={(event) =>
              controller.setModal((current) => ({
                ...current,
                legalBasis: event.target.value,
              }))
            }
            disabled={controller.busy}
          >
            <option value="">Selecione...</option>
            {LEGAL_BASIS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className={styles.field}>
        <span>
          {action?.requiresReason
            ? "Justificativa obrigatória"
            : "Observação opcional"}
        </span>
        <textarea
          rows={5}
          maxLength={1000}
          placeholder="Registre os fundamentos e providências adotadas..."
          value={modal.reason}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              reason: event.target.value,
            }))
          }
          disabled={controller.busy}
        />
        <small>{modal.reason.length}/1000 caracteres</small>
      </label>

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={controller.backToDetails}
          disabled={controller.busy}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={
            modal.action === "REJECT"
              ? styles.dangerButton
              : styles.primaryButton
          }
          onClick={controller.submitDecision}
          disabled={
            controller.busy ||
            (action?.requiresReason && modal.reason.trim().length < 10) ||
            (action?.requiresLegalBasis && !modal.legalBasis)
          }
        >
          {controller.busy ? "Registrando..." : action?.title}
        </button>
      </div>
    </section>
  );
}

function ProcessScreen({ controller }) {
  const modal = controller.modal;
  const details = modal.details;

  return (
    <section className={styles.processModal} role="dialog" aria-modal="true">
      <button
        type="button"
        className={styles.backModalButton}
        onClick={controller.backToDetails}
        disabled={controller.busy}
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Voltar aos detalhes
      </button>
      <ModalClose controller={controller} />

      <span className={styles.processIcon}>
        <Trash2 size={24} aria-hidden="true" />
      </span>
      <span className={styles.eyebrow}>Operação irreversível</span>
      <h2>Processar remoção definitiva</h2>
      <p>
        A conta, autenticação e dados operacionais serão removidos. Registros
        sujeitos a retenção legal permanecerão restritos e sem acesso ativo.
      </p>

      <PreflightPanel details={details} />

      <label className={styles.field}>
        <span>Justificativa operacional</span>
        <textarea
          rows={4}
          minLength={15}
          maxLength={1000}
          placeholder="Confirme as verificações realizadas antes do processamento..."
          value={modal.processJustification}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              processJustification: event.target.value,
            }))
          }
          disabled={controller.busy}
        />
      </label>

      <label className={styles.confirmCheck}>
        <input
          type="checkbox"
          checked={modal.acknowledgeRetention}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              acknowledgeRetention: event.target.checked,
            }))
          }
          disabled={controller.busy}
        />
        <span>
          Confirmo que compreendi a retenção restrita de registros exigidos por
          obrigação legal, fiscal, antifraude ou defesa de direitos.
        </span>
      </label>

      <label className={styles.field}>
        <span>Digite EXCLUIR DEFINITIVAMENTE</span>
        <input
          type="text"
          autoComplete="off"
          value={modal.confirmation}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              confirmation: event.target.value.toUpperCase(),
            }))
          }
          disabled={controller.busy}
        />
      </label>

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={controller.backToDetails}
          disabled={controller.busy}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={controller.submitProcess}
          disabled={
            controller.busy ||
            !details.canProcess ||
            modal.processJustification.trim().length < 15 ||
            !modal.acknowledgeRetention ||
            modal.confirmation.trim() !== "EXCLUIR DEFINITIVAMENTE"
          }
        >
          <Trash2 size={15} aria-hidden="true" />
          {controller.busy ? "Processando..." : "Confirmar processamento"}
        </button>
      </div>
    </section>
  );
}

export default function DeletionModal({ controller }) {
  const modal = controller.modal;
  const busy = controller.busy;
  const closeModal = controller.closeModal;

  useEffect(() => {
    if (!modal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !busy) closeModal();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [busy, closeModal, modal]);

  if (!modal) return null;

  return (
    <div className={styles.modalOverlay} onMouseDown={closeModal}>
      <div onMouseDown={(event) => event.stopPropagation()}>
        {modal.screen === "access" && <AccessScreen controller={controller} />}
        {modal.screen === "details" && <DetailsScreen controller={controller} />}
        {modal.screen === "decision" && <DecisionScreen controller={controller} />}
        {modal.screen === "process" && <ProcessScreen controller={controller} />}
      </div>
    </div>
  );
}
