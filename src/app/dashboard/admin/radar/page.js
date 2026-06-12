"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import RadarFilters from "./components/RadarFilters";
import RadarHeader from "./components/RadarHeader";
import RadarList from "./components/RadarList";
import RadarModals from "./components/RadarModals";
import RadarPanels from "./components/RadarPanels";
import RadarSearchReport from "./components/RadarSearchReport";
import RadarSummary from "./components/RadarSummary";
import { useAdminRadar } from "./hooks/useAdminRadar";
import styles from "./page.module.css";

export default function AdminRadarPage() {
  const radar = useAdminRadar();

  if (!radar.admin && !radar.loadError) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.spinner} aria-hidden="true" />
        <h1>Carregando Radar Jurídico</h1>
        <p>Validando sua sessão administrativa.</p>
      </main>
    );
  }

  if (radar.loadError && !radar.admin) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} />
        </span>
        <h1>Não foi possível abrir o Radar</h1>
        <p>{radar.loadError}</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <RadarHeader
        admin={radar.admin}
        pendingEmails={radar.pendingEmails}
        busy={radar.busy}
        onReload={radar.loadItems}
        onOpenPanel={radar.openPanel}
        onSearch={radar.executeSearch}
        onSendEmails={radar.sendEmails}
      />

      {radar.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Dados parcialmente indisponíveis</strong>
            <p>{radar.loadError}</p>
          </div>
          <button type="button" onClick={radar.loadItems}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      )}

      <RadarSummary summary={radar.summary} />

      <RadarPanels
        panel={radar.panel}
        form={radar.form}
        setForm={radar.setForm}
        jsonText={radar.jsonText}
        setJsonText={radar.setJsonText}
        captureForm={radar.captureForm}
        setCaptureForm={radar.setCaptureForm}
        capturePreview={radar.capturePreview}
        setCapturePreview={radar.setCapturePreview}
        busy={radar.busy}
        onClose={() => radar.setPanel(null)}
        onCreate={radar.createItem}
        onImport={radar.importItems}
        onAnalyze={radar.analyzeCapture}
        onSaveCapture={radar.saveCapture}
      />

      <RadarSearchReport
        result={radar.searchResult}
        onClose={() => radar.setSearchResult(null)}
      />

      <RadarFilters
        statusFilter={radar.statusFilter}
        sourceTypeFilter={radar.sourceTypeFilter}
        reportedOnly={radar.reportedOnly}
        onStatus={(value) => {
          radar.setStatusFilter(value);
          radar.setPage(1);
        }}
        onSource={(value) => {
          radar.setSourceTypeFilter(value);
          radar.setPage(1);
        }}
        onReported={(value) => {
          radar.setReportedOnly(value);
          radar.setPage(1);
        }}
      />

      <RadarList
        items={radar.items}
        loading={radar.loading}
        busy={radar.busy}
        onEdit={radar.setEditingItem}
        onApprove={radar.approve}
        onReject={(id) => {
          radar.setRejectingId(id);
          radar.setRejectReason("");
        }}
        onArchive={radar.archive}
        onDelete={radar.openDelete}
      />

      {radar.pagination.pages > 1 && (
        <nav className={styles.pagination} aria-label="Paginação do Radar">
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={radar.page <= 1}
            onClick={() =>
              radar.setPage((current) => Math.max(1, current - 1))
            }
          >
            Anterior
          </button>
          <span>
            Página {radar.page} de {radar.pagination.pages}
          </span>
          <button
            type="button"
            className={styles.secondaryButton}
            disabled={radar.page >= radar.pagination.pages}
            onClick={() =>
              radar.setPage((current) =>
                Math.min(radar.pagination.pages, current + 1),
              )
            }
          >
            Próxima
          </button>
        </nav>
      )}

      <RadarModals
        editingItem={radar.editingItem}
        setEditingItem={radar.setEditingItem}
        rejectingId={radar.rejectingId}
        setRejectingId={radar.setRejectingId}
        rejectReason={radar.rejectReason}
        setRejectReason={radar.setRejectReason}
        deletingItem={radar.deletingItem}
        setDeletingItem={radar.setDeletingItem}
        deleteReason={radar.deleteReason}
        setDeleteReason={radar.setDeleteReason}
        busy={radar.busy}
        onReject={radar.reject}
        onDelete={radar.deleteApproved}
        onSaveEdit={radar.saveEdit}
      />
    </main>
  );
}
