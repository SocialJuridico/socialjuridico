"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  Scale,
} from "lucide-react";

import styles from "./ConfirmarEmail.module.css";

function ConfirmationCard({ children, brandLabel = "Social Jurídico" }) {
  return (
    <main className={styles.container}>
      <section className={styles.card}>
        <div className={styles.logoRow}>
          <Scale
            size={32}
            color="var(--color-gold)"
            aria-hidden="true"
          />

          <span className={styles.logoText}>
            {brandLabel}
          </span>
        </div>

        {children}
      </section>
    </main>
  );
}

function ConfirmarEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = searchParams.get("status");
  const message = searchParams.get("message");
  const contexto = searchParams.get("contexto");
  const isOraculo = contexto === "oraculo";
  const loginPath = isOraculo ? "/oraculoacademico/login" : "/login";
  const brandLabel = isOraculo ? "Oráculo Acadêmico" : "Social Jurídico";

  const isSuccess = status === "success";
  const isError = status === "error";

  useEffect(() => {
    if (!isSuccess) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      router.push(loginPath);
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isSuccess, router, loginPath]);

  if (isSuccess) {
    return (
      <ConfirmationCard brandLabel={brandLabel}>
        <div className={styles.stateContent}>
          <div className={styles.iconWrapperSuccess}>
            <CheckCircle2
              size={48}
              aria-hidden="true"
            />
          </div>

          <h1 className={styles.successTitle}>
            Conta ativada
          </h1>

          <p className={styles.description}>
            {message ||
              "Seu e-mail foi confirmado com sucesso."}
          </p>

          <p className={styles.subtext}>
            Você será encaminhado para a página de login em
            alguns segundos.
          </p>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => router.push(loginPath)}
          >
            Ir para o login
          </button>
        </div>
      </ConfirmationCard>
    );
  }

  if (isError) {
    return (
      <ConfirmationCard brandLabel={brandLabel}>
        <div className={styles.stateContent}>
          <div className={styles.iconWrapperError}>
            <AlertCircle
              size={48}
              aria-hidden="true"
            />
          </div>

          <h1 className={styles.errorTitle}>
            Não foi possível confirmar
          </h1>

          <p className={styles.description}>
            {message ||
              "O link pode ter expirado, já ter sido utilizado ou estar incompleto."}
          </p>

          <p className={styles.subtext}>
            Tente fazer login. Caso a conta continue pendente,
            solicite um novo e-mail de confirmação.
          </p>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => router.push(loginPath)}
            >
              Ir para o login
            </button>

            <a
              href="mailto:socialjuridico3@gmail.com?subject=Problema%20na%20confirma%C3%A7%C3%A3o%20de%20e-mail"
              className={styles.supportBtn}
            >
              <Mail
                size={17}
                aria-hidden="true"
              />

              Falar com atendimento
            </a>
          </div>
        </div>
      </ConfirmationCard>
    );
  }

  return (
    <ConfirmationCard brandLabel={brandLabel}>
      <div className={styles.stateContent}>
        <div className={styles.iconWrapperLoading}>
          <Loader2
            size={48}
            className={styles.spinIcon}
            aria-hidden="true"
          />
        </div>

        <h1 className={styles.title}>
          Processando confirmação...
        </h1>

        <p className={styles.description}>
          Aguarde enquanto verificamos o resultado da
          confirmação da sua conta.
        </p>
      </div>
    </ConfirmationCard>
  );
}

export default function ConfirmarEmailPage() {
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

              <p className={styles.description}>
                Carregando confirmação...
              </p>
            </div>
          </section>
        </main>
      }
    >
      <ConfirmarEmailContent />
    </Suspense>
  );
}