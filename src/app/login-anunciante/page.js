"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Megaphone,
  Scale,
  ShieldCheck,
} from "lucide-react";

import styles from "./LoginAnunciante.module.css";

const initialForm = {
  usuario: "",
  senha: "",
};

export default function LoginAnunciantePage() {
  const router = useRouter();

  const [formData, setFormData] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setErrorMsg("");
    setSuccessMsg("");
  }

  function validateForm() {
    const username = formData.usuario.trim();

    if (!username) {
      return "Informe seu nome de usuário.";
    }

    if (username.length > 80) {
      return "O nome de usuário informado é inválido.";
    }

    if (!formData.senha) {
      return "Informe sua senha.";
    }

    if (formData.senha.length > 128) {
      return "A senha informada é inválida.";
    }

    return null;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    const validationError = validateForm();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/anunciante", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario: formData.usuario.trim().toLowerCase(),
          senha: formData.senha,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        setErrorMsg(
          data?.message ||
            "Não foi possível realizar o acesso. Verifique suas credenciais.",
        );

        return;
      }

      setSuccessMsg("Acesso autorizado. Redirecionando...");

      window.setTimeout(() => {
        router.push("/dashboard/anunciante");
      }, 900);
    } catch (error) {
      console.error("[Login anunciante] Erro:", error);

      setErrorMsg(
        "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.pageWrapper}>
      <section className={styles.leftSide}>
        <div
          className={styles.leftPattern}
          aria-hidden="true"
        />

        <Link
          href="/"
          prefetch={false}
          className={styles.backButton}
        >
          <ArrowLeft size={19} aria-hidden="true" />
          Voltar para a Home
        </Link>

        <div className={styles.leftContent}>
          <div className={styles.portalBadge}>
            <Megaphone size={16} aria-hidden="true" />
            Portal do anunciante
          </div>

          <h1 className={styles.leftTitle}>
            Apresente seus serviços para profissionais do
            <span className={styles.highlight}>
              {" "}
              setor jurídico.
            </span>
          </h1>

          <p className={styles.leftDescription}>
            Gerencie seus anúncios, acompanhe sua presença na
            plataforma e mantenha seus dados comerciais atualizados.
          </p>

          <div className={styles.trustList}>
            <div>
              <BriefcaseBusiness
                size={20}
                aria-hidden="true"
              />

              <span>
                Área exclusiva para anunciantes autorizados
              </span>
            </div>

            <div>
              <ShieldCheck
                size={20}
                aria-hidden="true"
              />

              <span>
                Sessão protegida e acesso individual
              </span>
            </div>

            <div>
              <LockKeyhole
                size={20}
                aria-hidden="true"
              />

              <span>
                Credenciais fornecidas pela administração
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.rightSide}>
        <div className={styles.formContainer}>
          <Link
            href="/"
            prefetch={false}
            className={styles.mobileLogo}
          >
            <Scale size={28} aria-hidden="true" />
            Social Jurídico
          </Link>

          <header className={styles.formHeader}>
            <span className={styles.eyebrow}>
              Acesso comercial
            </span>

            <h1 className={styles.formTitle}>
              Portal do anunciante
            </h1>

            <p className={styles.formSubtitle}>
              Entre com as credenciais fornecidas pela equipe do
              Social Jurídico.
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

          {successMsg && (
            <div
              className={styles.successMessage}
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              <span>{successMsg}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={styles.form}
            noValidate
          >
            <div className={styles.formGroup}>
              <label
                htmlFor="advertiser-username"
                className={styles.label}
              >
                Nome de usuário
              </label>

              <input
                id="advertiser-username"
                type="text"
                name="usuario"
                value={formData.usuario}
                onChange={handleChange}
                className={styles.input}
                placeholder="Seu nome de usuário"
                autoComplete="username"
                maxLength={80}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label
                htmlFor="advertiser-password"
                className={styles.label}
              >
                Senha
              </label>

              <div className={styles.passwordField}>
                <input
                  id="advertiser-password"
                  type={showPassword ? "text" : "password"}
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  maxLength={128}
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() =>
                    setShowPassword((current) => !current)
                  }
                  aria-label={
                    showPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className={styles.securityNotice}>
              <LockKeyhole size={15} aria-hidden="true" />

              <span>
                Sua sessão permanecerá ativa por até oito horas.
              </span>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || Boolean(successMsg)}
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className={styles.spinner}
                    aria-hidden="true"
                  />
                  Verificando acesso...
                </>
              ) : (
                "Acessar painel"
              )}
            </button>
          </form>

          <div className={styles.commercialContact}>
            <strong>
              Ainda não possui acesso de anunciante?
            </strong>

            <p>
              Fale com a equipe comercial para conhecer as opções
              de divulgação.
            </p>

            <div className={styles.contactActions}>
              <a
                href="https://wa.me/5515981657317?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20as%20op%C3%A7%C3%B5es%20para%20anunciar%20no%20Social%20Jur%C3%ADdico."
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp: (15) 98165-7317
              </a>

              <a
                href="https://wa.me/5515992653066?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20as%20op%C3%A7%C3%B5es%20para%20anunciar%20no%20Social%20Jur%C3%ADdico."
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp: (15) 99265-3066
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}