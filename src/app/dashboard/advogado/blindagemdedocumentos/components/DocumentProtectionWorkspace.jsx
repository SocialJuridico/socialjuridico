"use client";

import { ShieldCheck } from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import styles from "../../smartdoc/SmartDoc.module.css";
import { useDocumentProtection } from "../useDocumentProtection";
import ProtectionDocumentsPanel from "./ProtectionDocumentsPanel";
import ProtectionOverview from "./ProtectionOverview";
import ProtectionUploadDialog from "./ProtectionUploadDialog";

export default function DocumentProtectionWorkspace() {
  const controller = useDocumentProtection();

  return (
    <LawyerDashboardShell
      activeRoute="blindagemdedocumentos"
      title="Blindagem de Documentos"
      subtitle="Integridade, armazenamento privado e rastreabilidade"
      icon={ShieldCheck}
    >
      <div className={styles.page}>
        <ProtectionOverview
          metrics={controller.metrics}
          openUpload={controller.openUpload}
          plan={controller.plan}
          usage={controller.usage}
        />
        <ProtectionDocumentsPanel
          certificateId={controller.certificateId}
          collection={controller.collection}
          copyHash={controller.copyHash}
          currentRange={controller.currentRange}
          deleteDocument={controller.deleteDocument}
          deletingId={controller.deletingId}
          downloadCertificate={controller.downloadCertificate}
          error={controller.error}
          filters={controller.filters}
          items={controller.items}
          load={controller.load}
          loading={controller.loading}
          metrics={controller.metrics}
          openDocument={controller.openDocument}
          openUpload={controller.openUpload}
          pagination={controller.pagination}
          reload={controller.reload}
          setCollection={controller.setCollection}
          setFilters={controller.setFilters}
        />
      </div>

      <ProtectionUploadDialog
        clients={controller.clients}
        closeUpload={controller.closeUpload}
        plan={controller.plan}
        selectedClientId={controller.selectedClientId}
        selectedFile={controller.selectedFile}
        selectedType={controller.selectedType}
        setSelectedClientId={controller.setSelectedClientId}
        setSelectedFile={controller.setSelectedFile}
        setSelectedType={controller.setSelectedType}
        uploadDocument={controller.uploadDocument}
        uploadOpen={controller.uploadOpen}
        uploading={controller.uploading}
      />
    </LawyerDashboardShell>
  );
}
