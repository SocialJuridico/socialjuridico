import { Filter, Search, X } from "lucide-react";
import { MESSAGE_FILTERS } from "../config/messageFilters";
import styles from "../MensagensAdmin.module.css";

const filters = [
  { value: MESSAGE_FILTERS.ALL, label: "Todas" },
  { value: MESSAGE_FILTERS.CHAT, label: "Conversas" },
  { value: MESSAGE_FILTERS.BROADCAST, label: "Comunicados" },
];

export default function MessagesToolbar({
  searchTerm,
  activeFilter,
  visibleCount,
  onSearchChange,
  onFilterChange,
}) {
  return (
    <section className={styles.toolbar} aria-label="Filtros das mensagens">
      <div className={styles.searchField}>
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar advogado, e-mail, OAB ou mensagem..."
          aria-label="Buscar mensagens"
        />
        {searchTerm && (
          <button
            type="button"
            className={styles.clearSearchButton}
            onClick={() => onSearchChange("")}
            aria-label="Limpar busca"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={styles.filterGroup}>
        <span className={styles.filterLabel}>
          <Filter size={14} aria-hidden="true" />
          Filtrar
        </span>
        {filters.map((filter) => {
          const active = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              className={`${styles.filterButton} ${active ? styles.filterButtonActive : ""}`}
              onClick={() => onFilterChange(filter.value)}
              aria-pressed={active}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <span className={styles.visibleCount}>
        {visibleCount} resultado{visibleCount === 1 ? "" : "s"}
      </span>
    </section>
  );
}
