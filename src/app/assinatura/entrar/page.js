"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileCheck2,
  Loader2,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";

import styles from "../auth.module.css";

function SignatureLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [status, setStatus] = useState(() => {
    if (searchParams.get("confirmado") === "true") return { type: "success", message: "E-mail confirmado. Você já pode entrar." };
    if (searchParams.get("erro")) return { type: "error", message: "O link de confirmação é inválido ou expirou." };
    return { type: "idle", message: "" };
  });
  const [errorCode, setErrorCode] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setStatus({ type: "error", message: "Informe e-mail e senha válidos." });
      return;
    }

    setLoading(true);
    setErrorCode("");
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/assinatura/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setErrorCode(data?.code || "");
        setStatus({ type: "error", message: data?.message || "Não foi possível entrar." });
        return;
      }

      setStatus({ type: "success", message: "Acesso confirmado. Redirecionando..." });
      window.setTimeout(() => router.push(data.redirectTo || "/assinatura/app"), 500);
    } catch {
      setStatus({ type: "error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setLoading(false);
    }
  }

  async function resendConfirmation() {
    if (resending || !email.trim()) return;
    setResending(true);
    try {
      const response = await fetch("/api/assinatura/auth/reenviar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json().catch(() => null);
      setStatus({ type: response.ok ? "success" : "error", message: data?.message || "Não foi possível reenviar." });
    } catch {
      setStatus({ type: "error", message: "Não foi possível reenviar agora." });
    } finally {
      setResending(false);
    }
  }

  return (
    <div className={styles.authPage}>
      <aside className={styles.authAside}>
        <Link href="/assinatura" className={styles.backLink}><ArrowLeft size={17} /> Voltar para Assinatura</Link>
        <div className={styles.asideContent}>
          <Link href="/assinatura" className={styles.brand}><span><Scale size={23} /></span> Social Jurídico <strong>Assinatura</strong></Link>
          <div className={styles.asideLabel}><ShieldCheck size={15} /> Ambiente protegido</div>
          <h1>Seus documentos, fluxos e evidências em um só lugar.</h1>
          <p>Acesse sua área para acompanhar assinaturas, consultar o consumo do plano e validar documentos concluídos.</p>
          <ul>
            <li><Check size={17} /> Sessão protegida e acesso individual</li>
            <li><Check size={17} /> Organizações e dados isolados</li>
            <li><Check size={17} /> Histórico associado à sua conta</li>
          </ul>
        </div>
      </aside>

      <section className={styles.formSide}>
        <div className={`${styles.formWrap} ${styles.loginFormWrap}`}>
          <div className={styles.mobileBrand}><Scale size={22} /> Social Jurídico <strong>Assinatura</strong></div>
          <div className={styles.loginSeal}><BadgeCheck size={20} /></div>
          <span className={styles.formEyebrow}>Área do cliente</span>
          <h2>Acesse sua conta.</h2>
          <p className={styles.formIntro}>Use suas credenciais do produto de assinatura ou a conta já existente no Social Jurídico.</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="signature-login-email">E-mail</label>
              <div className={styles.inputWrap}><Mail size={18} /><input id="signature-login-email" type="email" autoComplete="email" maxLength={320} value={email} onChange={(event) => { setEmail(event.target.value); setStatus({ type: "idle", message: "" }); }} placeholder="voce@empresa.com.br" disabled={loading} /></div>
            </div>
            <div className={styles.field}>
              <div className={styles.labelRow}><label htmlFor="signature-login-password">Senha</label><Link href="/login/esqueci-senha">Esqueceu a senha?</Link></div>
              <div className={styles.inputWrap}><LockKeyhole size={18} /><input id="signature-login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" maxLength={128} value={password} onChange={(event) => { setPassword(event.target.value); setStatus({ type: "idle", message: "" }); }} placeholder="Sua senha" disabled={loading} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
            </div>

            {status.type !== "idle" && <div className={`${styles.status} ${status.type === "error" ? styles.statusError : styles.statusSuccess}`} role={status.type === "error" ? "alert" : "status"}>{status.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}<span>{status.message}</span></div>}

            {errorCode === "EMAIL_NOT_CONFIRMED" && <button type="button" className={styles.inlineAction} onClick={resendConfirmation} disabled={resending}>{resending ? <Loader2 size={16} className={styles.spin} /> : <Mail size={16} />} Reenviar confirmação</button>}
            {errorCode === "SIGNATURE_ACCOUNT_REQUIRED" && <Link href="/assinatura/cadastro" className={styles.inlineAction}><FileCheck2 size={16} /> Ativar gratuitamente</Link>}

            <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? <><Loader2 size={18} className={styles.spin} /> Entrando...</> : <>Entrar na plataforma <ArrowRight size={18} /></>}</button>
          </form>

          <p className={styles.switchAuth}>Ainda não possui uma conta? <Link href="/assinatura/cadastro">Comece gratuitamente</Link></p>
        </div>
      </section>
    </div>
  );
}

export default function SignatureLoginPage() {
  return <Suspense fallback={<div className={styles.authLoading}><Loader2 size={32} className={styles.spin} /></div>}><SignatureLoginContent /></Suspense>;
}

