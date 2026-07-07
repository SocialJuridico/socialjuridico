"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  FileCheck2,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import styles from "./OraculoLogin.module.css";

export default function OraculoAcademicoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setErrorMsg("Informe e-mail e senha válidos.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setErrorMsg(
          data?.message || "Não foi possível realizar o login.",
        );
        return;
      }

      router.push("/oraculoacademico/painel");
    } catch {
      setErrorMsg("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.leftSide}>
        <div className={styles.leftPattern} aria-hidden="true" />

        <Link href="/oraculoacademico" className={styles.backButton}>
          <ArrowLeft size={17} aria-hidden="true" />
          Voltar para o Oráculo Acadêmico
        </Link>

        <div className={styles.leftContent}>
          <span className={styles.brand}>
            <span className={styles.brandIcon}>
              <GraduationCap size={20} aria-hidden="true" />
            </span>
            Oráculo Acadêmico
          </span>

          <span className={styles.eyebrow}>Área do candidato</span>

          <h1 className={styles.leftTitle}>
            Acompanhe seu cadastro e sua ativação em um só lugar.
          </h1>

          <p className={styles.leftDesc}>
            Acesse com o e-mail e a senha que você usou no cadastro do
            programa de prática jurídica supervisionada.
          </p>

          <div className={styles.trustList}>
            <div>
              <FileCheck2 size={20} aria-hidden="true" />
              <span>Documento analisado com segurança pela nossa equipe</span>
            </div>

            <div>
              <ShieldCheck size={20} aria-hidden="true" />
              <span>Supervisão de advogados habilitados na OAB</span>
            </div>

            <div>
              <BadgeCheck size={20} aria-hidden="true" />
              <span>Conta vinculada ao ecossistema Social Jurídico</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.rightSide}>
        <div className={styles.formContainer}>
          <Link href="/oraculoacademico" className={styles.logoMobileOnly}>
            <GraduationCap size={26} aria-hidden="true" />
            Oráculo Acadêmico
          </Link>

          <span className={styles.eyebrow}>Oráculo Acadêmico</span>
          <h1 className={styles.title}>Acesse sua conta</h1>
          <p className={styles.subtitle}>
            Entre com o e-mail e a senha usados no seu cadastro.
          </p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="oraculo-login-email">
                E-mail
              </label>
              <div className={styles.inputWrap}>
                <Mail size={16} aria-hidden="true" />
                <input
                  id="oraculo-login-email"
                  type="email"
                  autoComplete="email"
                  maxLength={320}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="oraculo-login-password">
                Senha
              </label>
              <div className={styles.inputWrap}>
                <LockKeyhole size={16} aria-hidden="true" />
                <input
                  id="oraculo-login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className={styles.errorMessage} role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={17} className={styles.spinner} aria-hidden="true" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className={styles.switchAuth}>
            Ainda não tem cadastro?{" "}
            <Link href="/oraculoacademico/cadastro">Cadastre-se</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
