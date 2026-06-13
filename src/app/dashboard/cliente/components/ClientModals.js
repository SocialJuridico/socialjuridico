"use client";

import { useEffect } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  FileText,
  Lock,
  MessageSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";

import VerifiedBadge from "@/components/VerifiedBadge/VerifiedBadge";
import {
  BRAZIL_STATES,
  CASE_AREAS,
  CASE_STATUS_META,
} from "../clientDashboardConfig";
import styles from "../ClientDashboard.module.css";

function ModalClose({ controller }) {
  return (
    <button
      type="button"
      className={styles.modalClose}
      onClick={() => controller.setModal(null)}
      disabled={controller.busy}
      aria-label="Fechar"
    >
      <X size={18} aria-hidden="true" />
    </button>
  );
}

function CaseEditModal({ controller }) {
  const modal = controller.modal;
  const item = modal.item;
  const meta = CASE_STATUS_META[item.status] || {
    label: item.status,
    tone: "default",
  };

  return (
    <section className={styles.largeModal} role="dialog" aria-modal="true">
      <div className={styles.modalHeader}>
        <div>
          <span className={styles.eyebrow}>Gestão do caso</span>
          <h2>{item.titulo}</h2>
          <span
            className={`${styles.caseStatus} ${styles[`caseStatus_${meta.tone}`]}`}
          >
            {meta.label}
          </span>
        </div>
        <ModalClose controller={controller} />
      </div>

      <div className={styles.modalFormGrid}>
        <label className={styles.fieldWide}>
          <span>Título</span>
          <input
            type="text"
            maxLength={180}
            value={modal.form.titulo}
            onChange={(event) =>
              controller.setModal((current) => ({
                ...current,
                form: { ...current.form, titulo: event.target.value },
              }))
            }
          />
        </label>

        <label className={styles.field}>
          <span>Cidade</span>
          <input
            type="text"
            maxLength={120}
            value={modal.form.cidade}
            onChange={(event) =>
              controller.setModal((current) => ({
                ...current,
                form: { ...current.form, cidade: event.target.value },
              }))
            }
          />
        </label>

        <label className={styles.field}>
          <span>Estado</span>
          <select
            value={modal.form.estado}
            onChange={(event) =>
              controller.setModal((current) => ({
                ...current,
                form: { ...current.form, estado: event.target.value },
              }))
            }
          >
            <option value="">Selecione...</option>
            {BRAZIL_STATES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.fieldWide}>
          <span>Área jurídica</span>
          <select
            value={modal.form.area}
            onChange={(event) =>
              controller.setModal((current) => ({
                ...current,
                form: { ...current.form, area: event.target.value },
              }))
            }
          >
            <option value="">Selecione...</option>
            {CASE_AREAS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.fieldWide}>
          <span>Descrição</span>
          <textarea
            rows={8}
            maxLength={20000}
            value={modal.form.descricao}
            onChange={(event) =>
              controller.setModal((current) => ({
                ...current,
                form: { ...current.form, descricao: event.target.value },
              }))
            }
          />
        </label>
      </div>

      <div className={styles.modalInfoGrid}>
        <span>
          <FileText size={14} aria-hidden="true" />
          {Array.isArray(item.anexos) ? item.anexos.length : 0} anexo(s)
        </span>
        <span>
          <Scale size={14} aria-hidden="true" />
          {item.advogado_id ? "Advogado vinculado" : "Aguardando profissional"}
        </span>
      </div>

      <div className={styles.modalActionsSplit}>
        <div>
          {item.status !== "FECHADO" && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => controller.changeCaseStatus(item, "FECHADO")}
              disabled={controller.busy}
            >
              <CheckCircle2 size={15} aria-hidden="true" />
              Finalizar caso
            </button>
          )}
          <button
            type="button"
            className={styles.dangerOutlineButton}
            onClick={() =>
              controller.setModal({ type: "case-cancel-confirm", item })
            }
            disabled={controller.busy}
          >
            <Trash2 size={15} aria-hidden="true" />
            Cancelar caso
          </button>
        </div>

        <div>
          {item.advogado_id && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => {
                window.location.href = `/chat/${item.id}`;
              }}
            >
              <MessageSquare size={15} aria-hidden="true" />
              Abrir conversa
            </button>
          )}
          <button
            type="button"
            className={styles.primaryButton}
            onClick={controller.updateCase}
            disabled={
              controller.busy ||
              !modal.form.titulo.trim() ||
              !modal.form.descricao.trim() ||
              !modal.form.area ||
              !modal.form.cidade.trim() ||
              !modal.form.estado
            }
          >
            {controller.busy ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </section>
  );
}

