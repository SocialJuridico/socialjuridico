"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Siren,
} from "lucide-react";

import styles from "../Oportunidade.module.css";
import OpportunityCard from "./OpportunityCard";

export default function EmergencyOpportunities({ controller }) {
  const {
    loading,
    error,
    cases,
    pagination,
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
    <section
      className={`${styles.panel} ${styles.emergencyPanel}`}
      aria-labelledby="emergency-opportunities-title"
    >
      <div className={styles.emergencyBanner}>
        <Siren size={20} aria-hidden="true" />
        <div>
          <strong id="emergency-opportunities-title">
            Casos de emergência
          </strong>
          <p>
            Registros enviados pelo botão de emergência (vídeo gravado na hora,
            classificado pela IA). Priorize os marcados com risco à vida.
          </p>
        </div>
      </div>

      <div className={styles.statusBar}>
        <span>
          <strong>{pagination.total || 0}</strong> emergência(s) aberta(s)
        </span>
      </div>

      {loading ? (
        <div className={styles.loadingGrid} aria-label="Carregando emergências">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className={styles.loadingCard} aria-hidden="true" />
          ))}
        </div>
      ) : error ? (
        <div className={styles.stateBox} role="alert">
          <div className={styles.stateContent}>
            <AlertTriangle size={34} aria-hidden="true" />
            <h3>Não foi possível carregar as emergências</h3>
            <p>{error}</p>
            <button type="button" className={styles.button} onClick={reload}>
              <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
            </button>
          </div>
        </div>
      ) : cases.length === 0 ? (
        <div className={styles.stateBox}>
          <div className={styles.stateContent}>
            <ShieldCheck size={36} aria-hidden="true" />
            <h3>Nenhuma emergência no momento</h3>
            <p>
              Quando um cliente acionar o botão de emergência, o caso aparece
              aqui imediatamente, já classificado pela IA.
            </p>
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
            <nav className={styles.pagination} aria-label="Paginação das emergências">
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
