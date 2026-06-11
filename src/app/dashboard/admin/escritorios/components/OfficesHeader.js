import Link from "next/link";
import { ArrowLeft, Building2, Plus, RefreshCw } from "lucide-react";

import styles from "../EscritoriosAdmin.module.css";

export default function OfficesHeader({
  selectedOffice,
  visibleCount,
  totalCount,
  onReload,
  onCreate,
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
            <Building2 size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Gestão Enterprise</span>
            <h1>
              {selectedOffice
                ? selectedOffice.nome
                : "Escritórios cadastrados"}
            </h1>
            <p>
              {selectedOffice
                ? "Plano, limites, Juris e equipe vinculada."
                : `${visibleCount} de ${totalCount} escritórios visíveis nesta consulta.`}
            </p>
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button type="button" className={styles.secondaryButton} onClick={onReload}>
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </button>

        {!selectedOffice && (
          <button type="button" className={styles.goldButton} onClick={onCreate}>
            <Plus size={16} aria-hidden="true" />
            Novo escritório
          </button>
        )}
      </div>
    </header>
  );
}