function ConfirmModal({ controller, icon: Icon, title, description, confirmLabel, onConfirm, danger = false }) {
  return (
    <section className={styles.confirmModal} role="dialog" aria-modal="true">
      <ModalClose controller={controller} />
      <span className={danger ? styles.dangerModalIcon : styles.modalIcon}>
        <Icon size={24} aria-hidden="true" />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => controller.setModal(null)}
          disabled={controller.busy}
        >
          Voltar
        </button>
        <button
          type="button"
          className={danger ? styles.dangerButton : styles.primaryButton}
          onClick={onConfirm}
          disabled={controller.busy}
        >
          {controller.busy ? "Processando..." : confirmLabel}
        </button>
      </div>
    </section>
  );
}

function LawyerModal({ controller }) {
  const lawyer = controller.modal.item;
  const initials = String(lawyer.name || "Advogado")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <section className={styles.profileModal} role="dialog" aria-modal="true">
      <ModalClose controller={controller} />
      <div className={styles.lawyerModalHero}>
        <span className={styles.lawyerModalAvatar}>
          {lawyer.avatar ? (
            <Image
              src={lawyer.avatar}
              alt={`Foto de ${lawyer.name}`}
              width={92}
              height={92}
              unoptimized
            />
          ) : (
            initials
          )}
        </span>
        <div>
          <span className={styles.eyebrow}>Perfil profissional</span>
          <h2>{lawyer.name}</h2>
          <p>{lawyer.oab ? `OAB ${lawyer.oab}` : "OAB em verificação"}</p>
          <div className={styles.profileBadges}>
            {lawyer.oab_verification_status === "VERIFIED" && (
              <span>
                <VerifiedBadge size={36} /> OAB verificada
              </span>
            )}
            {lawyer.is_premium && (
              <span>
                <Sparkles size={13} aria-hidden="true" /> Profissional PRO
              </span>
            )}
          </div>
        </div>
      </div>

      {lawyer.nome_escritorio && (
        <div className={styles.modalNotice}>
          <Briefcase size={15} aria-hidden="true" />
          Membro de {lawyer.nome_escritorio}
        </div>
      )}

      <div className={styles.profileModalSection}>
        <h3>
          <User size={17} aria-hidden="true" /> Apresentação
        </h3>
        <p>
          {lawyer.bio ||
            "Este profissional ainda não adicionou uma apresentação pública."}
        </p>
      </div>

      <div className={styles.profileModalSection}>
        <h3>
          <Scale size={17} aria-hidden="true" /> Especialidades
        </h3>
        <div className={styles.tagList}>
          {String(lawyer.specialties || "Atuação jurídica geral")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => (
              <span key={item}>{item}</span>
            ))}
        </div>
      </div>

      <div className={styles.profileStatsGrid}>
        <div>
          <Star size={17} aria-hidden="true" />
          <strong>{Number(lawyer.avg_rating || 0).toFixed(1)}</strong>
          <span>{lawyer.total_ratings || 0} avaliação(ões)</span>
        </div>
        <div>
          <Scale size={17} aria-hidden="true" />
          <strong>{lawyer.consulta === "Paga" ? "Consulta paga" : "Contato inicial"}</strong>
          <span>
            {lawyer.valor ? `R$ ${Number(lawyer.valor).toFixed(2)}` : "Valor não informado"}
          </span>
        </div>
      </div>

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => controller.setModal(null)}
        >
          Fechar
        </button>
        {lawyer.is_premium ? (
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => controller.openChatSelector(lawyer)}
          >
            <MessageSquare size={15} aria-hidden="true" />
            Falar sobre um caso
          </button>
        ) : (
          <button type="button" className={styles.secondaryButton} disabled>
            <Lock size={14} aria-hidden="true" />
            Contato direto indisponível
          </button>
        )}
      </div>
    </section>
  );
}

