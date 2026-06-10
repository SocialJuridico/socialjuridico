import { Search, SlidersHorizontal, X } from "lucide-react";

import styles from "../AdvogadosAdmin.module.css";

export default function LawyersFilters({
  filters,
  visibleCount,
  onChange,
  onClear,
}) {
  const hasFilters =
    filters.search.trim() ||
    filters.planFilter !== "ALL" ||
    filters.oabFilter !== "ALL" ||
    filters.dateFilter !== "ALL" ||
    filters.inactivityFilter !== "ALL";

  return (
    <section className={styles.filters} aria-label="Filtros de advogados">
      <div className={styles.searchField}>
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange("search", event.target.value)}
          placeholder="Buscar por nome, e-mail, telefone ou OAB"
          aria-label="Buscar advogados"
        />
      </div>

      <label className={styles.filterField}>
        <SlidersHorizontal size={16} aria-hidden="true" />
        <select
          value={filters.planFilter}
          onChange={(event) => onChange("planFilter", event.target.value)}
          aria-label="Filtrar por plano"
        >
          <option value="ALL">Todos os planos</option>
          <option value="FREE">Plano FREE</option>
          <option value="START">Plano START</option>
          <option value="PRO">Plano PRO</option>
        </select>
      </label>

      <label className={styles.filterField}>
        <select
          value={filters.oabFilter}
          onChange={(event) => onChange("oabFilter", event.target.value)}
          aria-label="Filtrar por status da OAB"
        >
          <option value="ALL">Todos os status OAB</option>
          <option value="VERIFIED">OAB verificada</option>
          <option value="PENDING">OAB pendente</option>
          <option value="ERROR">OAB com erro</option>
        </select>
      </label>

      <label className={styles.filterField}>
        <select
          value={filters.dateFilter}
          onChange={(event) => onChange("dateFilter", event.target.value)}
          aria-label="Filtrar por data de cadastro"
        >
          <option value="ALL">Qualquer data</option>
          <option value="TODAY">Cadastrados hoje</option>
          <option value="7DAYS">Últimos 7 dias</option>
          <option value="30DAYS">Últimos 30 dias</option>
        </select>
      </label>

      <label className={styles.filterField}>
        <select
          value={filters.inactivityFilter}
          onChange={(event) => onChange("inactivityFilter", event.target.value)}
          aria-label="Filtrar por inatividade"
        >
          <option value="ALL">Sem filtro de inatividade</option>
          <option value="NEVER">Nunca acessaram</option>
          <option value="7DAYS">Inativos há 7+ dias</option>
          <option value="15DAYS">Inativos há 15+ dias</option>
          <option value="30DAYS">Inativos há 30+ dias</option>
        </select>
      </label>

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
