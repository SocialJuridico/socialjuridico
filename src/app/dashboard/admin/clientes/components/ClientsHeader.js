import Link from "next/link";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Users,
} from "lucide-react";

import styles from "../ClientesAdmin.module.css";

export default function ClientsHeader({
  visibleCount,
  totalCount,
  googleConnected,
  syncing,
  onReload,
  onExport,
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
              <Users size={20} aria-hidden="true" />
            </span>
            <div>
              <span className={styles.eyebrow}>Usuários e perfis</span>
              <h1>Clientes cadastrados</h1>
              <p>
                {visibleCount} de {totalCount} cliente{totalCount === 1 ? "" : "s"}
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
            <button
              type="button"
              className={styles.googleButton}
              onClick={onConnectGoogle}
            >
              Conectar Google Contatos
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
