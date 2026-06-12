import { Filter, Search, X } from "lucide-react";
import { NOTIFICATION_FILTERS } from "../config/notificationTypes";
import styles from "../Notificacoes.module.css";

const filters = [
  { value: NOTIFICATION_FILTERS.ALL, label: "Todas" },
  { value: NOTIFICATION_FILTERS.UNREAD, label: "Não lidas" },
  { value: NOTIFICATION_FILTERS.CHAT, label: "Conversas" },
];

export default function NotificationsToolbar({
  searchTerm,
  activeFilter,
  visibleCount,
  onSearchChange,
  onFilterChange,
}) {
  return (
    <section className={styles.toolbar} aria-label="Filtros das notificações">
      <div className={styles.searchField}>
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Buscar por título, mensagem ou tipo..."
          aria-label="Buscar notificações"
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
