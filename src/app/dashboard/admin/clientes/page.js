"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import ClientActionModal from "./components/ClientActionModal";
import ClientsFilters from "./components/ClientsFilters";
import ClientsHeader from "./components/ClientsHeader";
import ClientsSummary from "./components/ClientsSummary";
import ClientsTable from "./components/ClientsTable";
import { useAdminClients } from "./hooks/useAdminClients";
import styles from "./ClientesAdmin.module.css";

export default function AdminClientesPage() {
  const {
    filteredClients,
    summary,
    loading,
    loadError,
    search,
    inactivityFilter,
    googleConnected,
    syncing,
    actionState,
    setSearch,
    setInactivityFilter,
    loadClients,
    openAction,
    closeAction,
    confirmDelete,
    confirmReset,
    exportCsv,
    connectGoogle,
    syncGoogle,
  } = useAdminClients();

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando clientes</h1>
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
        <h1>Não foi possível carregar os clientes</h1>
        <p>{loadError}</p>
        <button type="button" className={styles.primaryButton} onClick={loadClients}>
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <ClientsHeader
        visibleCount={summary.visible}
        totalCount={summary.total}
        googleConnected={googleConnected}
        syncing={syncing}
        onReload={loadClients}
        onExport={exportCsv}
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
          <button type="button" onClick={loadClients}>
            Atualizar
          </button>
        </div>
      )}

      <ClientsSummary summary={summary} />

      <ClientsFilters
        search={search}
        inactivityFilter={inactivityFilter}
        visibleCount={summary.visible}
        onSearchChange={setSearch}
        onFilterChange={setInactivityFilter}
        onClear={() => {
          setSearch("");
          setInactivityFilter("ALL");
        }}
      />

      <ClientsTable
        clients={filteredClients}
        deletingId={actionState.deletingId}
        resettingId={actionState.resettingId}
        onAction={openAction}
      />

      <ClientActionModal
        action={actionState.modal}
        deletingId={actionState.deletingId}
        resettingId={actionState.resettingId}
        onClose={closeAction}
        onDelete={confirmDelete}
        onReset={confirmReset}
      />
    </main>
  );
}
