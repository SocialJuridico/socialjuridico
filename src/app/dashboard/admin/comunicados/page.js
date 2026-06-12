"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import BroadcastForm from "./components/BroadcastForm";
import BroadcastHeader from "./components/BroadcastHeader";
import BroadcastSummary from "./components/BroadcastSummary";
import ConfirmBroadcastDialog from "./components/ConfirmBroadcastDialog";
import { useAdminBroadcasts } from "./hooks/useAdminBroadcasts";
import styles from "./ComunicadosAdmin.module.css";

export default function AdminComunicadosPage() {
  const state = useAdminBroadcasts();

  if (state.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando comunicados</h1>
        <p>Preparando públicos e configurações de envio.</p>
      </main>
    );
  }

  if (state.loadError && state.counts.total === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar os comunicados</h1>
        <p>{state.loadError}</p>
        <button type="button" className={styles.secondaryButton} onClick={state.loadOverview}>
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageShell}>
        <BroadcastHeader loading={state.loading} onReload={state.loadOverview} />

        {state.loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Não foi possível atualizar os dados</strong>
              <p>{state.loadError}</p>
            </div>
            <button type="button" onClick={state.loadOverview}>Atualizar</button>
          </div>
        )}

        <BroadcastSummary counts={state.counts} />

        <BroadcastForm
          form={state.form}
          audienceOptions={state.audienceOptions}
          audienceOption={state.audienceOption}
          limits={state.limits}
          recipientType={state.recipientType}
          recipients={state.recipients}
          loadingRecipients={state.loadingRecipients}
          estimatedRecipients={state.estimatedRecipients}
          sending={state.sending}
          canSubmit={state.canSubmit}
          onChange={state.updateForm}
          onSubmit={state.requestSubmit}
        />
      </div>

      <ConfirmBroadcastDialog
        open={state.confirmOpen}
        audienceLabel={state.audienceOption?.label || "o público selecionado"}
        estimatedRecipients={state.estimatedRecipients}
        sending={state.sending}
        onClose={() => state.setConfirmOpen(false)}
        onConfirm={state.sendBroadcast}
      />
    </main>
  );
}
