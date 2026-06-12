import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  PlusCircle,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Upload,
} from "lucide-react";

import styles from "../page.module.css";

export default function RadarHeader({
  admin,
  pendingEmails,
  busy,
  onReload,
  onOpenPanel,
  onSearch,
  onSendEmails,
}) {
  return (
    <header className={styles.header}>
      <div>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <Shield size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>
              Curadoria de oportunidades públicas
            </span>
            <h1>Radar Jurídico</h1>
            <p>
              Brave Search, Reddit RSS e captura manual com revisão
              administrativa. Oportunidades aprovadas permanecem publicadas por
              cinco dias.
            </p>
            {admin?.email && <small>Administrador: {admin.email}</small>}
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onReload}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onOpenPanel("import")}
        >
          <Upload size={16} aria-hidden="true" />
          Importar JSON
        </button>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => onOpenPanel("capture")}
        >
          <Search size={16} aria-hidden="true" />
          Capturador
        </button>
        <button
          type="button"
          className={styles.goldButton}
          onClick={() => onOpenPanel("create")}
        >
          <PlusCircle size={16} aria-hidden="true" />
          Criar manual
        </button>
        <button
          type="button"
          className={styles.blueButton}
          onClick={onSearch}
          disabled={busy === "search"}
        >
          <Sparkles size={16} aria-hidden="true" />
          {busy === "search" ? "Buscando..." : "Executar busca"}
        </button>
        <button
          type="button"
          className={styles.orangeButton}
          onClick={onSendEmails}
          disabled={busy === "emails" || pendingEmails === 0}
        >
          <Mail size={16} aria-hidden="true" />
          {busy === "emails"
            ? "Enviando..."
            : `Enviar e-mail (${pendingEmails})`}
        </button>
      </div>
    </header>
  );
}
