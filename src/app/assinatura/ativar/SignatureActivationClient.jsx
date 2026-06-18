"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Scale,
  ShieldCheck,
} from "lucide-react";

import styles from "../auth.module.css";

export default function SignatureActivationClient({ email, suggestedName }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: suggestedName,
    phone: "",
    termsAccepted: false,
    privacyAccepted: false,
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setStatus({ type: "idle", message: "" });
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;

    if (form.name.trim().length < 3) {
      setStatus({ type: "error", message: "Informe seu nome completo." });
      return;
    }

    if (!form.termsAccepted || !form.privacyAccepted) {
      setStatus({ type: "error", message: "Aceite os Termos de Uso e a Política de Privacidade." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/assinatura/auth/ativar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setStatus({ type: "error", message: data?.message || "Não foi possível ativar o produto." });
        return;
      }

      setStatus({ type: "success", message: "Produto ativado. Redirecionando..." });
      window.setTimeout(() => router.replace(data.redirectTo || "/assinatura/app"), 500);
    } catch {
      setStatus({ type: "error", message: "Não foi possível conectar ao servidor." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.authPage}>
      <aside className={styles.authAside}>
        <div className={styles.asideContent}>
          <Link href="/assinatura" className={styles.brand}><span><Scale size={23} /></span> Social Jurídico <strong>Assinatura</strong></Link>
          <div className={styles.asideLabel}><ShieldCheck size={15} /> Identidade confirmada</div>
          <h1>Um produto próprio, dentro do mesmo ecossistema.</h1>
          <p>A confirmação do e-mail permite criar sua conta de assinatura sem compartilhar dados da plataforma jurídica.</p>
          <ul>
            <li><Check size={17} /> Conta e organização exclusivas</li>
            <li><Check size={17} /> Sessão independente</li>
            <li><Check size={17} /> Plano gratuito com 3 documentos</li>
          </ul>
        </div>
      </aside>

      <section className={styles.formSide}>
        <div className={`${styles.formWrap} ${styles.loginFormWrap}`}>
          <div className={styles.loginSeal}><BadgeCheck size={20} /></div>
          <span className={styles.formEyebrow}>Última etapa</span>
          <h2>Ative sua conta.</h2>
          <p className={styles.formIntro}>Confirme seus dados para habilitar somente o produto Social Jurídico Assinatura.</p>

          <form onSubmit={submit} className={styles.form} noValidate>
            <div className={styles.activationNotice}>
              <FileCheck2 size={20} />
              <div><strong>E-mail confirmado</strong><span>{email}</span></div>
            </div>
            <div className={styles.field}>
              <label htmlFor="signature-link-name">Nome completo</label>
              <div className={styles.inputWrap}><BadgeCheck size={18} /><input id="signature-link-name" autoComplete="name" maxLength={120} value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Seu nome completo" disabled={loading} /></div>
            </div>
            <div className={styles.field}>
              <label htmlFor="signature-link-phone">WhatsApp <span>opcional</span></label>
              <div className={styles.inputWrap}><FileCheck2 size={18} /><input id="signature-link-phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={(event) => update("phone", event.target.value)} placeholder="(15) 99999-9999" disabled={loading} /></div>
            </div>
            <div className={styles.consents}>
              <label><input type="checkbox" checked={form.termsAccepted} onChange={(event) => update("termsAccepted", event.target.checked)} /><span>Aceito os <Link href="/termos" target="_blank">Termos de Uso</Link> do produto.</span></label>
              <label><input type="checkbox" checked={form.privacyAccepted} onChange={(event) => update("privacyAccepted", event.target.checked)} /><span>Li e aceito a <Link href="/privacidade" target="_blank">Política de Privacidade</Link>.</span></label>
            </div>

            {status.type !== "idle" && <div className={`${styles.status} ${status.type === "error" ? styles.statusError : styles.statusSuccess}`} role={status.type === "error" ? "alert" : "status"}>{status.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}<span>{status.message}</span></div>}

            <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? <><Loader2 size={18} className={styles.spin} /> Ativando...</> : <>Ativar produto gratuitamente <ArrowRight size={18} /></>}</button>
          </form>
        </div>
      </section>
    </div>
  );
}
