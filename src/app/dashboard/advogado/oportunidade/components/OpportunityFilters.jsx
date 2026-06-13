"use client";

import { RotateCcw, Search } from "lucide-react";

import styles from "../Oportunidade.module.css";

export default function OpportunityFilters({
  filters,
  areas,
  loading,
  onChange,
  onSubmit,
  onClear,
}) {
  return (
    <form className={styles.filters} onSubmit={onSubmit} role="search">
      <div className={styles.field}>
        <label htmlFor="opportunity-search">Buscar oportunidade</label>
        <div className={styles.inputWrap}>
          <Search size={16} aria-hidden="true" />
          <input
            id="opportunity-search"
            type="search"
            className={styles.input}
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Título, área, cidade ou descrição"
            maxLength={120}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="opportunity-area">Área de atuação</label>
        <select
          id="opportunity-area"
          className={styles.select}
          value={filters.area}
          onChange={(event) => onChange("area", event.target.value)}
        >
          <option value="">Todas as áreas</option>
          {areas.map((area) => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="opportunity-state">UF</label>
        <input
          id="opportunity-state"
          className={styles.input}
          value={filters.state}
          onChange={(event) =>
            onChange(
              "state",
              event.target.value.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 2),
            )
          }
          placeholder="RS"
          inputMode="text"
          autoComplete="address-level1"
          maxLength={2}
        />
      </div>

      <div className={styles.filterActions}>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={onClear}
          disabled={loading}
        >
          <RotateCcw size={15} aria-hidden="true" />
          Limpar
        </button>
        <button type="submit" className={styles.button} disabled={loading}>
          <Search size={15} aria-hidden="true" />
          Filtrar
        </button>
      </div>
    </form>
  );
}
