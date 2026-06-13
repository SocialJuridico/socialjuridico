"use client";

import { Filter, MapPin, RotateCcw } from "lucide-react";

import styles from "../Oportunidade.module.css";

const CATEGORIES = [
  "Direito Civil",
  "Direito de Família",
  "Direito do Consumidor",
  "Direito Trabalhista",
  "Direito Previdenciário",
  "Direito Criminal",
  "Direito Empresarial",
  "Direito Tributário",
  "Direito Imobiliário",
];

export default function RadarFilters({ controller }) {
  const { filters, updateFilter, applyFilters, clearFilters, loading } = controller;

  return (
    <form className={styles.filters} onSubmit={applyFilters}>
      <div className={styles.field}>
        <label htmlFor="radar-city">Cidade</label>
        <div className={styles.inputWrap}>
          <MapPin size={15} aria-hidden="true" />
          <input
            id="radar-city"
            className={styles.input}
            value={filters.cidade}
            onChange={(event) => updateFilter("cidade", event.target.value)}
            placeholder="Ex.: Porto Alegre"
            maxLength={100}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="radar-category">Categoria</label>
        <select
          id="radar-category"
          className={styles.select}
          value={filters.categoria}
          onChange={(event) => updateFilter("categoria", event.target.value)}
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="radar-state">UF</label>
        <input
          id="radar-state"
          className={styles.input}
          value={filters.estado}
          onChange={(event) =>
            updateFilter(
              "estado",
              event.target.value.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 2),
            )
          }
          placeholder="RS"
          maxLength={2}
        />
      </div>

      <div className={styles.filterActions}>
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={clearFilters}
          disabled={loading}
        >
          <RotateCcw size={15} aria-hidden="true" /> Limpar
        </button>
        <button type="submit" className={styles.button} disabled={loading}>
          <Filter size={15} aria-hidden="true" /> Filtrar
        </button>
      </div>
    </form>
  );
}
