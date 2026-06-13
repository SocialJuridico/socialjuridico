"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import styles from "./RouteFallback.module.css";

export default function LawyerOpportunitiesError({ error, reset }) {
  useEffect(() => {
    console.error("[Oportunidades][RouteBoundary] Falha não tratada:", error);
  }, [error]);

  return (
    <main className={styles.page} role="alert">
      <div className={styles.card}>
        <AlertTriangle size={34} aria-hidden="true" />
        <h1>Não foi possível abrir as oportunidades</h1>
        <p>
          Ocorreu uma falha inesperada ao montar esta área. Sua sessão e seus dados
          não foram alterados.
        </p>
        <button type="button" className={styles.button} onClick={reset}>
          <RefreshCw size={16} aria-hidden="true" /> Tentar novamente
        </button>
      </div>
    </main>
  );
}
