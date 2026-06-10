import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  RefreshCw,
  Scale,
} from "lucide-react";

import styles from "../AdvogadosAdmin.module.css";

export default function LawyersHeader({
  visibleCount,
  totalCount,
  googleConnected,
  syncing,
  generatingPdf,
  onReload,
  onExport,
  onGeneratePdf,
  onConnectGoogle,
  onSyncGoogle,
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <div>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar ao painel admin
          </Link>

          <div className={styles.titleRow}>
            <span className={styles.titleIcon}>
              <Scale size={21} aria-hidden="true" />
            </span>
            <div>
              <span className={styles.eyebrow}>Usuários e perfis</span>
              <h1>Advogados cadastrados</h1>
              <p>
                {visibleCount} de {totalCount} advogado{totalCount === 1 ? "" : "s"}
                {" "}visível{visibleCount === 1 ? "" : "is"} nesta consulta.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={onReload}>
            <RefreshCw size={16} aria-hidden="true" />
            Atualizar
          </button>

          <button
            type="button"
            className={styles.goldButton}
            onClick={onGeneratePdf}
            disabled={generatingPdf}
          >
            <FileText size={16} aria-hidden="true" />
            {generatingPdf ? "Gerando PDF..." : "Gerar PDF"}
          </button>

          <button type="button" className={styles.secondaryButton} onClick={onExport}>
            <Download size={16} aria-hidden="true" />
            Exportar CSV
          </button>

          {googleConnected ? (
            <button
              type="button"
              className={styles.googleButton}
              onClick={onSyncGoogle}
              disabled={syncing}
            >
              <RefreshCw
                size={16}
                className={syncing ? styles.spinner : undefined}
                aria-hidden="true"
              />
              {syncing ? "Sincronizando..." : "Sincronizar Google"}
            </button>
          ) : (
            <button type="button" className={styles.googleButton} onClick={onConnectGoogle}>
              Conectar Google Contatos
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
