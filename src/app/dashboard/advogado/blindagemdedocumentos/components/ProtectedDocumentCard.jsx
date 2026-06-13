"use client";

import {
  CheckCircle2,
  Clipboard,
  Download,
  FileKey2,
  Loader2,
  Trash2,
} from "lucide-react";

import styles from "../../smartdoc/SmartDoc.module.css";
import extras from "../DocumentProtectionExtras.module.css";
import { formatProtectionSize } from "../useDocumentProtection";

function formatDate(value) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}

export default function ProtectedDocumentCard(props) {
  const { copyHash, deleteDocument, deletingId, document, openDocument } = props;

  return (
    <article className={styles.documentCard}>
      <div className={styles.documentHeader}>
        <span className={styles.fileIconProtected}>
          <FileKey2 size={20} aria-hidden="true" />
        </span>
        <div>
          <h3 title={document.fileName}>{document.fileName}</h3>
          <p>{document.documentType}</p>
        </div>
      </div>

      <div className={styles.badges}>
        <span className={styles.protectedBadge}>
          <CheckCircle2 size={12} aria-hidden="true" /> Blindado
        </span>
        {document.clientName && <span>CRM: {document.clientName}</span>}
      </div>

      <div className={styles.documentMeta}>
        <span>{formatProtectionSize(document.fileSizeBytes)}</span>
        <span>{formatDate(document.createdAt)}</span>
      </div>

      <div className={extras.hashBox}>
        <code title={document.hash || ""}>
          {document.hash
            ? `${document.hash.slice(0, 22)}…${document.hash.slice(-12)}`
            : "Hash indisponível"}
        </code>
        <button
          type="button"
          onClick={() => copyHash(document.hash)}
          disabled={!document.hash}
          aria-label={`Copiar hash de ${document.fileName}`}
        >
          <Clipboard size={15} aria-hidden="true" /> Copiar
        </button>
      </div>

      <footer className={styles.documentFooter}>
        <div>
          <small>Responsável</small>
          <strong>{document.lawyerName}</strong>
        </div>
        <div className={styles.documentActions}>
          <button
            type="button"
            style={{ color: "#c4c4ca" }}
            onClick={() => openDocument(document)}
            title="Baixar documento"
            aria-label={`Baixar ${document.fileName}`}
          >
            <Download size={16} aria-hidden="true" />
          </button>
          {document.canDelete && (
            <button
              type="button"
              className={extras.dangerButton}
              onClick={() => deleteDocument(document)}
              disabled={deletingId === document.id}
              title="Excluir documento"
              aria-label={`Excluir ${document.fileName}`}
            >
              {deletingId === document.id ? (
                <Loader2
                  size={16}
                  className={styles.spin}
                  aria-hidden="true"
                />
              ) : (
                <Trash2 size={16} aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}
