import { Search, X } from "lucide-react";

import styles from "../EscritoriosAdmin.module.css";

export default function OfficesFilters({
  search,
  planFilter,
  visibleCount,
  onSearch,
  onPlanFilter,
  onClear,
}) {
  const hasFilters = search.trim() || planFilter !== "ALL";

  return (
    <section className={styles.filters} aria-label="Filtros de escritórios">
      <div className={styles.searchField}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por nome, CNPJ, responsável ou e-mail"
          aria-label="Buscar escritórios"
        />
      </div>

      <select
        className={styles.filterSelect}
        value={planFilter}
        onChange={(event) => onPlanFilter(event.target.value)}
        aria-label="Filtrar por plano"
      >
        <option value="ALL">Todos os planos</option>
        <option value="start">Enterprise Start</option>
        <option value="pro">Enterprise Pro</option>
        <option value="pro_plus">Enterprise Pro+</option>
      </select>

      <span className={styles.resultCount}>
        {visibleCount} resultado{visibleCount === 1 ? "" : "s"}
      </span>

      {hasFilters && (
        <button type="button" className={styles.clearButton} onClick={onClear}>
          <X size={15} aria-hidden="true" />
          Limpar filtros
        </button>
      )}
    </section>
  );
}
