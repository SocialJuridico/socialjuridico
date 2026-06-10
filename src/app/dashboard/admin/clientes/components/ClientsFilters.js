import { Search, SlidersHorizontal, X } from "lucide-react";

import styles from "../ClientesAdmin.module.css";

export default function ClientsFilters({
  search,
  inactivityFilter,
  visibleCount,
  onSearchChange,
  onFilterChange,
  onClear,
}) {
  const hasFilters = search.trim() || inactivityFilter !== "ALL";

  return (
    <section className={styles.filters} aria-label="Filtros de clientes">
      <div className={styles.searchField}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por nome, e-mail ou telefone"
          aria-label="Buscar clientes"
        />
      </div>

      <div className={styles.filterField}>
        <SlidersHorizontal size={17} aria-hidden="true" />
        <select
          value={inactivityFilter}
          onChange={(event) => onFilterChange(event.target.value)}
          aria-label="Filtrar por inatividade"
        >
          <option value="ALL">Todos os clientes</option>
          <option value="NEVER">Nunca acessaram</option>
          <option value="7DAYS">Inativos há 7+ dias</option>
          <option value="15DAYS">Inativos há 15+ dias</option>
          <option value="30DAYS">Inativos há 30+ dias</option>
        </select>
      </div>

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
