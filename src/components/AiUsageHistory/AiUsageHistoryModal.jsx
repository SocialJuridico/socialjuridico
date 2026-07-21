"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Brain, X } from "lucide-react";

import styles from "./AiUsageHistoryModal.module.css";

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AiUsageHistoryModal({ isOpen, onClose }) {
  const [state, setState] = useState({ status: "loading", consultas: [], message: "" });

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKey);

    let cancelled = false;
    fetch("/api/advogado/extensao/interpretar/historico", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.success) setState({ status: "ok", consultas: data.data.consultas || [], message: "" });
        else setState({ status: "error", consultas: [], message: data?.message || "Falha ao carregar." });
      })
      .catch(() => !cancelled && setState({ status: "error", consultas: [], message: "Falha ao carregar." }));

    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      // Reset para o próximo open mostrar "Carregando…" (não o resultado antigo).
      setState({ status: "loading", consultas: [], message: "" });
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="ai-usage-title">
        <header className={styles.header}>
          <div>
            <span>
              <Brain size={15} /> Extensão Social Jurídico
            </span>
            <h2 id="ai-usage-title">Histórico de consultas IA</h2>
            <p>Quando você usou a interpretação por IA e como foi paga.</p>
          </div>
          <button type="button" className={styles.closeIcon} onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className={styles.content}>
          {state.status === "loading" && <p className={styles.muted}>Carregando…</p>}
          {state.status === "error" && <p className={styles.muted}>{state.message}</p>}
          {state.status === "ok" && state.consultas.length === 0 && (
            <p className={styles.muted}>Você ainda não fez nenhuma consulta.</p>
          )}
          {state.status === "ok" && state.consultas.length > 0 && (
            <ul className={styles.list}>
              {state.consultas.map((c) => (
                <li key={c.id} className={styles.row}>
                  <div className={styles.rowMain}>
                    <span className={styles.date}>{formatDateTime(c.createdAt)}</span>
                    <span className={c.origem === "FREE" ? styles.badgeFree : styles.badgeCredit}>
                      {c.origem === "FREE" ? "Grátis" : "Crédito"}
                    </span>
                  </div>
                  <span className={styles.count}>
                    {c.resultadosCount} {c.resultadosCount === 1 ? "artigo" : "artigos"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}
