"use client";

import { AlertTriangle, BriefcaseBusiness, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import styles from "../Oportunidade.module.css";
import OpportunityCard from "./OpportunityCard";
import OpportunityFilters from "./OpportunityFilters";

export default function PlatformOpportunities({ controller }) {
  const {
    filters,
    areas,
    loading,
    error,
    cases,
    pagination,
    summary,
    updateFilter,
    applyFilters,
    clearFilters,
    reload,
    page,
    setPage,
    setSelectedCase,
    setPendingInterest,
    busyCaseId,
  } = controller;

  function requestInterest(item) {
    setSelectedCase(null);
    setPendingInterest(item);
  }

  return (
    <section className={styles.panel} aria-labelledby="platform-opportunities-title">
      <OpportunityFilters
        filters={filters}
        areas={areas}
        loading={loading}
        onChange={updateFilter}
        onSubmit={applyFilters}
        onClear={clearFilters}
      />

      <div className={styles.statusBar}>
        <span id="platform-opportunities-title">
          <strong>{pagination.total || 0}</strong> oportunidade(s) disponível(is)
        </span>
        <span>{summary.negotiating || 0} em negociação, ainda sem contratação</span>
      </div>

      {loading ? (
        <div className={styles.loadingGrid} aria-label="Carregando oportunidades">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className={styles.loadingCard} aria-hidden="true" />
          ))}
        </div>
      ) : error ? (
        <div className={styles.stateBox} role="alert">
          <div className={styles.stateContent}>
            <AlertTriangle size={34} aria-hidden="true" />
            <h3>Não foi possível carregar as oportunidades</h3>
            <p>{error}</p>
            <button type="button" className={styles.button} onClick={reload}>
              <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
            </button>
          </div>
        </div>
      ) : cases.length === 0 ? (
        <div className={styles.stateBox}>
          <div className={styles.stateContent}>
            <BriefcaseBusiness size={36} aria-hidden="true" />
            <h3>Nenhuma oportunidade encontrada</h3>
            <p>
              Não há casos compatíveis com os filtros atuais ou você já manifestou
              interesse nas oportunidades disponíveis.
            </p>
            <button type="button" className={styles.buttonSecondary} onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.cardsGrid}>
            {cases.map((item) => (
              <OpportunityCard
                key={item.id}
                item={item}
                busy={busyCaseId === item.id}
                onView={setSelectedCase}
                onInterest={requestInterest}
              />
            ))}
          </div>

          {pagination.pages > 1 && (
            <nav className={styles.pagination} aria-label="Paginação das oportunidades">
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={loading || page <= 1}
              >
                <ChevronLeft size={15} aria-hidden="true" /> Anterior
              </button>
              <span>
                Página {pagination.page} de {pagination.pages}
              </span>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() =>
                  setPage((current) => Math.min(pagination.pages, current + 1))
                }
                disabled={loading || page >= pagination.pages}
              >
                Próxima <ChevronRight size={15} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
