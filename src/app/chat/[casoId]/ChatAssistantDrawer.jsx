"use client";

import { Bot, Copy, Loader2, RefreshCw, ShieldCheck, Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";

import styles from "./Chat.module.css";

export default function ChatAssistantDrawer({
  open,
  loading,
  analysis,
  assistantName,
  role,
  onClose,
  onRefresh,
}) {
  async function copyAnalysis() {
    if (!analysis?.text) return;
    try {
      await navigator.clipboard.writeText(analysis.text);
      toast.success("Análise copiada.");
    } catch {
      toast.error("Não foi possível copiar a análise.");
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.drawerBackdrop} ${open ? styles.drawerBackdropOpen : ""}`}
        onClick={onClose}
        aria-label="Fechar assistente"
        tabIndex={open ? 0 : -1}
      />

      <aside
        className={`${styles.assistantDrawer} ${open ? styles.assistantDrawerOpen : ""}`}
        aria-hidden={!open}
        aria-label={assistantName}
      >
        <header className={styles.assistantHeader}>
          <span className={styles.assistantAvatar}>
            {role === "CLIENT" ? <ShieldCheck size={21} /> : <Bot size={21} />}
          </span>
          <div>
            <strong>{assistantName}</strong>
            <small>Privado · somente você vê esta análise</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className={styles.assistantBody}>
          {loading ? (
            <div className={styles.assistantLoading}>
              <Loader2 size={30} className={styles.spinner} />
              <strong>Analisando a conversa</strong>
              <span>
                {role === "CLIENT"
                  ? "O Anjo Jurídico está revisando o contexto com cautela."
                  : "O assistente está organizando os próximos passos."}
              </span>
            </div>
          ) : analysis?.text ? (
            <>
              <div className={styles.analysisMeta}>
                <span>
                  <Sparkles size={14} />
                  {analysis.scope === "MESSAGE"
                    ? "Análise de mensagem"
                    : "Análise da conversa"}
                </span>
                {analysis.cached && <em>Resposta reaproveitada com segurança</em>}
              </div>
              <article className={styles.analysisText}>{analysis.text}</article>
              <div className={styles.assistantActions}>
                <button type="button" onClick={copyAnalysis}>
                  <Copy size={15} />
                  Copiar
                </button>
                <button type="button" onClick={onRefresh}>
                  <RefreshCw size={15} />
                  Analisar conversa
                </button>
              </div>
            </>
          ) : (
            <div className={styles.assistantEmpty}>
              <Sparkles size={30} />
              <strong>Seu apoio está disponível</strong>
              <p>
                Peça uma leitura privada do histórico sempre que precisar de mais
                clareza antes de responder.
              </p>
              <button type="button" onClick={onRefresh}>
                Analisar conversa
              </button>
            </div>
          )}
        </div>

        <footer className={styles.assistantDisclaimer}>
          A IA oferece apoio informativo e estratégico. Ela não substitui análise
          profissional nem garante resultados jurídicos.
        </footer>
      </aside>
    </>
  );
}
