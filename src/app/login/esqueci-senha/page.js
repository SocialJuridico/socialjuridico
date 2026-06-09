"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";

import { forgotPasswordAction } from "@/app/actions/passwordActions";

import styles from "./EsqueciSenha.module.css";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function handleEmailChange(event) {
    setEmail(event.target.value);
    setErrorMsg("");
  }

  function validateEmail() {
    const normalizedEmail = email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      normalizedEmail.length > 160 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return {
        error: "Informe um endereço de e-mail válido.",
        email: "",
      };
    }

    return {
      error: null,
      email: normalizedEmail,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    const validation = validateEmail();

    if (validation.error) {
      setErrorMsg(validation.error);
      return;
    }

    setLoading(true);

    try {
      const response = await forgotPasswordAction(validation.email);

      if (!response.success) {
        setErrorMsg(
          response.message ||
            "Não foi possível processar a solicitação.",
        );
        return;
      }

      setSubmittedEmail(validation.email);
      setSuccessMsg(
        response.message ||
          "Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.",
      );
    } catch (error) {
      console.error("[Esqueci minha senha] Erro:", error);
      setErrorMsg(
        "Não foi possível processar sua solicitação. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  function tryAgain() {
    setSuccessMsg("");
    setErrorMsg("");
    setSubmittedEmail("");
  }

  return (
    <main className={styles.pageWrapper}>
      <section className={styles.leftSide}>
        <div className={styles.leftPattern} aria-hidden="true" />

        <Link
          prefetch={false}
          href="/login"
          className={styles.backButton}
        >
          <ArrowLeft size={19} aria-hidden="true" />
          Voltar ao login
        </Link>

        <div className={styles.leftContent}>
          <span className={styles.eyebrow}>Recuperação de acesso</span>

          <h1 className={styles.leftTitle}>
            Recupere o acesso à sua conta com
            <span className={styles.highlight}> segurança.</span>
          </h1>

          <p className={styles.leftDesc}>
            Informe o e-mail utilizado no cadastro. Caso exista uma conta
            associada, enviaremos um link para você criar uma nova senha.
          </p>

          <div className={styles.trustList}>
            <div>
              <ShieldCheck size={20} aria-hidden="true" />
              <span>A solicitação não altera imediatamente sua senha</span>
            </div>

            <div>
              <KeyRound size={20} aria-hidden="true" />
              <span>O link possui validade limitada</span>
            </div>

            <div>
              <Mail size={20} aria-hidden="true" />
              <span>As instruções são enviadas somente por e-mail</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.rightSide}>
        <div className={styles.formContainer}>
          <Link
            prefetch={false}
            href="/"
            className={styles.logoMobileOnly}
          >
            <Scale size={28} aria-hidden="true" />
            Social Jurídico
          </Link>

          {!successMsg ? (
            <>
              <header className={styles.formHeader}>
                <span className={styles.eyebrow}>Esqueceu sua senha?</span>

                <h1 className={styles.formTitle}>Solicite um novo acesso</h1>

                <p className={styles.formSubtitle}>
                  Enviaremos as instruções de recuperação ao e-mail informado.
                </p>
              </header>

              {errorMsg && (
                <div
                  className={styles.errorMessage}
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className={styles.form}
                noValidate
              >
                <div className={styles.formGroup}>
                  <label
                    htmlFor="recovery-email"
                    className={styles.label}
                  >
                    E-mail cadastrado
                  </label>

                  <input
                    id="recovery-email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={handleEmailChange}
                    className={styles.input}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={160}
                    required
                    disabled={loading}
                  />
                </div>

                <p className={styles.privacyNotice}>
                  Por segurança, não informaremos se o endereço possui ou não
                  uma conta cadastrada.
                </p>

                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2
                        size={19}
                        className={styles.spinner}
                        aria-hidden="true"
                      />
                      Enviando instruções...
                    </>
                  ) : (
                    <>
                      Enviar instruções
                      <Mail size={18} aria-hidden="true" />
                    </>
                  )}
                </button>

                <p className={styles.loginHint}>
                  Lembrou sua senha?{" "}
                  <Link
                    prefetch={false}
                    href="/login"
                    className={styles.textLink}
                  >
                    Fazer login
                  </Link>
                </p>
              </form>
            </>
          ) : (
            <section className={styles.successCard} aria-live="polite">
              <div className={styles.successIcon}>
                <CheckCircle2 size={45} aria-hidden="true" />
              </div>

              <span className={styles.eyebrow}>Solicitação recebida</span>

              <h1 className={styles.successTitle}>Verifique seu e-mail</h1>

              <p className={styles.successDescription}>{successMsg}</p>

              {submittedEmail && (
                <strong className={styles.submittedEmail}>
                  {submittedEmail}
                </strong>
              )}

              <div className={styles.emailInstructions}>
                <Mail size={19} aria-hidden="true" />

                <div>
                  <strong>Não encontrou a mensagem?</strong>
                  <p>
                    Verifique também as pastas Spam, Promoções, Atualizações e
                    Lixeira.
                  </p>
                </div>
              </div>

              <Link
                prefetch={false}
                href="/login"
                className={styles.primaryAction}
              >
                Voltar para o login
              </Link>

              <button
                type="button"
                className={styles.secondaryAction}
                onClick={tryAgain}
              >
                Tentar com outro e-mail
              </button>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
