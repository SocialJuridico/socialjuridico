"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import AdminModal from "./components/AdminModal";
import AdminsFilters from "./components/AdminsFilters";
import AdminsHeader from "./components/AdminsHeader";
import AdminsSummary from "./components/AdminsSummary";
import AdminsTable from "./components/AdminsTable";
import { useAdminUsers } from "./hooks/useAdminUsers";
import styles from "./AdminsAdmin.module.css";

export default function AdminAdminsPage() {
  const {
    filteredAdmins,
    currentAdminId,
    loading,
    loadError,
    search,
    summary,
    modal,
    form,
    busyId,
    setSearch,
    setModal,
    setForm,
    loadAdmins,
    openCreate,
    openEdit,
    saveAdmin,
    sendPasswordReset,
    deleteAdmin,
  } = useAdminUsers();

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando administradores</h1>
        <p>Verificando os acessos administrativos da plataforma.</p>
      </main>
    );
  }

  if (loadError && summary.total === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar os administradores</h1>
        <p>{loadError}</p>
        <button type="button" className={styles.goldButton} onClick={loadAdmins}>
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <AdminsHeader
        total={summary.total}
        visible={summary.visible}
        onReload={loadAdmins}
        onCreate={openCreate}
      />

      {loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Dados parcialmente indisponíveis</strong>
            <p>{loadError}</p>
          </div>
          <button type="button" onClick={loadAdmins}>Atualizar</button>
        </div>
      )}

      <AdminsSummary summary={summary} />

      <AdminsFilters
        search={search}
        visibleCount={summary.visible}
        onSearch={setSearch}
        onClear={() => setSearch("")}
      />

      <AdminsTable
        admins={filteredAdmins}
        currentAdminId={currentAdminId}
        busyId={busyId}
        onEdit={openEdit}
        onReset={(admin) => setModal({ type: "reset", admin })}
        onDelete={(admin) => setModal({ type: "delete", admin })}
      />

      <AdminModal
        modal={modal}
        form={form}
        setForm={setForm}
        busyId={busyId}
        onClose={() => setModal(null)}
        onSubmit={saveAdmin}
        onReset={sendPasswordReset}
        onDelete={deleteAdmin}
      />
    </main>
  );
}
