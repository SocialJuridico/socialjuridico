"use client";

import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";

import AdvogadoMesAudit from "./components/AdvogadoMesAudit";
import AdvogadoMesForm from "./components/AdvogadoMesForm";
import AdvogadoMesHeader from "./components/AdvogadoMesHeader";
import AdvogadoMesPreview from "./components/AdvogadoMesPreview";
import AdvogadoMesSummary from "./components/AdvogadoMesSummary";
import { useAdvogadoMesAdmin } from "./useAdvogadoMesAdmin";
import styles from "./AdvogadoMesAdmin.module.css";

export default function AdvogadoMesAdminPage() {
  const state = useAdvogadoMesAdmin();

  if (state.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.spinner} aria-hidden="true" />
        <h1>Carregando Advogado do Mês</h1>
        <p>Validando publicação, agenda, Storage e auditoria.</p>
      </main>
    );
  }

  if (state.loadError && !state.original.id) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar o módulo</h1>
        <p>{state.loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => state.loadConfig()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <AdvogadoMesHeader state={state} />

      {state.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Os dados podem estar desatualizados</strong>
            <p>{state.loadError}</p>
          </div>
          <button type="button" onClick={() => state.loadConfig()}>
            Atualizar
          </button>
        </div>
      )}

      {!state.auditAvailable && (
        <div className={styles.migrationBanner} role="status">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Auditoria administrativa ainda não habilitada</strong>
            <p>
              Execute primeiro a migração de governança dos banners para registrar
              todas as alterações deste módulo.
            </p>
          </div>
        </div>
      )}

      {state.dirty && (
        <div className={styles.unsavedBanner} role="status">
          <span />
          <div>
            <strong>Existem alterações não salvas</strong>
            <p>
              A prévia já reflete o formulário, mas o popup público ainda mantém a
              última versão salva.
            </p>
          </div>
        </div>
      )}

      <AdvogadoMesSummary
        config={state.original}
        auditCount={state.recentAudit.length}
      />

      <section className={styles.contentGrid}>
        <AdvogadoMesForm state={state} />
        <AdvogadoMesPreview config={state.config} />
      </section>

      <AdvogadoMesAudit
        items={state.recentAudit}
        available={state.auditAvailable}
        governance={state.governance}
      />
    </main>
  );
}
