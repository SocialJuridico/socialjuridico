import { Search, X } from "lucide-react";

import styles from "../Avaliacoes.module.css";
import governance from "../ReviewGovernance.module.css";

export default function ReviewsFilters({
  search,
  ratingFilter,
  commentFilter,
  statusFilter,
  visibleCount,
  onSearch,
  onRatingFilter,
  onCommentFilter,
  onStatusFilter,
  onClear,
}) {
  const hasFilters =
    search.trim() ||
    ratingFilter !== "ALL" ||
    commentFilter !== "ALL" ||
    statusFilter !== "ALL";

  return (
    <section
      className={`${styles.filters} ${governance.filtersWithStatus}`}
      aria-label="Filtros de avaliações"
    >
      <div className={styles.searchField}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Buscar por advogado, cliente, caso ou justificativa"
          aria-label="Buscar avaliações"
        />
      </div>

      <select
        className={styles.filterSelect}
        value={ratingFilter}
        onChange={(event) => onRatingFilter(event.target.value)}
        aria-label="Filtrar por nota"
      >
        <option value="ALL">Todas as notas</option>
        <option value="POSITIVE">Positivas — 4 e 5</option>
        <option value="NEUTRAL">Neutras — 3</option>
        <option value="NEGATIVE">Negativas — 1 e 2</option>
      </select>

      <select
        className={styles.filterSelect}
        value={commentFilter}
        onChange={(event) => onCommentFilter(event.target.value)}
        aria-label="Filtrar por justificativa"
      >
        <option value="ALL">Com ou sem justificativa</option>
        <option value="WITH_COMMENT">Com justificativa</option>
        <option value="WITHOUT_COMMENT">Sem justificativa</option>
      </select>

      <select
        className={styles.filterSelect}
        value={statusFilter}
        onChange={(event) => onStatusFilter(event.target.value)}
        aria-label="Filtrar por publicação"
      >
        <option value="ALL">Todos os estados</option>
        <option value="PUBLISHED">Publicadas</option>
        <option value="HIDDEN">Ocultas</option>
        <option value="INVALID">Inválidas de legado</option>
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
