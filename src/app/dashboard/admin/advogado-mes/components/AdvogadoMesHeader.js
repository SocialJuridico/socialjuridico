import Link from "next/link";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Star,
} from "lucide-react";

import styles from "../AdvogadoMesAdmin.module.css";

export default function AdvogadoMesHeader({ state }) {
  const published = state.original.is_active === true;

  return (
    <header className={styles.header}>
      <div>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <Star size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Destaque institucional controlado</span>
            <h1>Advogado do Mês</h1>
            <p>
              Gerencie imagem, acessibilidade, destino, agenda e publicação do
              popup exibido após o acesso à plataforma.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => state.loadConfig()}
          disabled={state.operationBusy || state.dirty}
          title={
            state.dirty
              ? "Salve ou descarte as alterações antes de atualizar os dados."
              : undefined
          }
        >
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </button>

        <button
          type="button"
          className={published ? styles.pauseButton : styles.activateButton}
          onClick={state.togglePublication}
          disabled={!state.original.id || state.operationBusy || state.dirty}
          title={
            state.dirty
              ? "Salve ou descarte as alterações antes de mudar a publicação."
              : undefined
          }
        >
          {published ? (
            <EyeOff size={16} aria-hidden="true" />
          ) : (
            <Eye size={16} aria-hidden="true" />
          )}
          {state.toggling
            ? "Alterando..."
            : published
              ? "Pausar popup"
              : "Ativar popup"}
        </button>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={state.saveConfig}
          disabled={!state.dirty || state.operationBusy}
        >
          <Save size={16} aria-hidden="true" />
          {state.saving ? "Salvando..." : "Salvar configuração"}
        </button>
      </div>
    </header>
  );
}
