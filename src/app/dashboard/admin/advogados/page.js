"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import LawyerModal from "./components/LawyerModal";
import LawyersFilters from "./components/LawyersFilters";
import LawyersHeader from "./components/LawyersHeader";
import LawyersSummary from "./components/LawyersSummary";
import LawyersTable from "./components/LawyersTable";
import { useAdminLawyers } from "./hooks/useAdminLawyers";
import styles from "./AdvogadosAdmin.module.css";

function getActiveSummaryKey(filters) {
  const hasSearchOrDate =
    filters.search.trim() || filters.dateFilter !== "ALL";

  if (hasSearchOrDate) return null;

  const activeFilters = [
    filters.planFilter !== "ALL",
    filters.oabFilter !== "ALL",
    filters.inactivityFilter !== "ALL",
  ].filter(Boolean).length;

  if (activeFilters === 0) return "total";
  if (activeFilters > 1) return null;

  if (filters.oabFilter === "VERIFIED") return "verified";
  if (filters.oabFilter === "PENDING") return "pending";
  if (filters.oabFilter === "ERROR") return "errors";
  if (filters.planFilter === "START") return "start";
  if (filters.planFilter === "PRO") return "pro";
  if (filters.inactivityFilter === "NEVER") return "neverAccessed";
  if (filters.inactivityFilter === "30DAYS") return "inactive30";

  return null;
}

export default function AdminAdvogadosPage() {
  const {
    filteredLawyers,
    summary,
    loading,
    loadError,
    filters,
    googleConnected,
    syncing,
    generatingPdf,
    modal,
    busyId,
    setSearch,
    setPlanFilter,
    setOabFilter,
    setDateFilter,
    setInactivityFilter,
    setModal,
    loadLawyers,
    performAction,
    confirmDelete,
    confirmReset,
    exportCsv,
    generatePdf,
    connectGoogle,
    syncGoogle,
  } = useAdminLawyers();

  const updateFilter = (name, value) => {
    const setters = {
      search: setSearch,
      planFilter: setPlanFilter,
      oabFilter: setOabFilter,
      dateFilter: setDateFilter,
      inactivityFilter: setInactivityFilter,
    };

    setters[name]?.(value);
  };

  const clearFilters = () => {
    setSearch("");
    setPlanFilter("ALL");
    setOabFilter("ALL");
    setDateFilter("ALL");
    setInactivityFilter("ALL");
  };

  const handleSummaryFilter = (_key, filter) => {
    clearFilters();

    if (filter.type === "PLAN") {
      setPlanFilter(filter.value);
    }

    if (filter.type === "OAB") {
      setOabFilter(filter.value);
    }

    if (filter.type === "INACTIVITY") {
      setInactivityFilter(filter.value);
    }
  };

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando advogados</h1>
        <p>Preparando os dados administrativos.</p>
      </main>
    );
  }

  if (loadError && summary.total === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar os advogados</h1>
        <p>{loadError}</p>
        <button type="button" className={styles.goldButton} onClick={loadLawyers}>
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <LawyersHeader
        visibleCount={summary.visible}
        totalCount={summary.total}
        googleConnected={googleConnected}
        syncing={syncing}
        generatingPdf={generatingPdf}
        onReload={loadLawyers}
        onExport={exportCsv}
        onGeneratePdf={generatePdf}
        onConnectGoogle={connectGoogle}
        onSyncGoogle={syncGoogle}
      />

      {loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Dados parcialmente indisponíveis</strong>
            <p>{loadError}</p>
          </div>
          <button type="button" onClick={loadLawyers}>
            Atualizar
          </button>
        </div>
      )}

      <LawyersSummary
        summary={summary}
        activeSummaryKey={getActiveSummaryKey(filters)}
        onFilter={handleSummaryFilter}
      />

      <LawyersFilters
        filters={filters}
        visibleCount={summary.visible}
        onChange={updateFilter}
        onClear={clearFilters}
      />

      <LawyersTable
        lawyers={filteredLawyers}
        busyId={busyId}
        onOpen={(type, lawyer) => setModal({ type, lawyer })}
      />

      <LawyerModal
        modal={modal}
        busyId={busyId}
        onClose={() => setModal(null)}
        onDelete={confirmDelete}
        onReset={confirmReset}
        onAction={performAction}
      />
    </main>
  );
}
