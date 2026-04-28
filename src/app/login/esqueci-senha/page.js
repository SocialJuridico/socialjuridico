"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Scale, Loader2, Mail, CheckCircle2 } from "lucide-react";
import styles from "../Login.module.css";
import { forgotPasswordAction } from "@/app/actions/authActions";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const response = await forgotPasswordAction(email);
      if (response.success) {
        setSuccessMsg(response.message);
      } else {
        setErrorMsg(response.message);
      }
    } catch (error) {
      setErrorMsg("Erro ao processar solicitação. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* LADO ESQUERDO: Branding */}
      <div className={styles.leftSide}>
        <div className={styles.leftPattern}></div>

        <Link prefetch={false} href="/login" className={styles.backButton}>
          <ArrowLeft size={20} />
          Voltar ao Login
        </Link>

        <div className={styles.leftContent}>
          <h1 className={styles.leftTitle}>
            Recupere seu <br />
            <span style={{ color: "var(--color-gold)" }}>Acesso</span>
          </h1>
          <p className={styles.leftDesc}>
            Não se preocupe! Acontece com os melhores. Informe seu email e 
            enviaremos um link seguro para você redefinir sua senha.
          </p>
        </div>
      </div>

      {/* LADO DIREITO: Formulario */}
      <div className={styles.rightSide}>
        <div className={styles.formContainer}>
          <Link prefetch={false} href="/" className={styles.logoMobileOnly}>
            <Scale size={28} />
            SocialJurídico
          </Link>

          {!successMsg ? (
            <>
              <div className={styles.formHeader}>
                <h2 className={styles.formTitle}>Esqueceu a senha?</h2>
                <p className={styles.formSubtitle}>
                  Enviaremos as instruções de recuperação por email.
                </p>
              </div>

              {errorMsg && (
                <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#EF4444", padding: "14px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.9rem", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  🚨 {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email cadastrado</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    placeholder="exemplo@email.com"
                    required
                  />
                </div>

                <button type="submit" className={styles.submitBtn} disabled={loading}>
                  {loading ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                      <Loader2 className="animate-spin" size={20} />
                      Enviando...
                    </div>
                  ) : (
                    "Enviar instruções"
                  )}
                </button>

                <div className={styles.loginHint}>
                  Lembrou a senha? <Link prefetch={false} href="/login" className={styles.linkTag}>Fazer login</Link>
                </div>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ color: 'var(--color-gold)', marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <CheckCircle2 size={64} />
              </div>
              <h2 className={styles.formTitle}>Verifique seu email</h2>
              <p className={styles.formSubtitle} style={{ marginBottom: '32px' }}>
                {successMsg}
              </p>
              <Link prefetch={false} href="/login" className={styles.submitBtn} style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                Voltar para o Login
              </Link>
              <p className={styles.loginHint} style={{ marginTop: '32px' }}>
                Não recebeu o email? Verifique a pasta de Spam ou <span onClick={() => setSuccessMsg("")} style={{ color: 'var(--color-gold)', cursor: 'pointer', fontWeight: 'bold' }}>tente novamente</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
