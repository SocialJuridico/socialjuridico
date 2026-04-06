"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, AlertCircle, Zap } from "lucide-react";
import styles from "../login/Login.module.css";
import { useRouter } from "next/navigation";

export default function LoginAnunciante() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();

  const [formData, setFormData] = useState({
    usuario: "",
    senha: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/anunciante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const response = await res.json();

      if (response.success) {
        setSuccessMsg("Login realizado! Redirecionando...");
        setTimeout(() => {
          router.push("/dashboard/anunciante");
        }, 1500);
      } else {
        setErrorMsg(response.message || "Credenciais inválidas.");
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg("Erro na conexão com o servidor.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* LEFT SIDE */}
      <div className={styles.leftSide} style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #151525 100%)" }}>
        <div className={styles.leftPattern}></div>
        <Link href="/" className={styles.backButton}>
          <ArrowLeft size={20} /> Voltar a Home
        </Link>
        <div className={styles.leftContent}>
          <div style={{ background: "rgba(212, 175, 55, 0.15)", color: "#d4af37", padding: "8px 16px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "20px", fontWeight: 800, fontSize: "0.75rem", letterSpacing: "1px", border: "1px solid rgba(212, 175, 55, 0.3)" }}>
            <Zap size={14} fill="#d4af37" /> PORTAL DO ANUNCIANTE
          </div>
          <h1 className={styles.leftTitle}>
            Sua vitrine para <br />
            <span style={{ color: "var(--color-gold)" }}>Advogados</span>
          </h1>
          <p className={styles.leftDesc}>
            Seja encontrado por milhares de advogados que buscam prepostos, diligências e serviços técnicos especializados em todo o Brasil.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className={styles.rightSide}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Acesso Restrito</h2>
            <p className={styles.formSubtitle}>Entre com as credenciais fornecidas pela administração.</p>
          </div>

          {errorMsg && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", padding: "16px", marginBottom: "20px", color: "#ef4444", fontSize: "0.9rem", fontWeight: 600 }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} /> {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nome de Usuário</label>
              <input
                type="text"
                name="usuario"
                value={formData.usuario}
                onChange={handleChange}
                className={styles.input}
                placeholder="john_doe"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Senha</label>
              <input
                type="password"
                name="senha"
                value={formData.senha}
                onChange={handleChange}
                className={styles.input}
                placeholder="********"
                required
              />
            </div>

            {successMsg && (
                <div style={{ backgroundColor: "rgba(16,185,129,0.15)", color: "#10B981", padding: "14px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.9rem", fontWeight: "bold", textAlign: "center" }}>
                    ✅ {successMsg}
                </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading} style={{ background: "linear-gradient(135deg, #d4af37 0%, #b8860b 100%)", color: "#000", fontWeight: 800 }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                  <Loader2 className="animate-spin" size={20} />
                  Verificando...
                </div>
              ) : "Acessar Painel"}
            </button>
          </form>
          
          <div style={{ marginTop: "30px", fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px" }}>
            Não tem uma conta de anunciante? <br />
            <a href="https://wa.me/5551993392983" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-gold)", fontWeight: 700, textDecoration: "none" }}>Fale com a Administração</a>
          </div>
        </div>
      </div>
    </div>
  );
}
