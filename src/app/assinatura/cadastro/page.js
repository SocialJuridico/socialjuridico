"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileSignature,
  Loader2,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import styles from "../auth.module.css";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  termsAccepted: false,
  privacyAccepted: false,
  website: "",
};

export default function SignatureSignupPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });
  const [registeredEmail, setRegisteredEmail] = useState("");

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    setStatus({ type: "idle", message: "" });
  }

  function validate() {
    if (form.name.trim().length < 3) return "Informe seu nome completo.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Informe um e-mail válido.";
    if (form.password.length < 10) return "A senha deve possuir pelo menos 10 caracteres.";
    if (!/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password)) {
      return "Use uma letra maiúscula, uma minúscula e um número na senha.";
    }
    if (form.password !== form.confirmPassword) return "As senhas não conferem.";
    if (!form.termsAccepted || !form.privacyAccepted) return "Aceite os Termos de Uso e a Política de Privacidade.";
    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setStatus({ type: "error", message: validationError });
      return;
    }

    setLoading(true);
    setStatus({ type: "idle", message: "" });

    try {
      const response = await fetch("/api/assinatura/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
          termsAccepted: form.termsAccepted,
          privacyAccepted: form.privacyAccepted,
          website: form.website,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        setStatus({ type: "error", message: data?.message || "Não foi possível criar sua conta." });
        return;
      }

      if (data.activated) {
        setStatus({ type: "success", message: "Módulo ativado. Redirecionando..." });
        window.setTimeout(() => router.push(data.redirectTo || "/assinatura/app"), 700);
        return;
      }

      setRegisteredEmail(form.email.trim().toLowerCase());
      setStatus({ type: "success", message: data.message || "Conta criada com sucesso." });
    } catch {
      setStatus({ type: "error", message: "Não foi possível conectar ao servidor. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  if (registeredEmail) {
    return (
      <div className={styles.authPage}>
        <section className={styles.successPanel} aria-live="polite">
          <Link href="/assinatura" className={styles.brand}>
            <span><Scale size={23} /></span> Social Jurídico <strong>Assinatura</strong>
          </Link>
          <div className={styles.successIcon}><CheckCircle2 size={42} /></div>
          <h1>Confirme seu e-mail</h1>
          <p>Enviamos o link de ativação para:</p>
          <strong className={styles.registeredEmail}>{registeredEmail}</strong>
          <p className={styles.mutedText}>Depois da confirmação, você poderá entrar e usar seus 3 documentos gratuitos do mês.</p>
          <Link href="/assinatura/entrar" className={styles.primaryButton}>Ir para o login <ArrowRight size={18} /></Link>
          <button type="button" className={styles.textButton} onClick={() => { setRegisteredEmail(""); setStatus({ type: "idle", message: "" }); }}>Corrigir o e-mail</button>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.authPage}>
      <aside className={styles.authAside}>
        <Link href="/assinatura" className={styles.backLink}><ArrowLeft size={17} /> Voltar para Assinatura</Link>
        <div className={styles.asideContent}>
          <Link href="/assinatura" className={styles.brand}>
            <span><Scale size={23} /></span> Social Jurídico <strong>Assinatura</strong>
          </Link>
          <div className={styles.asideLabel}><ShieldCheck size={15} /> Plano gratuito</div>
          <h1>Comece com 3 documentos por mês.</h1>
          <p>Crie sua conta para preparar, enviar e acompanhar assinaturas eletrônicas em um ambiente separado da plataforma jurídica.</p>
          <ul>
            <li><Check size={17} /> Sem cobrança no plano gratuito</li>
            <li><Check size={17} /> Signatários não precisam criar conta</li>
            <li><Check size={17} /> Trilha de auditoria em cada documento</li>
          </ul>
        </div>
      </aside>

      <section className={styles.formSide}>
        <div className={styles.formWrap}>
          <div className={styles.mobileBrand}><Scale size={22} /> Social Jurídico <strong>Assinatura</strong></div>
          <span className={styles.formEyebrow}>Crie sua conta</span>
          <h2>Seus primeiros documentos são gratuitos.</h2>
          <p className={styles.formIntro}>Já usa o Social Jurídico? Informe o mesmo e-mail e senha para ativar este produto sem criar outra conta.</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="signature-name">Nome completo</label>
              <div className={styles.inputWrap}><UserRound size={18} /><input id="signature-name" name="name" autoComplete="name" maxLength={120} value={form.name} onChange={updateField} placeholder="Seu nome completo" disabled={loading} /></div>
            </div>
            <div className={styles.field}>
              <label htmlFor="signature-email">E-mail</label>
              <div className={styles.inputWrap}><Mail size={18} /><input id="signature-email" name="email" type="email" autoComplete="email" maxLength={320} value={form.email} onChange={updateField} placeholder="voce@empresa.com.br" disabled={loading} /></div>
            </div>
            <div className={styles.field}>
              <label htmlFor="signature-phone">WhatsApp <span>opcional</span></label>
              <div className={styles.inputWrap}><FileSignature size={18} /><input id="signature-phone" name="phone" type="tel" autoComplete="tel" maxLength={30} value={form.phone} onChange={updateField} placeholder="(15) 99999-9999" disabled={loading} /></div>
            </div>
            <div className={styles.fieldsRow}>
              <div className={styles.field}>
                <label htmlFor="signature-password">Senha</label>
                <div className={styles.inputWrap}><LockKeyhole size={18} /><input id="signature-password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={128} value={form.password} onChange={updateField} placeholder="Mínimo de 10 caracteres" disabled={loading} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
              </div>
              <div className={styles.field}>
                <label htmlFor="signature-confirm-password">Confirmar senha</label>
                <div className={styles.inputWrap}><LockKeyhole size={18} /><input id="signature-confirm-password" name="confirmPassword" type={showPassword ? "text" : "password"} autoComplete="new-password" maxLength={128} value={form.confirmPassword} onChange={updateField} placeholder="Repita sua senha" disabled={loading} /></div>
              </div>
            </div>

            <div className={styles.honeypot} aria-hidden="true"><label htmlFor="signature-website">Website</label><input id="signature-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={updateField} /></div>

            <div className={styles.consents}>
              <label><input name="termsAccepted" type="checkbox" checked={form.termsAccepted} onChange={updateField} /><span>Aceito os <Link href="/termos" target="_blank">Termos de Uso</Link>.</span></label>
              <label><input name="privacyAccepted" type="checkbox" checked={form.privacyAccepted} onChange={updateField} /><span>Li e aceito a <Link href="/privacidade" target="_blank">Política de Privacidade</Link>.</span></label>
            </div>

            {status.type !== "idle" && <div className={`${styles.status} ${status.type === "error" ? styles.statusError : styles.statusSuccess}`} role={status.type === "error" ? "alert" : "status"}>{status.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}<span>{status.message}</span></div>}

            <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? <><Loader2 size={18} className={styles.spin} /> Criando conta...</> : <>Comece gratuitamente <ArrowRight size={18} /></>}</button>
          </form>

          <p className={styles.switchAuth}>Já possui uma conta? <Link href="/assinatura/entrar">Entrar</Link></p>
        </div>
      </section>
    </div>
  );
}