function OfficeModal({ controller }) {
  const office = controller.modal.item;

  return (
    <section className={styles.largeModal} role="dialog" aria-modal="true">
      <div className={styles.modalHeader}>
        <div>
          <span className={styles.eyebrow}>Escritório cadastrado</span>
          <h2>{office.nome}</h2>
          <p>{office.advogados.length} profissional(is) vinculado(s)</p>
        </div>
        <ModalClose controller={controller} />
      </div>

      <div className={styles.officeLawyerList}>
        {office.advogados.map((lawyer) => (
          <button
            key={lawyer.id}
            type="button"
            className={styles.officeLawyerItem}
            onClick={() => controller.openLawyer(lawyer)}
          >
            <span>{String(lawyer.name || "A").slice(0, 2).toUpperCase()}</span>
            <div>
              <strong>{lawyer.name}</strong>
              <small>{lawyer.oab ? `OAB ${lawyer.oab}` : "OAB em verificação"}</small>
            </div>
            <ArrowLeft size={15} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

function CaseSelectModal({ controller }) {
  const lawyer = controller.modal.item;
  const available = controller.cases.filter(
    (item) =>
      ["ABERTO", "NEGOCIANDO"].includes(item.status) && !item.advogado_id,
  );

  return (
    <section className={styles.mediumModal} role="dialog" aria-modal="true">
      <ModalClose controller={controller} />
      <span className={styles.modalIcon}>
        <MessageSquare size={23} aria-hidden="true" />
      </span>
      <span className={styles.eyebrow}>Iniciar atendimento</span>
      <h2>Sobre qual caso deseja conversar?</h2>
      <p>
        Selecione um caso aberto para iniciar o contato com {lawyer.name}.
      </p>

      {available.length ? (
        <div className={styles.caseSelectList}>
          {available.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => controller.startChat(lawyer, item.id)}
              disabled={controller.busy}
            >
              <span>
                <strong>{item.titulo}</strong>
                <small>{item.area_atuacao || "Área não informada"}</small>
              </span>
              <MessageSquare size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.compactEmptyState}>
          <FileText size={22} aria-hidden="true" />
          <p>Você não possui um caso disponível para iniciar este contato.</p>
        </div>
      )}
    </section>
  );
}

function RatingModal({ controller }) {
  const modal = controller.modal;

  return (
    <section className={styles.mediumModal} role="dialog" aria-modal="true">
      <ModalClose controller={controller} />
      <span className={styles.modalIcon}>
        <Star size={23} aria-hidden="true" />
      </span>
      <span className={styles.eyebrow}>Avaliação do atendimento</span>
      <h2>Como foi sua experiência?</h2>
      <p>
        Avalie {modal.item.advogado_nome} no caso “{modal.item.caso_titulo}”.
      </p>

      <div className={styles.ratingButtons}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              controller.setModal((current) => ({ ...current, rating: value }))
            }
            onMouseEnter={() =>
              controller.setModal((current) => ({ ...current, hover: value }))
            }
            onMouseLeave={() =>
              controller.setModal((current) => ({ ...current, hover: 0 }))
            }
            aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
          >
            <Star
              size={36}
              fill={(modal.hover || modal.rating) >= value ? "currentColor" : "none"}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      <label className={styles.field}>
        <span>Comentário — opcional</span>
        <textarea
          rows={4}
          maxLength={1000}
          placeholder="Conte como foi o atendimento..."
          value={modal.justification}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              justification: event.target.value,
            }))
          }
        />
      </label>

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => controller.setModal(null)}
        >
          Avaliar depois
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={controller.submitRating}
          disabled={controller.busy || !modal.rating}
        >
          Enviar avaliação
        </button>
      </div>
    </section>
  );
}

