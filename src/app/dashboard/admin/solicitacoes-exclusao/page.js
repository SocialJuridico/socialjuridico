"use client";

import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";

import DeletionAudit from "./components/DeletionAudit";
import DeletionHeader from "./components/DeletionHeader";
import DeletionModal from "./components/DeletionModal";
import DeletionQueue from "./components/DeletionQueue";
import DeletionSummary from "./components/DeletionSummary";
import { useDeletionRequests } from "./useDeletionRequests";
import styles from "./DeletionRequests.module.css";

export default function AdminDeletionRequestsPage() {
  const controller = useDeletionRequests();

  if (controller.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.spinner} aria-hidden="true" />
        <h1>Carregando central de privacidade</h1>
        <p>Validando fila, prazos, decisões e trilha de auditoria.</p>
      </main>
    );
  }

  if (controller.loadError && controller.requests.length === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar o módulo</h1>
        <p>{controller.loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => controller.loadRequests()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <DeletionHeader controller={controller} />

      {controller.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Os dados podem estar desatualizados</strong>
            <p>{controller.loadError}</p>
          </div>
          <button type="button" onClick={() => controller.loadRequests()}>
            Atualizar
          </button>
        </div>
      )}

      {!controller.auditAvailable && (
        <div className={styles.migrationBanner} role="status">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Governança de exclusões ainda não habilitada</strong>
            <p>
              Execute a migração antes de consultar dados protegidos ou processar
              solicitações.
            </p>
          </div>
        </div>
      )}

      <DeletionSummary summary={controller.summary} />
      <DeletionQueue controller={controller} />
      <DeletionAudit
        items={controller.recentAudit}
        available={controller.auditAvailable}
      />
      <DeletionModal controller={controller} />
    </main>
  );
}
