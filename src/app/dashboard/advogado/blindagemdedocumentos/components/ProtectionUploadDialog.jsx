"use client";

import { useEffect } from "react";
import { Info, Loader2, ShieldCheck, UploadCloud, X } from "lucide-react";

import styles from "../../smartdoc/SmartDoc.module.css";
import extras from "../DocumentProtectionExtras.module.css";
import { formatProtectionSize } from "../useDocumentProtection";

const DOCUMENT_TYPES = [
  "Contrato",
  "Procuração",
  "Prova Digital",
  "Notificação",
  "Outros",
];

export default function ProtectionUploadDialog({
  clients,
  closeUpload,
  plan,
  selectedClientId,
  selectedFile,
  selectedType,
  setSelectedClientId,
  setSelectedFile,
  setSelectedType,
  uploadDocument,
  uploadOpen,
  uploading,
}) {
  useEffect(() => {
    if (!uploadOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === "Escape" && !uploading) closeUpload();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeUpload, uploadOpen, uploading]);

  if (!uploadOpen) return null;

  const protectionCost = plan.protectCost || 3;
  const costText =
    plan.type === "START"
      ? `${protectionCost} Juris · saldo atual ${plan.balance || 0}`
      : `Blindagem incluída no plano ${plan.type}`;
  const inputKey = selectedFile
    ? `${selectedFile.name}-${selectedFile.size}`
    : "document-protection-empty";

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !uploading) closeUpload();
      }}
    >
      <section
        className={styles.uploadModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-protection-title"
        aria-describedby="document-protection-description"
      >
        <header className={styles.modalHeader}>
          <div>
            <span>Blindagem documental</span>
            <h2 id="document-protection-title">Registrar nova blindagem</h2>
            <p id="document-protection-description">
              O arquivo é validado no servidor, recebe hash SHA-512 e permanece em
              armazenamento privado.
            </p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={closeUpload}
            disabled={uploading}
            aria-label="Fechar modal"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <form className={styles.uploadForm} onSubmit={uploadDocument}>
          <label className={styles.uploadZone}>
            <input
              key={inputKey}
              className={extras.fileInput}
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              disabled={uploading}
              onChange={(event) =>
                setSelectedFile(event.target.files?.[0] || null)
              }
            />
            <div>
              <UploadCloud size={32} aria-hidden="true" />
              <strong>Selecionar documento</strong>
              <span>PDF, DOC, DOCX, JPG ou PNG · máximo de 25 MB</span>
            </div>
          </label>

          {selectedFile && (
            <div className={styles.fileSummary}>
              <div>
                <strong>{selectedFile.name}</strong>
                <span>{formatProtectionSize(selectedFile.size)}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                disabled={uploading}
                aria-label="Remover arquivo selecionado"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          <div className={extras.formGrid}>
            <label className={styles.formField}>
              <span>Categoria</span>
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                disabled={uploading}
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.formField}>
              <span>Cliente do CRM — opcional</span>
              <select
                value={selectedClientId}
                onChange={(event) => setSelectedClientId(event.target.value)}
                disabled={uploading}
              >
                <option value="">Documento avulso</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={styles.protectRow}>
            <ShieldCheck size={20} aria-hidden="true" />
            <div>
              <strong>{costText}</strong>
              <span>
                Reserva atômica, idempotência e auditoria seguem o mesmo pipeline
                seguro do SmartDoc.
              </span>
            </div>
          </div>

          <div className={styles.notice}>
            <Info size={17} aria-hidden="true" />
            <span>
              A blindagem registra evidência técnica de integridade e
              rastreabilidade. Ela não promete validade jurídica absoluta,
              certificação cartorial ou conclusão pericial.
            </span>
          </div>

          <footer className={styles.modalFooter}>
            <button type="button" onClick={closeUpload} disabled={uploading}>
              Cancelar
            </button>
            <button type="submit" disabled={!selectedFile || uploading}>
              {uploading ? (
                <Loader2
                  size={17}
                  className={styles.spin}
                  aria-hidden="true"
                />
              ) : (
                <ShieldCheck size={17} aria-hidden="true" />
              )}
              {uploading ? "Blindando..." : "Blindar documento"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