function AccountDeletionModal({ controller }) {
  const modal = controller.modal;

  return (
    <section className={styles.mediumModal} role="dialog" aria-modal="true">
      <ModalClose controller={controller} />
      <span className={styles.dangerModalIcon}>
        <ShieldCheck size={23} aria-hidden="true" />
      </span>
      <span className={styles.eyebrow}>Privacidade e LGPD</span>
      <h2>Solicitar exclusão da conta</h2>
      <p>
        A solicitação será analisada em até 48 horas. Casos ativos, identidade e
        obrigações legais serão verificados antes da remoção.
      </p>

      <label className={styles.field}>
        <span>Confirme seu nome completo</span>
        <input
          type="text"
          maxLength={160}
          value={modal.confirmedName}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              confirmedName: event.target.value,
            }))
          }
        />
      </label>

      <label className={styles.field}>
        <span>Motivo da solicitação</span>
        <textarea
          rows={5}
          minLength={20}
          maxLength={1200}
          placeholder="Descreva por que deseja excluir sua conta..."
          value={modal.reason}
          onChange={(event) =>
            controller.setModal((current) => ({
              ...current,
              reason: event.target.value,
            }))
          }
        />
        <small>{modal.reason.length}/1200 caracteres · mínimo de 20</small>
      </label>

      <div className={styles.modalNotice}>
        <AlertTriangle size={16} aria-hidden="true" />
        O acesso continuará ativo enquanto o pedido estiver em análise. Você será
        informado quando o processamento for concluído.
      </div>

      <div className={styles.modalActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => controller.setModal(null)}
          disabled={controller.busy}
        >
          Cancelar
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={controller.requestAccountDeletion}
          disabled={
            controller.busy ||
            modal.confirmedName.trim().length < 3 ||
            modal.reason.trim().length < 20
          }
        >
          {controller.busy ? "Enviando..." : "Registrar solicitação"}
        </button>
      </div>
    </section>
  );
}

function DeletionRequestedModal({ controller }) {
  return (
    <section className={styles.confirmModal} role="dialog" aria-modal="true">
      <ModalClose controller={controller} />
      <span className={styles.modalIcon}>
        <CheckCircle2 size={25} aria-hidden="true" />
      </span>
      <h2>Solicitação registrada</h2>
      <p>
        Sua solicitação foi recebida e será analisada pela equipe responsável. O
        prazo operacional informado é de até 48 horas.
      </p>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={() => controller.setModal(null)}
      >
        Entendi
      </button>
    </section>
  );
}

export default function ClientModals({ controller }) {
  const modal = controller.modal;

  useEffect(() => {
    if (!modal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !controller.busy) controller.setModal(null);
    };
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [controller, modal]);

  if (!modal) return null;

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={() => !controller.busy && controller.setModal(null)}
    >
      <div onMouseDown={(event) => event.stopPropagation()}>
        {modal.type === "case-edit" && <CaseEditModal controller={controller} />}
        {modal.type === "case-cancel-confirm" && (
          <ConfirmModal
            controller={controller}
            icon={Trash2}
            title="Cancelar este caso?"
            description="O caso será removido das oportunidades, os profissionais interessados serão notificados e o histórico será preservado."
            confirmLabel="Cancelar caso"
            onConfirm={() => controller.cancelCase(modal.item)}
            danger
          />
        )}
        {modal.type === "lawyer" && <LawyerModal controller={controller} />}
        {modal.type === "office" && <OfficeModal controller={controller} />}
        {modal.type === "case-select" && <CaseSelectModal controller={controller} />}
        {modal.type === "rating" && <RatingModal controller={controller} />}
        {modal.type === "notification-delete" && (
          <ConfirmModal
            controller={controller}
            icon={Trash2}
            title="Remover notificação?"
            description="Esta notificação deixará de aparecer na sua central."
            confirmLabel="Remover"
            onConfirm={() => controller.deleteNotification(modal.item.id)}
            danger
          />
        )}
        {modal.type === "notifications-clear" && (
          <ConfirmModal
            controller={controller}
            icon={Trash2}
            title="Limpar todas as notificações?"
            description="Todas as notificações visíveis serão removidas da sua central."
            confirmLabel="Limpar central"
            onConfirm={controller.clearNotifications}
            danger
          />
        )}
        {modal.type === "account-deletion" && (
          <AccountDeletionModal controller={controller} />
        )}
        {modal.type === "deletion-requested" && (
          <DeletionRequestedModal controller={controller} />
        )}
      </div>
    </div>
  );
}
