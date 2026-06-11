"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import SurveyAiCopilot from "./components/SurveyAiCopilot";
import SurveysHeader from "./components/SurveysHeader";
import SurveysList from "./components/SurveysList";
import SurveysSummary from "./components/SurveysSummary";
import { SURVEY_TABS } from "./config/surveyQuestions";
import { useAdminSurveys } from "./hooks/useAdminSurveys";
import styles from "./Pesquisas.module.css";

export default function AdminPesquisasPage() {
  const state = useAdminSurveys();

  if (state.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando pesquisas</h1>
        <p>Preparando os feedbacks de advogados e clientes.</p>
      </main>
    );
  }

  if (state.loadError && state.stats.total === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} />
        </span>
        <h1>Não foi possível carregar as pesquisas</h1>
        <p>{state.loadError}</p>
        <button
          type="button"
          className={styles.reloadButton}
          onClick={state.loadSurveys}
        >
          <RefreshCw size={16} /> Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <SurveysHeader
        total={state.stats.total}
        loading={state.loading}
        onReload={state.loadSurveys}
      />

      {state.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Dados parcialmente indisponíveis</strong>
            <p>{state.loadError}</p>
          </div>
          <button type="button" onClick={state.loadSurveys}>
            Atualizar
          </button>
        </div>
      )}

      <SurveysSummary stats={state.stats} />

      <SurveyAiCopilot
        summary={state.aiSummary}
        generating={state.generatingAi}
        onGenerate={state.generateAiSummary}
      />

      <nav className={styles.tabs} aria-label="Categorias das pesquisas">
        <button
          type="button"
          className={`${styles.tabBtn} ${
            state.activeTab === SURVEY_TABS.LAWYERS ? styles.active : ""
          }`}
          onClick={() => state.setActiveTab(SURVEY_TABS.LAWYERS)}
          aria-pressed={state.activeTab === SURVEY_TABS.LAWYERS}
        >
          Advogados ({state.data.advogados.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${
            state.activeTab === SURVEY_TABS.CLIENTS ? styles.active : ""
          }`}
          onClick={() => state.setActiveTab(SURVEY_TABS.CLIENTS)}
          aria-pressed={state.activeTab === SURVEY_TABS.CLIENTS}
        >
          Clientes ({state.data.clientes.length})
        </button>
      </nav>

      <SurveysList
        tab={state.activeTab}
        items={state.activeItems}
        questions={state.activeQuestions}
        expandedId={state.expandedId}
        onToggle={state.toggleExpanded}
        calculateAverage={state.calculateAverage}
      />
    </main>
  );
}
