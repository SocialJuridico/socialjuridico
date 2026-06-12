"use client";

import {
  Archive,
  Gavel,
  LoaderCircle,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  CASE_RISK_LEVELS,
  CASE_STAGES,
} from "../../config/caseManagement";
import styles from "../../CasosAdmin.module.css";
import { toDateTimeLocal } from "./drawerUtils";

const EDITABLE_STAGES = CASE_STAGES.filter(
  (stage) => stage.value !== "ARCHIVED",
);

export default function CaseGovernanceTab({
  caseItem,
  actionName,
  busy,
  onUpdateGovernance,
  onArchive,
  onRestore,
  onLegalHold,
}) {
  const [operationalStage, setOperationalStage] = useState(caseItem.stage);
  const [riskLevel, setRiskLevel] = useState(caseItem.privacyAttention);
  const [nextActionAt, setNextActionAt] = useState(
    toDateTimeLocal(caseItem.governance?.nextActionAt),
  );
  const [archiveReason, setArchiveReason] = useState("");
  const [legalHoldReason, setLegalHoldReason] = useState("");

  useEffect(() => {
    setOperationalStage(
      caseItem.stage === "ARCHIVED" ? "CLOSED" : caseItem.stage,
    );
    setRiskLevel(caseItem.privacyAttention);
    setNextActionAt(toDateTimeLocal(caseItem.governance?.nextActionAt));
    setArchiveReason("");
    setLegalHoldReason("");
  }, [
    caseItem.id,
    caseItem.stage,
    caseItem.privacyAttention,
    caseItem.governance?.nextActionAt,
  ]);

  function submitGovernance(event) {
    event.preventDefault();
    onUpdateGovernance({
      operationalStage,
      riskLevel,
      nextActionAt: nextActionAt
        ? new Date(nextActionAt).toISOString()
        : null,
    });
  }

  return (
    <div className={styles.drawerSectionStack}>
      <form className={styles.drawerPanel} onSubmit={submitGovernance}>
        <div className={styles.drawerPanelHeader}>
          <h3>Classificação e próxima ação</h3>
          <ShieldCheck size={17} aria-hidden="true" />
        </div>

        <div className={styles.drawerFormGrid}>
          <label>
            <span>Etapa operacional</span>
            <select
              value={operationalStage}
              onChange={(event) => setOperationalStage(event.target.value)}
              disabled={caseItem.stage === "ARCHIVED"}
            >
              {EDITABLE_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Nível de atenção</span>
            <select
              value={riskLevel}
              onChange={(event) => setRiskLevel(event.target.value)}
            >
              {CASE_RISK_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fullWidth}>
            <span>Próxima ação programada</span>
            <input
              type="datetime-local"
              value={nextActionAt}
              onChange={(event) => setNextActionAt(event.target.value)}
            />
          </label>
        </div>

        <button
          type="submit"
          className={styles.primaryButton}
          disabled={busy || caseItem.stage === "ARCHIVED"}
        >
          {actionName === "UPDATE_GOVERNANCE" ? (
            <LoaderCircle
              size={16}
              className={styles.spinning}
              aria-hidden="true"
            />
          ) : (
            <Save size={16} aria-hidden="true" />
          )}
          Salvar governança
        </button>
      </form>

      <section className={styles.drawerPanel}>
        <div className={styles.drawerPanelHeader}>
          <h3>Preservação jurídica</h3>
          <Gavel size={17} aria-hidden="true" />
        </div>
        <p className={styles.drawerPanelText}>
          O legal hold impede arquivamento e eliminação enquanto existir
          obrigação de preservação, investigação ou demanda jurídica.
        </p>
        <textarea
          value={legalHoldReason}
          onChange={(event) => setLegalHoldReason(event.target.value)}
          placeholder="Justificativa obrigatória para alterar a preservação jurídica."
          maxLength={1000}
        />
        <button
          type="button"
          className={
            caseItem.governance?.legalHold
              ? styles.secondaryButton
              : styles.warningButton
          }
          onClick={() =>
            onLegalHold({
              legalHold: !caseItem.governance?.legalHold,
              reason: legalHoldReason,
            })
          }
          disabled={busy || legalHoldReason.trim().length < 10}
        >
          <Gavel size={16} aria-hidden="true" />
          {caseItem.governance?.legalHold
            ? "Desativar preservação"
            : "Ativar preservação jurídica"}
        </button>
      </section>

      <section className={styles.drawerPanel}>
        <div className={styles.drawerPanelHeader}>
          <h3>Ciclo de vida</h3>
          <Archive size={17} aria-hidden="true" />
        </div>

        {caseItem.stage === "ARCHIVED" ? (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onRestore}
            disabled={busy}
          >
            {actionName === "RESTORE" ? (
              <LoaderCircle
                size={16}
                className={styles.spinning}
                aria-hidden="true"
              />
            ) : (
              <RotateCcw size={16} aria-hidden="true" />
            )}
            Restaurar caso
          </button>
        ) : (
          <>
            <textarea
              value={archiveReason}
              onChange={(event) => setArchiveReason(event.target.value)}
              placeholder="Motivo do arquivamento. O histórico não será destruído."
              maxLength={1000}
            />
            <button
              type="button"
              className={styles.dangerOutlineButton}
              onClick={() => onArchive(archiveReason)}
              disabled={
                busy ||
                archiveReason.trim().length < 10 ||
                caseItem.governance?.legalHold
              }
            >
              {actionName === "ARCHIVE" ? (
                <LoaderCircle
                  size={16}
                  className={styles.spinning}
                  aria-hidden="true"
                />
              ) : (
                <Archive size={16} aria-hidden="true" />
              )}
              Arquivar caso
            </button>
          </>
        )}
      </section>
    </div>
  );
}
