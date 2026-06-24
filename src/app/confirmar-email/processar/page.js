"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, Mail, Scale } from "lucide-react";

import styles from "../ConfirmarEmail.module.css";

function ConfirmationCard({ children }) {
  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <div className={styles.logoRow}>
          <Scale size={32} color="var(--color-gold)" aria-hidden="true" />
          <span className={styles.logoText}>Social Jurídico</span>
        </div>

        {children}
      </section>
    </main>
  );
}

function ProcessarConfirmacaoContent() {
  const searchParams = useSearchParams();
  const [enviando, setEnviando] = useState(false);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") || "signup";

  if (!tokenHash) {
    return (
      <ConfirmationCard>
        <div className={styles.stateContent}>
          <div className={styles.iconWrapperError}>
            <AlertCircle size={48} aria-hidden="true" />
          </div>

          <h1 className={styles.errorTitle}>Link inválido</h1>

          <p className={styles.description}>
            Este link de confirmação está incompleto. Solicite um novo e-mail
            de confirmação.
          </p>

          <div className={styles.buttonGroup}>
            <a
              href="mailto:socialjuridico3@gmail.com?subject=Problema%20na%20confirma%C3%A7%C3%A3o%20de%20e-mail"
              className={styles.supportBtn}
            >
              <Mail size={17} aria-hidden="true" />
              Falar com atendimento
            </a>
          </div>
        </div>
      </ConfirmationCard>
    );
  }

  function confirmar() {
    setEnviando(true);
    const url = new URL("/api/auth/confirm-email", window.location.origin);
    url.searchParams.set("token_hash", tokenHash);
    url.searchParams.set("type", type);
    window.location.href = url.toString();
  }

  return (
    <ConfirmationCard>
      <div className={styles.stateContent}>
        <h1 className={styles.title}>Confirme sua conta</h1>

        <p className={styles.description}>
          Para concluir seu cadastro no Social Jurídico, clique no botão
          abaixo. Por segurança, a confirmação só acontece com esse clique.
        </p>

        <button
          type="button"
          className={styles.actionBtn}
          onClick={confirmar}
          disabled={enviando}
        >
          {enviando ? (
            <Loader2
              size={18}
              className={styles.spinIcon}
              aria-hidden="true"
            />
          ) : (
            "Confirmar minha conta"
          )}
        </button>
      </div>
    </ConfirmationCard>
  );
}

export default function ProcessarConfirmacaoPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.container}>
          <section className={styles.card}>
            <div className={styles.stateContent}>
              <Loader2
                size={42}
                className={styles.spinIcon}
                aria-label="Carregando"
              />
              <p className={styles.description}>Carregando…</p>
            </div>
          </section>
        </main>
      }
    >
      <ProcessarConfirmacaoContent />
    </Suspense>
  );
}
