"use client";

import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  RotateCcw,
  Settings,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { PLAN_LIMITS } from "@/lib/planUtils";
import {
  BRAZIL_STATES,
  getPlanExpirationStatus,
  getPlanType,
} from "../utils/lawyerFormatters";
import planStyles from "./PlanOverview.module.css";
import styles from "../AdvogadosAdmin.module.css";

function UsageBar({ label, used, limit, suffix = "" }) {
  const unlimited = limit === Infinity;
  const percentage = unlimited
    ? 0
    : Math.min(
        100,
        (Number(used || 0) / Math.max(Number(limit || 0), 1)) * 100,
      );

  return (
    <div className={styles.usageItem}>
      <div className={styles.usageHeader}>
        <span>{label}</span>
        <strong>
          {Number(used || 0).toLocaleString("pt-BR")}
          {suffix} / {unlimited
            ? "Ilimitado"
            : `${Number(limit || 0).toLocaleString("pt-BR")}${suffix}`}
        </strong>
      </div>
      {!unlimited && (
        <div className={styles.usageTrack}>
          <span style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

function getExpirationStatusClass(tone) {
  if (tone === "success") return planStyles.statusSuccess;
  if (tone === "warning") return planStyles.statusWarning;
  if (tone === "danger") return planStyles.statusDanger;
  return planStyles.statusMuted;
}

function PlanOverview({ lawyer }) {
  const planType = getPlanType(lawyer);
  const expiration = getPlanExpirationStatus(lawyer);
  const activeInDatabase = Boolean(lawyer.is_premium);
  const paidPlan = planType === "START" || planType === "PRO";

  return (
    <div className={planStyles.overview}>
      <div className={planStyles.overviewHeader}>
        <div>
          <span className={planStyles.eyebrow}>Situação atual</span>
          <strong>Plano {planType}</strong>
        </div>

        <span
          className={`${planStyles.status} ${getExpirationStatusClass(
            expiration.tone,
          )}`}
        >
          {expiration.label}
        </span>
      </div>

      <dl className={planStyles.detailsGrid}>
        <div>
          <dt>Plano registrado</dt>
          <dd>{planType}</dd>
        </div>
        <div>
          <dt>Ativo no banco</dt>
          <dd>{activeInDatabase ? "Sim" : "Não"}</dd>
        </div>
        <div>
          <dt>Tipo pago</dt>
          <dd>{paidPlan ? "Sim" : "Não"}</dd>
        </div>
        <div>
          <dt>Expiração</dt>
          <dd>{expiration.detail}</dd>
        </div>
      </dl>

      {expiration.inconsistent && (
        <div className={planStyles.alert} role="alert">
          <ShieldAlert size={18} aria-hidden="true" />
          <div>
            <strong>Possível inconsistência de plano</strong>
            <span>
              {expiration.expired
                ? "A data de expiração já passou, mas o advogado ainda aparece com plano ativo. Revise e remova o plano manualmente, se necessário."
                : "O plano está ativo, mas não possui uma data de expiração válida registrada."}
            </span>
          </div>
        </div>
      )}

      {!expiration.inconsistent && paidPlan && (
        <div className={planStyles.healthy}>
          <CheckCircle2 size={17} aria-hidden="true" />
          <span>O plano e a data de expiração estão consistentes.</span>
        </div>
      )}
    </div>
  );
}

function UsageContent({ lawyer }) {
  const planType = getPlanType(lawyer);
  const base = PLAN_LIMITS[planType] || PLAN_LIMITS.FREE;

  const limits = useMemo(
    () => ({
      redator: base.redator_ia + Number(lawyer.extra_redator_ia || 0),
      triagem: base.triagem + Number(lawyer.extra_triagem || 0),
      storage: base.smart_docs_mb + Number(lawyer.extra_storage_mb || 0),
      agenda: base.agenda,
      crm: base.crm_clients,
    }),
    [base, lawyer],
  );

  return (
    <div className={styles.usagePanel}>
      <div className={styles.modalLawyerSummary}>
        <strong>{lawyer.name || "Advogado"}</strong>
        <span>Plano atual: {planType}</span>
      </div>

      <UsageBar
        label="Redator IA Jurídico"
        used={lawyer.uso_redator_ia}
        limit={limits.redator}
        suffix=" min"
      />
      <UsageBar
        label="Triagem IA e diagnóstico"
        used={lawyer.uso_triagem}
        limit={limits.triagem}
      />
      <UsageBar
        label="Agenda e prazos"
        used={lawyer.uso_agenda}
        limit={limits.agenda}
      />
      <UsageBar
        label="Smart Docs"
        used={Number(lawyer.uso_storage_mb || 0).toFixed(1)}
        limit={limits.storage}
        suffix=" MB"
      />
      <UsageBar
        label="Clientes CRM"
        used={lawyer.crm_count}
        limit={limits.crm}
      />
    </div>
  );
}

function ManageContent({ lawyer, busy, onAction }) {
  const [selectedPlan, setSelectedPlan] = useState("PRO");
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [jurisAmount, setJurisAmount] = useState(10);
  const [oab, setOab] = useState(lawyer.oab || "");
  const [estado, setEstado] = useState(lawyer.estado || "");

  const submit = async (action, value) => {
    await onAction(lawyer, action, value);
  };

  return (
    <div className={styles.manageContent}>
      <section className={styles.manageSection}>
        <div className={planStyles.sectionTitle}>
          <CalendarClock size={18} aria-hidden="true" />
          <div>
            <h3>Plano e expiração</h3>
            <p>
              Consulte o estado real do plano antes de conceder, renovar ou remover.
            </p>
          </div>
        </div>

        <PlanOverview lawyer={lawyer} />

        <div className={styles.formGridTwo}>
          <select
            value={selectedPlan}
            onChange={(event) => setSelectedPlan(event.target.value)}
            disabled={busy}
          >
            <option value="START">Plano START</option>
            <option value="PRO">Plano PRO</option>
          </select>
          <select
            value={selectedDuration}
            onChange={(event) => setSelectedDuration(Number(event.target.value))}
            disabled={busy}
          >
            <option value={7}>7 dias</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </div>

        <div className={styles.manageActionsRow}>
          <button
            type="button"
            className={styles.primaryManageButton}
            onClick={() =>
              submit("GIVE_PLAN", {
                planType: selectedPlan,
                days: selectedDuration,
              })
            }
            disabled={busy}
          >
            Conceder {selectedDuration} dias de {selectedPlan}
          </button>

          {(lawyer.is_premium || getPlanType(lawyer) !== "FREE") && (
            <button
              type="button"
              className={styles.dangerManageButton}
              onClick={() => submit("REMOVE_PRO")}
              disabled={busy}
            >
              Remover plano
            </button>
          )}
        </div>
      </section>

      <section className={styles.manageSection}>
        <h3>Saldo de Juris</h3>
        <p>Saldo atual: {lawyer.balance || 0} Juris.</p>

        <div className={styles.manageActionsRow}>
          <input
            type="number"
            min="1"
            max="100000"
            value={jurisAmount}
            onChange={(event) => setJurisAmount(event.target.value)}
            disabled={busy}
          />
          <button
            type="button"
            className={styles.primaryManageButton}
            onClick={() => submit("ADD_JURIS", jurisAmount)}
            disabled={busy}
          >
            Adicionar
          </button>
          <button
            type="button"
            className={styles.dangerManageButton}
            onClick={() => submit("REMOVE_JURIS", jurisAmount)}
            disabled={busy}
          >
            Remover
          </button>
        </div>
      </section>

      <section className={styles.manageSection}>
        <h3>Verificação da OAB</h3>
        <p>Atualize o status da validação manual.</p>

        <select
          value={lawyer.oab_verification_status || "PENDING"}
          onChange={(event) => submit("SET_OAB_STATUS", event.target.value)}
          disabled={busy}
        >
          <option value="PENDING">Pendente</option>
          <option value="VERIFIED">Verificada</option>
          <option value="ERROR">Erro de verificação</option>
        </select>
      </section>

      <section className={styles.manageSection}>
        <h3>Dados profissionais</h3>
        <p>Atualize o número da OAB e o estado de registro.</p>

        <div className={styles.formGridThree}>
          <input
            type="text"
            value={oab}
            onChange={(event) => setOab(event.target.value)}
            placeholder="Número da OAB"
            disabled={busy}
          />
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value)}
            disabled={busy}
          >
            <option value="">UF</option>
            {BRAZIL_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.primaryManageButton}
            onClick={() =>
              submit("UPDATE_OAB", {
                oab: oab.trim(),
                estado,
              })
            }
            disabled={busy || !oab.trim() || !estado}
          >
            Salvar OAB
          </button>
        </div>
      </section>

      <section className={styles.manageSection}>
        <h3>Uso de ferramentas</h3>
        <UsageContent lawyer={lawyer} />
      </section>
    </div>
  );
}

export default function LawyerModal({
  modal,
  busyId,
  onClose,
  onDelete,
  onReset,
  onAction,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!modal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && busyId !== modal.lawyer.id) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [modal, busyId, onClose]);

  if (!modal) return null;

  const busy = busyId === modal.lawyer.id;
  const titles = {
    manage: "Gerenciar advogado",
    usage: "Uso de ferramentas premium",
    reset: "Resetar senha",
    delete: "Excluir advogado",
  };
  const icons = {
    manage: Settings,
    usage: BarChart3,
    reset: RotateCcw,
    delete: Trash2,
  };
  const Icon = icons[modal.type] || Settings;

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className={`${styles.modalCard} ${
          modal.type === "manage" || modal.type === "usage"
            ? styles.modalCardWide
            : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lawyer-modal-title"
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <span className={styles.modalIcon}>
            <Icon size={20} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.modalEyebrow}>Ação administrativa</span>
            <h2 id="lawyer-modal-title">{titles[modal.type]}</h2>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.modalBody}>
          {modal.type === "usage" && <UsageContent lawyer={modal.lawyer} />}
          {modal.type === "manage" && (
            <ManageContent
              lawyer={modal.lawyer}
              busy={busy}
              onAction={onAction}
            />
          )}

          {(modal.type === "delete" || modal.type === "reset") && (
            <>
              <p>
                {modal.type === "delete" ? (
                  <>
                    Confirma a exclusão de{" "}
                    <strong>{modal.lawyer.name || "advogado"}</strong>? Esta
                    ação não poderá ser desfeita.
                  </>
                ) : (
                  <>
                    Confirma o reset de senha de{" "}
                    <strong>{modal.lawyer.name || "advogado"}</strong>?
                  </>
                )}
              </p>
              <div className={styles.modalNotice}>
                <AlertTriangle size={17} aria-hidden="true" />
                <span>
                  {modal.type === "delete"
                    ? "Revise cuidadosamente antes de excluir esta conta."
                    : "A API atual ainda utiliza uma senha temporária padrão e será revisada na etapa técnica."}
                </span>
              </div>
            </>
          )}
        </div>

        <footer className={styles.modalActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={onClose}
            disabled={busy}
          >
            {modal.type === "manage" || modal.type === "usage"
              ? "Fechar"
              : "Cancelar"}
          </button>

          {modal.type === "delete" && (
            <button
              type="button"
              className={styles.confirmDangerButton}
              onClick={onDelete}
              disabled={busy}
            >
              {busy ? "Excluindo..." : "Confirmar exclusão"}
            </button>
          )}

          {modal.type === "reset" && (
            <button
              type="button"
              className={styles.confirmWarningButton}
              onClick={onReset}
              disabled={busy}
            >
              {busy ? "Resetando..." : "Confirmar reset"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
