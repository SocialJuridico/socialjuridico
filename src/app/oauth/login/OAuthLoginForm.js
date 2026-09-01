"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import styles from "../OAuth.module.css";

export default function OAuthLoginForm({ authorizationId }) {
  const router = useRouter();

  const consentUrl = useMemo(
    () => `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`,
    [authorizationId],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Informe um endereço de e-mail válido.");
      return;
    }

    if (!password) {
      setError("Informe sua senha.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setError(
          data?.message ||
            "Não foi possível entrar na sua conta Social Jurídico. Verifique suas credenciais.",
        );
        return;
      }

      router.replace(consentUrl);
      router.refresh();
    } catch (loginError) {
      console.error("[OAuth Login] Erro ao autenticar:", loginError);
      setError("Não foi possível conectar ao Social Jurídico agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <header className={styles.cardHeader}>
        <div className={styles.appBadge}>
          <LockKeyhole size={31} aria-hidden="true" />
        </div>
        <span className={styles.eyebrow}>Acesso seguro</span>
        <h1 className={styles.title}>Entre para continuar</h1>
        <p className={styles.subtitle}>
          Use sua conta Social Jurídico para autorizar o acesso do Rota da Justiça.
        </p>
      </header>

      <div className={styles.body}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="oauth-email" className={styles.label}>
              E-mail
            </label>
            <input
              id="oauth-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              inputMode="email"
              maxLength={160}
              disabled={loading}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="oauth-password" className={styles.label}>
              Senha
            </label>
            <input
              id="oauth-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className={styles.loginButton} disabled={loading}>
            {loading ? "Entrando..." : "Entrar e continuar"}
          </button>
        </form>

        <p className={styles.helper}>
          Você está entrando no <strong>Social Jurídico</strong>. Sua senha não é compartilhada com o Rota da Justiça.
          <br />
          <Link href="/login">Usar a tela de acesso principal</Link>
        </p>

        <div className={styles.privacyNote}>
          <Mail size={17} aria-hidden="true" />
          <span>
            Depois do login você verá quais dados básicos o Rota da Justiça está solicitando antes de autorizar.
          </span>
        </div>
      </div>
    </>
  );
}
