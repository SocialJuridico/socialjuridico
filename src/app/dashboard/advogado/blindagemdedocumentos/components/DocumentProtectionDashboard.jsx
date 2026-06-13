"use client";

import { ShieldCheck } from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../../smartdoc/SmartDoc.module.css";
import { useDocumentProtection } from "../useDocumentProtection";
import ProtectionDocumentsPanel from "./ProtectionDocumentsPanel";
import ProtectionOverview from "./ProtectionOverview";
import ProtectionUploadDialog from "./ProtectionUploadDialog";

export default function DocumentProtectionDashboard() {
  const {
    clients,
    closeUpload,
    copyHash,
    currentRange,
    deleteDocument,
    deletingId,
    error,
    filters,
    items,
    load,
    loading,
    metrics,
    openDocument,
    openUpload,
    pagination,
    plan,
    reload,
    selectedClientId,
    selectedFile,
    selectedType,
    setFilters,
    setSelectedClientId,
    setSelectedFile,
    setSelectedType,
    uploadDocument,
    uploadOpen,
    uploading,
    usage,
  } = useDocumentProtection();

  return (
    <LawyerDashboardShell
      activeRoute="blindagemdedocumentos"
      title="Blindagem de Documentos"
      subtitle="Integridade, armazenamento privado e rastreabilidade"
      icon={ShieldCheck}
    >
      <div className={styles.page}>
        <ProtectionOverview metrics={metrics} openUpload={openUpload} plan={plan} usage={usage} />
        <ProtectionDocumentsPanel
          copyHash={copyHash}
          currentRange={currentRange}
          deleteDocument={deleteDocument}
          deletingId={deletingId}
          error={error}
          filters={filters}
          items={items}
          load={load}
          loading={loading}
          openDocument={openDocument}
          openUpload={openUpload}
          pagination={pagination}
          reload={reload}
          setFilters={setFilters}
        />
      </div>

      <ProtectionUploadDialog
        clients={clients}
        closeUpload={closeUpload}
        plan={plan}
        selectedClientId={selectedClientId}
        selectedFile={selectedFile}
        selectedType={selectedType}
        setSelectedClientId={setSelectedClientId}
        setSelectedFile={setSelectedFile}
        setSelectedType={setSelectedType}
        uploadDocument={uploadDocument}
        uploadOpen={uploadOpen}
        uploading={uploading}
      />
    </LawyerDashboardShell>
  );
}
