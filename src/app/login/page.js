"use client";

import { useState, Suspense, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Scale, Loader2, AlertCircle } from "lucide-react";
import styles from "./Login.module.css";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("expired") === "true";
  const trackId = searchParams.get("trackId");
  const redirectTo = searchParams.get("redirectTo");
  const [oabError, setOabError] = useState(false);
  const [activeTab, setActiveTab] = useState("individual"); // "individual" ou "escritorios"
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  useEffect(() => {
    // Limpar o flag do popup de Advogado do Mês ao carregar a tela de login
    // Isso garante que ele apareça novamente após o login ser efetuado.
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("advogadoMesShown");
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("oab_error") === "true") {
      setOabError(true);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    email: "",
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

    const endpoint = activeTab === "escritorios" ? "/api/auth/login-escritorio" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, password: formData.senha }),
      });
      const response = await res.json();

      if (response.success) {
        setSuccessMsg("Login realizado com sucesso! Redirecionando...");

        setTimeout(() => {
          const role = response.user?.role || "CLIENT";
          const cargo = response.user?.cargo || null;
          const needsUpdate = response.user?.needsPasswordUpdate === true;

          if (needsUpdate) {
            router.push("/atualizar-senha");
          } else {
            if (activeTab === "escritorios") {
              if (cargo === "advogado") {
                router.push("/dashboard/advogado");
              } else {
                router.push("/dashboard/escritorio");
              }
            } else {
              if (role === "ADMIN") router.push("/dashboard/admin");
              else if (cargo === "secretaria") router.push("/dashboard/escritorio");
              else if (role === "LAWYER") router.push("/dashboard/advogado");
              else {
                let redirectTarget = redirectTo || "/dashboard/cliente";
                if (trackId) {
                  redirectTarget += (redirectTarget.includes("?") ? "&" : "?") + `trackId=${trackId}`;
                }
                router.push(redirectTarget);
              }
            }
          }
        }, 1500);
      } else {
        if (response.type === "OAB_ERROR") {
          setOabError(true);
        } else {
          setErrorMsg(
            response.message ||
              "Erro ao realizar login. Verifique suas credenciais.",
          );
        }
        setLoading(false);
      }
    } catch (err) {
      console.error("Erro ao autenticar:", err);
      setErrorMsg("Erro de rede ao autenticar. Tente novamente.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* LADO ESQUERDO: Branding (Mesmo do Cadastro) */}
      <div className={styles.leftSide}>
        <div className={styles.leftPattern}></div>

        <Link prefetch={false} href="/" className={styles.backButton}>
          <ArrowLeft size={20} />
          Voltar a Home
        </Link>

        <div className={styles.leftContent}>
          <h1 className={styles.leftTitle}>
            Bem-vindo de volta ao <br />
            <span style={{ color: "var(--color-gold)" }}>SocialJurídico</span>
          </h1>
          <p className={styles.leftDesc}>
            Acesse sua conta para continuar gerenciando seus casos, conversando
            com advogados ou acompanhando seus clientes.
          </p>

          <div className={styles.usersProof}>
            <div className={styles.avatars}>
              <div className={styles.avatar}>RC</div>
              <div className={styles.avatar}>JS</div>
              <div className={styles.avatar}>AL</div>
            </div>
            <span className={styles.proofText}>Junte-se a +1.000 usuários</span>
          </div>
        </div>
      </div>

      {/* LADO DIREITO: Formulario de Login */}
      <div className={`${styles.rightSide} ${activeTab === "escritorios" ? styles.escritorioBg : ""}`}>
        <div className={styles.formContainer}>
          <Link prefetch={false} href="/" className={styles.logoMobileOnly}>
            <Scale size={28} />
            SocialJurídico
          </Link>

          {/* Abas de Login */}
          <div className={styles.tabContainer}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "individual" ? styles.activeTab : ""}`}
              onClick={() => {
                setActiveTab("individual");
                setErrorMsg("");
              }}
            >
              Profissional / Individual
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === "escritorios" ? styles.activeTabEscritorio : ""}`}
              onClick={() => {
                setActiveTab("escritorios");
                setErrorMsg("");
              }}
            >
              Escritórios (Enterprise)
            </button>
          </div>

          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Acesse sua conta</h2>
            <p className={styles.formSubtitle}>
              {activeTab === "escritorios" 
                ? "Painel de Gestão do seu Escritório Enterprise." 
                : "Digite seu email e senha para entrar."}
            </p>
          </div>
          {/* Banner de sessão expirada */}
          {sessionExpired && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(234, 179, 8, 0.08)",
                border: "1px solid rgba(234, 179, 8, 0.3)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "8px",
                color: "#eab308",
                fontSize: "0.88rem",
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              Sua sessão expirou após 4 horas de inatividade. Por segurança,
              faça login novamente.
            </div>
          )}

          {/* Mensagem de erro */}
          {errorMsg && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "12px",
                padding: "14px 18px",
                marginBottom: "8px",
                color: "#ef4444",
                fontSize: "0.88rem",
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="seu@email.com"
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

            <div className={styles.optionsRow}>
              <div className={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  id="remember"
                />
                <label htmlFor="remember" className={styles.checkboxLabel}>
                  Lembrar-me
                </label>
              </div>

              <Link prefetch={false} href="/login/esqueci-senha" className={styles.forgotPassword}>
                Esqueceu sua senha?
              </Link>
            </div>

            {/* SUCCESS MESSAGES */}
            {successMsg && (
              <div
                style={{
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  color: "#10B981",
                  padding: "12px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                }}
              >
                ✅ {successMsg}
              </div>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Loader2 className="animate-spin" size={20} />
                  Entrando...
                </div>
              ) : (
                "Entrar na plataforma"
              )}
            </button>

            <div className={styles.loginHint}>
              Ainda não tem uma conta?{" "}
              {activeTab === "escritorios" ? (
                <button
                  type="button"
                  onClick={() => setShowEnterpriseModal(true)}
                  className={styles.linkTag}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    font: "inherit",
                    cursor: "pointer",
                    color: "#00b4d8"
                  }}
                >
                  Traga seu escritório
                </button>
              ) : (
                <Link prefetch={false} href="/cadastro" className={styles.linkTag}>
                  Cadastre-se grátis
                </Link>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* OAB ERROR MODAL */}
      {oabError && (
        <div className={styles.oabModalOverlay}>
          <div className={styles.oabModalCard}>
            <AlertCircle size={48} color="#ef4444" />
            <h3>Acesso Restrito</h3>
            <p>
              Sua verificação de OAB apresentou inconsistências. Para sua segurança e conformidade da plataforma, seu acesso foi temporariamente suspenso.
            </p>
            <p className={styles.oabModalSub}>
              Clique no botão abaixo para falar com nosso suporte e regularizar sua situação.
            </p>
            
            <a 
              href="https://wa.me/5515981657317?text=Olá, tive um problema com a verificação da minha OAB no SocialJurídico e gostaria de regularizar." 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.supportBtn}
            >
              Falar com Suporte no WhatsApp
            </a>
            
            <button onClick={() => setOabError(false)} className={styles.closeBtn}>
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ENTERPRISE CONTACT SUPPORT MODAL */}
      {showEnterpriseModal && (
        <div className={styles.oabModalOverlay}>
          <div className={styles.oabModalCard} style={{ borderColor: "rgba(0, 180, 216, 0.4)" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "rgba(0, 180, 216, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px"
            }}>
              <Scale size={32} color="#00b4d8" />
            </div>
            <h3 style={{ color: "#fff", fontWeight: 800 }}>SocialJurídico Enterprise</h3>
            <p>
              Para implantar e configurar a infraestrutura de gerenciamento corporativo no seu escritório, entre em contato com nosso atendimento especializado.
            </p>
            <p className={styles.oabModalSub}>
              Um consultor irá desenhar a topologia de limites e migração ideal para a sua equipe.
            </p>
            
            <a 
              href="https://wa.me/5515981657317?text=Olá,%20gostaria%20de%20saber%20mais%20sobre%20a%20implantação%20do%20plano%20Enterprise%20do%20SocialJurídico%20para%20o%20meu%20escritório." 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.supportBtn}
              style={{
                background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)",
                boxShadow: "0 4px 15px rgba(0, 180, 216, 0.3)"
              }}
            >
              Falar com um Especialista
            </a>
            
            <button onClick={() => setShowEnterpriseModal(false)} className={styles.closeBtn}>
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Login() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            color: "#D4AF37",
          }}
        >
          <Loader2 className="animate-spin" size={48} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
