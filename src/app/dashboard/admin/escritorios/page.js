"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

import OfficeDossier from "./components/OfficeDossier";
import OfficeModals from "./components/OfficeModals";
import OfficesFilters from "./components/OfficesFilters";
import OfficesHeader from "./components/OfficesHeader";
import OfficesSummary from "./components/OfficesSummary";
import OfficesTable from "./components/OfficesTable";
import StaffInviteModal from "./components/StaffInviteModal";
import { useAdminOffices } from "./hooks/useAdminOffices";
import styles from "./EscritoriosAdmin.module.css";

export default function AdminEscritoriosPage() {
  const {
    filteredOffices,
    summary,
    loading,
    loadError,
    search,
    planFilter,
    selectedOffice,
    dossierTab,
    staff,
    staffLoading,
    officeForm,
    staffForm,
    limitsEdit,
    planDraft,
    balanceDraft,
    modal,
    busy,
    setSearch,
    setPlanFilter,
    setSelectedOffice,
    setDossierTab,
    setOfficeForm,
    setStaffForm,
    setLimitsEdit,
    setPlanDraft,
    setBalanceDraft,
    setModal,
    loadOffices,
    openOffice,
    createOffice,
    createStaff,
    savePlan,
    saveBalance,
    saveLimits,
    deleteOffice,
    uploadLogo,
  } = useAdminOffices();

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando escritórios</h1>
        <p>Preparando os dados do módulo Enterprise.</p>
      </main>
    );
  }

  if (loadError && summary.total === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar os escritórios</h1>
        <p>{loadError}</p>
        <button type="button" className={styles.goldButton} onClick={loadOffices}>
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <OfficesHeader
        selectedOffice={selectedOffice}
        visibleCount={summary.visible}
        totalCount={summary.total}
        onReload={loadOffices}
        onCreate={() => setModal({ type: "create" })}
      />

      {loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Dados parcialmente indisponíveis</strong>
            <p>{loadError}</p>
          </div>
          <button type="button" onClick={loadOffices}>Atualizar</button>
        </div>
      )}

      {selectedOffice ? (
        <OfficeDossier
          office={selectedOffice}
          tab={dossierTab}
          staff={staff}
          staffLoading={staffLoading}
          limits={limitsEdit}
          planDraft={planDraft}
          balanceDraft={balanceDraft}
          busy={busy}
          onClose={() => setSelectedOffice(null)}
          onTab={setDossierTab}
          onPlanChange={setPlanDraft}
          onBalanceChange={setBalanceDraft}
          onLimitChange={(key, value) =>
            setLimitsEdit((current) => ({ ...current, [key]: value }))
          }
          onSavePlan={savePlan}
          onSaveBalance={saveBalance}
          onSaveLimits={saveLimits}
          onAddStaff={() => setModal({ type: "staff" })}
        />
      ) : (
        <>
          <OfficesSummary
            summary={summary}
            activeFilter={planFilter}
            onFilter={setPlanFilter}
          />

          <OfficesFilters
            search={search}
            planFilter={planFilter}
            visibleCount={summary.visible}
            onSearch={setSearch}
            onPlanFilter={setPlanFilter}
            onClear={() => {
              setSearch("");
              setPlanFilter("ALL");
            }}
          />

          <OfficesTable
            offices={filteredOffices}
            onOpen={openOffice}
            onDelete={(office) => setModal({ type: "delete", office })}
          />
        </>
      )}

      {modal?.type === "staff" && selectedOffice ? (
        <StaffInviteModal
          office={selectedOffice}
          form={staffForm}
          setForm={setStaffForm}
          busy={busy}
          onClose={() => setModal(null)}
          onSubmit={createStaff}
        />
      ) : (
        <OfficeModals
          modal={modal}
          officeForm={officeForm}
          setOfficeForm={setOfficeForm}
          staffForm={staffForm}
          setStaffForm={setStaffForm}
          selectedOffice={selectedOffice}
          busy={busy}
          onClose={() => setModal(null)}
          onCreateOffice={createOffice}
          onCreateStaff={createStaff}
          onDelete={deleteOffice}
          onLogo={uploadLogo}
        />
      )}
    </main>
  );
}
