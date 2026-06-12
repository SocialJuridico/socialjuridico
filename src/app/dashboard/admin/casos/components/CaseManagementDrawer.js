"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "../CasosAdmin.module.css";
import CaseAuditTab from "./case-drawer/CaseAuditTab";
import CaseGovernanceTab from "./case-drawer/CaseGovernanceTab";
import CaseOverviewTab from "./case-drawer/CaseOverviewTab";
import CaseSensitiveTab from "./case-drawer/CaseSensitiveTab";
import { formatCaseDate } from "./case-drawer/drawerUtils";

const DRAWER_TABS = {
  OVERVIEW: "OVERVIEW",
  GOVERNANCE: "GOVERNANCE",
  SENSITIVE: "SENSITIVE",
  AUDIT: "AUDIT",
};

const TAB_OPTIONS = [
  { value: DRAWER_TABS.OVERVIEW, label: "Visão geral" },
  { value: DRAWER_TABS.GOVERNANCE, label: "Governança" },
  { value: DRAWER_TABS.SENSITIVE, label: "Dados protegidos" },
  { value: DRAWER_TABS.AUDIT, label: "Auditoria" },
];

export default function CaseManagementDrawer({
  caseItem,
  sensitiveDetail,
  loadingSensitiveDetail,
  auditLogs,
  loadingAudit,
  actionName,
  onClose,
  onLoadAudit,
  onUpdateGovernance,
  onNotifyClient,
  onArchive,
  onRestore,
  onLegalHold,
  onUnlockSensitive,
}) {
  const [activeTab, setActiveTab] = useState(DRAWER_TABS.OVERVIEW);
  const busy = Boolean(actionName || loadingSensitiveDetail || loadingAudit);

  useEffect(() => {
    setActiveTab(DRAWER_TABS.OVERVIEW);
  }, [caseItem.id]);

  useEffect(() => {
    if (sensitiveDetail) setActiveTab(DRAWER_TABS.SENSITIVE);
  }, [sensitiveDetail]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape" && !busy) onClose();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

  function selectTab(tab) {
    setActiveTab(tab);
    if (tab === DRAWER_TABS.AUDIT) onLoadAudit();
  }

  return (
    <div
      className={styles.drawerOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <aside
        className={styles.caseDrawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-drawer-title"
      >
        <header className={styles.drawerHeader}>
          <div>
            <span className={styles.drawerEyebrow}>{caseItem.area}</span>
            <h2 id="case-drawer-title">{caseItem.title}</h2>
            <p>
              Caso {caseItem.id.slice(0, 8)} · criado em{" "}
              {formatCaseDate(caseItem.createdAt)}
            </p>
          </div>
          <button
            type="button"
            className={styles.drawerCloseButton}
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar gestão do caso"
            autoFocus
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <nav className={styles.drawerTabs} aria-label="Seções do caso">
          {TAB_OPTIONS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={
                activeTab === tab.value ? styles.drawerTabActive : ""
              }
              onClick={() => selectTab(tab.value)}
              aria-pressed={activeTab === tab.value}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.drawerBody}>
          {activeTab === DRAWER_TABS.OVERVIEW && (
            <CaseOverviewTab
              caseItem={caseItem}
              actionName={actionName}
              busy={busy}
              onNotifyClient={onNotifyClient}
            />
          )}

          {activeTab === DRAWER_TABS.GOVERNANCE && (
            <CaseGovernanceTab
              caseItem={caseItem}
              actionName={actionName}
              busy={busy}
              onUpdateGovernance={onUpdateGovernance}
              onArchive={onArchive}
              onRestore={onRestore}
              onLegalHold={onLegalHold}
            />
          )}

          {activeTab === DRAWER_TABS.SENSITIVE && (
            <CaseSensitiveTab
              sensitiveDetail={sensitiveDetail}
              loading={loadingSensitiveDetail}
              onUnlock={onUnlockSensitive}
            />
          )}

          {activeTab === DRAWER_TABS.AUDIT && (
            <CaseAuditTab events={auditLogs} loading={loadingAudit} />
          )}
        </div>
      </aside>
    </div>
  );
}
