"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { resendConfirmationAction } from "@/app/actions/authActions";

import styles from "./Login.module.css";

const initialForm = {
  email: "",
  senha: "",
};

function getSafeRedirect(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/dashboard/cliente";
  }

  return value;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const sessionExpired =
    searchParams.get("expired") === "true";

  const trackId =
    searchParams.get("trackId");

  const redirectTo = getSafeRedirect(
    searchParams.get("redirectTo"),
  );

  const [formData, setFormData] =
    useState(initialForm);

  const [activeTab, setActiveTab] =
    useState("individual");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState("");

  const [successMsg, setSuccessMsg] =
    useState("");

  const [resendMessage, setResendMessage] =
    useState("");

  const [canResendConfirmation, setCanResendConfirmation] =
    useState(false);

  const [oabError, setOabError] =
    useState(false);

  const [
    showEnterpriseModal,
    setShowEnterpriseModal,
  ] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem(
      "advogadoMesShown",
    );
  }, []);

  useEffect(() => {
    if (
      searchParams.get("oab_error") ===
      "true"
    ) {
      setOabError(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const modalOpen =
      oabError || showEnterpriseModal;

    if (!modalOpen) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOabError(false);
        setShowEnterpriseModal(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [oabError, showEnterpriseModal]);

  function updateField(name, value) {
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleChange(event) {
    const { name, value } =
      event.target;

    updateField(name, value);

    setErrorMsg("");
    setSuccessMsg("");
    setResendMessage("");
    setCanResendConfirmation(false);
  }

  function changeTab(tab) {
    setActiveTab(tab);
    setErrorMsg("");
    setSuccessMsg("");
    setResendMessage("");
    setCanResendConfirmation(false);
  }

  function validateForm() {
    const normalizedEmail =
      formData.email.trim();

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      return "Informe um endereço de e-mail válido.";
    }

    if (!formData.senha) {
      return "Informe sua senha.";
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
    setResendMessage("");
    setCanResendConfirmation(false);

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);

    const endpoint =
      activeTab === "escritorios"
        ? "/api/auth/login-escritorio"
        : "/api/auth/login";

    try {
      const response = await fetch(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email: formData.email
              .trim()
              .toLowerCase(),
            password: formData.senha,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok || !data?.success) {
        if (
          data?.type === "OAB_ERROR"
        ) {
          setOabError(true);
          return;
        }

        if (
          data?.code ===
          "EMAIL_NOT_CONFIRMED"
        ) {
          setCanResendConfirmation(true);
        }

        setErrorMsg(
          data?.message ||
            "Não foi possível realizar o login. Verifique suas credenciais.",
        );

        return;
      }

      setSuccessMsg(
        "Login realizado. Redirecionando...",
      );

      const userRole =
        data.user?.role || "CLIENT";

      const cargo =
        data.user?.cargo || null;

      const needsPasswordUpdate =
        data.user
          ?.needsPasswordUpdate === true;

      window.setTimeout(() => {
        if (needsPasswordUpdate) {
          router.push(
            "/atualizar-senha",
          );

          return;
        }

        if (
          activeTab === "escritorios"
        ) {
          if (cargo === "advogado") {
            router.push(
              "/dashboard/advogado",
            );
          } else {
            router.push(
              "/dashboard/escritorio",
            );
          }

          return;
        }

        if (userRole === "ADMIN") {
          router.push(
            "/dashboard/admin",
          );

          return;
        }

        if (cargo === "secretaria") {
          router.push(
            "/dashboard/escritorio",
          );

          return;
        }

        if (userRole === "LAWYER") {
          router.push(
            "/dashboard/advogado",
          );

          return;
        }

        if (userRole === "ORACULO") {
          router.push(
            "/oraculoacademico/painel",
          );

          return;
        }

        let target = redirectTo;

        if (trackId) {
          const separator =
            target.includes("?")
              ? "&"
              : "?";

          target += `${separator}trackId=${encodeURIComponent(
            trackId,
          )}`;
        }

        router.push(target);
      }, 900);
    } catch (error) {
      console.error(
        "[Login] Erro ao autenticar:",
        error,
      );

      setErrorMsg(
        "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (
      resending ||
      !formData.email.trim()
    ) {
      return;
    }

    setResending(true);
    setResendMessage("");
    setErrorMsg("");

    try {
      const response =
        await resendConfirmationAction(
          formData.email,
        );

      if (!response.success) {
        setErrorMsg(response.message);
        return;
      }

      setResendMessage(
        response.message,
      );
    } catch (error) {
      console.error(
        "[Login] Erro ao reenviar:",
        error,
      );

      setErrorMsg(
        "Não foi possível reenviar o e-mail agora.",
      );
    } finally {
      setResending(false);
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
          prefetch={false}
          href="/"
          className={styles.backButton}
        >
          <ArrowLeft
            size={19}
            aria-hidden="true"
          />

          Voltar para a Home
        </Link>

        <div className={styles.leftContent}>
          <span className={styles.eyebrow}>
            Área de acesso
          </span>

          <h1 className={styles.leftTitle}>
            Continue sua jornada no
            <span className={styles.highlight}>
              {" "}
              Social Jurídico.
            </span>
          </h1>

          <p className={styles.leftDesc}>
            Acesse sua conta para acompanhar
            casos, conversas, clientes,
            oportunidades e ferramentas
            profissionais.
          </p>

          <div className={styles.trustList}>
            <div>
              <ShieldCheck
                size={20}
                aria-hidden="true"
              />

              <span>
                Autenticação e controle de
                sessão
              </span>
            </div>

            <div>
              <LockKeyhole
                size={20}
                aria-hidden="true"
              />

              <span>
                Acesso direcionado conforme o
                perfil
              </span>
            </div>

            <div>
              <BadgeCheck
                size={20}
                aria-hidden="true"
              />

              <span>
                Validação manual de perfis
                profissionais
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className={styles.rightSide}
      >
        <div className={styles.formContainer}>
          <Link
            prefetch={false}
            href="/"
            className={styles.logoMobileOnly}
          >
            <Scale
              size={28}
              aria-hidden="true"
            />

            Social Jurídico
          </Link>

          <div
            className={styles.tabContainer}
            role="tablist"
            aria-label="Tipo de acesso"
          >
            <button
              type="button"
              role="tab"
              aria-selected={
                activeTab === "individual"
              }
              className={`${styles.tab} ${
                activeTab === "individual"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() =>
                changeTab("individual")
              }
            >
              Acesso individual
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={
                activeTab === "escritorios"
              }
              className={`${styles.tab} ${
                activeTab === "escritorios"
                  ? styles.activeTab
                  : ""
              }`}
              onClick={() =>
                changeTab("escritorios")
              }
            >
              Escritório Enterprise
            </button>
          </div>

          <header className={styles.formHeader}>
            <span className={styles.eyebrow}>
              {activeTab === "escritorios"
                ? "Gestão de escritório"
                : "Bem-vindo de volta"}
            </span>

            <h1 className={styles.formTitle}>
              Acesse sua conta
            </h1>

            <p className={styles.formSubtitle}>
              {activeTab === "escritorios"
                ? "Entre com os dados vinculados ao seu escritório."
                : "Informe seu e-mail e sua senha para continuar."}
            </p>
          </header>

          {sessionExpired && (
            <div
              className={styles.warningMessage}
              role="status"
            >
              <AlertCircle
                size={18}
                aria-hidden="true"
              />

              <span>
                Sua sessão expirou por
                inatividade. Faça login
                novamente.
              </span>
            </div>
          )}

          {errorMsg && (
            <div
              className={styles.errorMessage}
              role="alert"
            >
              <AlertCircle
                size={18}
                aria-hidden="true"
              />

              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              className={styles.successMessage}
              role="status"
            >
              <CheckCircle2
                size={18}
                aria-hidden="true"
              />

              <span>{successMsg}</span>
            </div>
          )}

          {resendMessage && (
            <div
              className={styles.successMessage}
              role="status"
            >
              <Mail
                size={18}
                aria-hidden="true"
              />

              <span>{resendMessage}</span>
            </div>
          )}

          {canResendConfirmation && (
            <div
              className={
                styles.resendConfirmationBox
              }
            >
              <div>
                <strong>
                  Não recebeu o e-mail?
                </strong>

                <p>
                  Verifique Spam, Promoções e
                  Lixeira ou solicite um novo
                  link.
                </p>
              </div>

              <button
                type="button"
                className={styles.resendButton}
                onClick={
                  handleResendConfirmation
                }
                disabled={resending}
              >
                {resending ? (
                  <>
                    <Loader2
                      size={17}
                      className={styles.spinner}
                      aria-hidden="true"
                    />

                    Reenviando...
                  </>
                ) : (
                  "Reenviar confirmação"
                )}
              </button>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={styles.form}
            noValidate
          >
            <div className={styles.formGroup}>
              <label
                htmlFor="login-email"
                className={styles.label}
              >
                E-mail
              </label>

              <input
                id="login-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={styles.input}
                placeholder="seu@email.com"
                autoComplete="email"
                inputMode="email"
                maxLength={160}
                required
                disabled={loading}
              />
            </div>

            <div className={styles.formGroup}>
              <label
                htmlFor="login-senha"
                className={styles.label}
              >
                Senha
              </label>

              <div
                className={
                  styles.passwordField
                }
              >
                <input
                  id="login-senha"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="senha"
                  value={formData.senha}
                  onChange={handleChange}
                  className={styles.input}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() =>
                    setShowPassword(
                      (current) => !current,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                      aria-hidden="true"
                    />
                  ) : (
                    <Eye
                      size={18}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>
            </div>

            <div className={styles.optionsRow}>
              <span
                className={
                  styles.securityNotice
                }
              >
                <LockKeyhole
                  size={14}
                  aria-hidden="true"
                />

                Acesso protegido
              </span>

              <Link
                prefetch={false}
                href="/login/esqueci-senha"
                className={
                  styles.forgotPassword
                }
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2
                    className={styles.spinner}
                    size={19}
                    aria-hidden="true"
                  />

                  Entrando...
                </>
              ) : (
                "Entrar na plataforma"
              )}
            </button>

            <div className={styles.loginHint}>
              Ainda não possui uma conta?{" "}
              {activeTab ===
              "escritorios" ? (
                <button
                  type="button"
                  onClick={() =>
                    setShowEnterpriseModal(
                      true,
                    )
                  }
                  className={styles.linkButton}
                >
                  Conhecer o Enterprise
                </button>
              ) : (
                <Link
                  prefetch={false}
                  href="/cadastro"
                  className={styles.linkTag}
                >
                  Criar conta gratuitamente
                </Link>
              )}
            </div>
          </form>
        </div>
      </section>

      {oabError && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setOabError(false);
            }
          }}
        >
          <section
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="oab-modal-title"
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={() =>
                setOabError(false)
              }
              aria-label="Fechar"
            >
              <X
                size={20}
                aria-hidden="true"
              />
            </button>

            <div
              className={
                styles.modalIconError
              }
              aria-hidden="true"
            >
              <AlertCircle size={30} />
            </div>

            <h2 id="oab-modal-title">
              Acesso temporariamente restrito
            </h2>

            <p>
              A validação da sua OAB apresentou
              uma inconsistência ou não foi
              concluída dentro do prazo.
            </p>

            <p className={styles.modalSubtext}>
              Entre em contato com a equipe do
              Social Jurídico para verificar sua
              situação cadastral.
            </p>

            <a
              href="https://wa.me/5515981657317?text=Ol%C3%A1%2C%20tive%20um%20problema%20com%20a%20valida%C3%A7%C3%A3o%20da%20minha%20OAB%20no%20Social%20Jur%C3%ADdico%20e%20gostaria%20de%20regularizar."
              target="_blank"
              rel="noopener noreferrer"
              className={styles.primaryModalAction}
            >
              Falar pelo WhatsApp
            </a>

            <button
              type="button"
              onClick={() =>
                setOabError(false)
              }
              className={
                styles.secondaryModalAction
              }
            >
              Fechar
            </button>
          </section>
        </div>
      )}

      {showEnterpriseModal && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowEnterpriseModal(false);
            }
          }}
        >
          <section
            className={styles.modalCard}
            role="dialog"
            aria-modal="true"
            aria-labelledby="enterprise-modal-title"
          >
            <button
              type="button"
              className={styles.modalClose}
              onClick={() =>
                setShowEnterpriseModal(false)
              }
              aria-label="Fechar"
            >
              <X
                size={20}
                aria-hidden="true"
              />
            </button>

            <div
              className={
                styles.modalIconEnterprise
              }
              aria-hidden="true"
            >
              <Building2 size={30} />
            </div>

            <h2 id="enterprise-modal-title">
              Social Jurídico Enterprise
            </h2>

            <p>
              Estruture a operação do seu
              escritório com gestão centralizada,
              usuários, cotas e ferramentas
              profissionais.
            </p>

            <div
              className={
                styles.enterpriseContacts
              }
            >
              <a
                href="https://wa.me/5515981657317?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20o%20Social%20Jur%C3%ADdico%20Enterprise."
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp: (15) 98165-7317
              </a>

              <a
                href="https://wa.me/5515992653066?text=Ol%C3%A1%2C%20gostaria%20de%20conhecer%20o%20Social%20Jur%C3%ADdico%20Enterprise."
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp: (15) 99265-3066
              </a>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowEnterpriseModal(false)
              }
              className={
                styles.secondaryModalAction
              }
            >
              Fechar
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.loadingPage}>
          <Loader2
            size={36}
            className={styles.spinner}
            aria-label="Carregando login"
          />
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}