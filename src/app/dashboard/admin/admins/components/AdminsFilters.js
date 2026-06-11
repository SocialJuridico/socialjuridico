import { Search, X } from "lucide-react";

import styles from "../AdminsAdmin.module.css";

export default function AdminsFilters({ search, visibleCount, onSearch, onClear }) {
  return (
    <section className={styles.filters} aria-label="Busca de administradores">
      <div className={styles.searchField}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          aria-label="Buscar administradores"
        />
      </div>
      <span className={styles.resultCount}>{visibleCount} resultado{visibleCount === 1 ? "" : "s"}</span>
      {search.trim() && (
        <button type="button" className={styles.clearButton} onClick={onClear}>
          <X size={15} aria-hidden="true" />
          Limpar busca
        </button>
      )}
    </section>
  );
}
