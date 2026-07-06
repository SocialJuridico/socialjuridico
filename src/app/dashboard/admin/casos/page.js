"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import CaseManagementDrawer from "./components/CaseManagementDrawer";
import CasePipelineBoard from "./components/CasePipelineBoard";
import CasesHeader from "./components/CasesHeader";
import CasesList from "./components/CasesList";
import CasesNavigation from "./components/CasesNavigation";
import CasesSummary from "./components/CasesSummary";
import CasesToolbar from "./components/CasesToolbar";
import EmailFunnelPanel from "./components/EmailFunnelPanel";
import { CASE_VIEWS } from "./config/caseManagement";
import { useAdminCases } from "./hooks/useAdminCases";
import styles from "./CasosAdmin.module.css";

export default function AdminCasosPage() {
  const state = useAdminCases();

  if (state.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando gestão de casos</h1>
        <p>Preparando o funil, os alertas operacionais e a governança.</p>
      </main>
    );
  }

  if (state.loadError && state.cases.length === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar os casos</h1>
        <p>{state.loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => state.loadCases()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  const visibleCount =
    state.view === CASE_VIEWS.EMAIL_FUNNEL
      ? state.funnelEvents.length
      : state.filteredCases.length;

  return (
    <main className={styles.page}>
      <div className={styles.pageShell}>
        <CasesHeader
          total={state.summary.total}
          loading={state.loading}
          governanceAvailable={state.governanceAvailable}
          onReload={() => state.loadCases()}
        />

        {state.loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Não foi possível atualizar os dados</strong>
              <p>{state.loadError}</p>
            </div>
            <button type="button" onClick={() => state.loadCases()}>
              Atualizar
            </button>
          </div>
        )}

        {!state.governanceAvailable && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Governança ainda não disponível no banco</strong>
              <p>
                A listagem permanece funcional, mas atualizações de etapa,
                retenção, legal hold e auditoria dependem da migração administrativa.
              </p>
            </div>
          </div>
        )}

        <CasesSummary summary={state.summary} />

        <CasesNavigation
          activeView={state.view}
          onChange={state.setView}
        />

        <CasesToolbar
          view={state.view}
          searchTerm={state.searchTerm}
          stageFilter={state.stageFilter}
          riskFilter={state.riskFilter}
          intentFilter={state.intentFilter}
          alertsOnly={state.alertsOnly}
          funnelTypeFilter={state.funnelTypeFilter}
          funnelAlertsOnly={state.funnelAlertsOnly}
          visibleCount={visibleCount}
          onSearchChange={state.setSearchTerm}
          onStageFilterChange={state.setStageFilter}
          onRiskFilterChange={state.setRiskFilter}
          onIntentFilterChange={state.setIntentFilter}
          onAlertsOnlyChange={state.setAlertsOnly}
          onFunnelTypeFilterChange={state.setFunnelTypeFilter}
          onFunnelAlertsOnlyChange={state.setFunnelAlertsOnly}
        />

        {state.view === CASE_VIEWS.PIPELINE && (
          <CasePipelineBoard
            casesByStage={state.casesByStage}
            summary={state.pipelineSummary}
            onOpen={state.openCase}
          />
        )}

        {state.view === CASE_VIEWS.LIST && (
          <CasesList
            cases={state.filteredCases}
            onOpen={state.openCase}
          />
        )}

        {state.view === CASE_VIEWS.EMAIL_FUNNEL && (
          <EmailFunnelPanel
            events={state.funnelEvents}
            summary={state.funnelSummary}
            loading={state.loadingFunnel}
            onReload={state.loadFunnel}
          />
        )}
      </div>

      {state.selectedCase && (
        <CaseManagementDrawer
          caseItem={state.selectedCase}
          sensitiveDetail={state.sensitiveDetail}
          loadingSensitiveDetail={state.loadingSensitiveDetail}
          auditLogs={state.auditLogs}
          loadingAudit={state.loadingAudit}
          actionName={state.actionName}
          onClose={state.closeCase}
          onLoadAudit={state.loadAudit}
          onUpdateGovernance={state.updateGovernance}
          onNotifyClient={state.notifyClient}
          onArchive={state.archiveCase}
          onRestore={state.restoreCase}
          onLegalHold={state.setLegalHold}
          onUnlockSensitive={state.unlockSensitiveDetail}
        />
      )}
    </main>
  );
}
