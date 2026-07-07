"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Scale,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  resendConfirmationAction,
  signUpAction,
} from "@/app/actions/authActions";
import {
  normalizeOABNumber,
  normalizeUF,
} from "@/lib/oab";

import styles from "./Cadastro.module.css";

const states = [
  ["AC", "Acre"],
  ["AL", "Alagoas"],
  ["AP", "Amapá"],
  ["AM", "Amazonas"],
  ["BA", "Bahia"],
  ["CE", "Ceará"],
  ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"],
  ["GO", "Goiás"],
  ["MA", "Maranhão"],
  ["MT", "Mato Grosso"],
  ["MS", "Mato Grosso do Sul"],
  ["MG", "Minas Gerais"],
  ["PA", "Pará"],
  ["PB", "Paraíba"],
  ["PR", "Paraná"],
  ["PE", "Pernambuco"],
  ["PI", "Piauí"],
  ["RJ", "Rio de Janeiro"],
  ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"],
  ["RO", "Rondônia"],
  ["RR", "Roraima"],
  ["SC", "Santa Catarina"],
  ["SP", "São Paulo"],
  ["SE", "Sergipe"],
  ["TO", "Tocantins"],
];

const initialForm = {
  nome: "",
  email: "",
  whatsapp: "",
  senha: "",
  confirmarSenha: "",
  oab: "",
  estado: "",
  origem_descoberta: "",
  termsAccepted: false,
};

function formatPhone(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length <= 2) {
    return numbers;
  }

  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }

  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(
      2,
      6,
    )}-${numbers.slice(6)}`;
  }

  return `(${numbers.slice(0, 2)}) ${numbers.slice(
    2,
    7,
  )}-${numbers.slice(7)}`;
}

function CadastroContent() {
  const searchParams = useSearchParams();

  const referralCode = searchParams.get("ref");
  const requestedProfile =
    searchParams.get("perfil");
  const requestedPlan =
    searchParams.get("plano");

  const [activeTab, setActiveTab] =
    useState("client");

  const [formData, setFormData] =
    useState(initialForm);

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState("");

  const [successMsg, setSuccessMsg] =
    useState("");

  const [resendMessage, setResendMessage] =
    useState("");

  const [registeredEmail, setRegisteredEmail] =
    useState("");

  const [registeredRole, setRegisteredRole] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  useEffect(() => {
    if (
      requestedProfile === "advogado" ||
      requestedPlan === "start" ||
      requestedPlan === "pro"
    ) {
      setActiveTab("lawyer");
    }
  }, [requestedProfile, requestedPlan]);

  const planLabel = useMemo(() => {
    if (requestedPlan === "start") {
      return "Plano Start";
    }

    if (requestedPlan === "pro") {
      return "Plano Pro";
    }

    return null;
  }, [requestedPlan]);

  function updateField(name, value) {
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleChange(event) {
    const { name, value, type, checked } =
      event.target;

    if (type === "checkbox") {
      updateField(name, checked);
      return;
    }

    if (name === "oab") {
      updateField(
        name,
        normalizeOABNumber(value),
      );
      return;
    }

    if (name === "estado") {
      updateField(
        name,
        normalizeUF(value),
      );
      return;
    }

    if (name === "whatsapp") {
      updateField(
        name,
        formatPhone(value),
      );
      return;
    }

    updateField(name, value);
  }

  function changeProfile(profile) {
    setActiveTab(profile);
    setErrorMsg("");
    setSuccessMsg("");
    setResendMessage("");

    if (profile === "client") {
      setFormData((current) => ({
        ...current,
        oab: "",
        estado: "",
      }));
    }
  }

  function validateForm() {
    if (formData.nome.trim().length < 3) {
      return "Informe seu nome completo.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email.trim(),
      )
    ) {
      return "Informe um endereço de e-mail válido.";
    }

    const phoneNumbers =
      formData.whatsapp.replace(/\D/g, "");

    if (
      phoneNumbers.length < 10 ||
      phoneNumbers.length > 11
    ) {
      return "Informe um número de WhatsApp válido.";
    }

    if (formData.senha.length < 8) {
      return "A senha deve possuir pelo menos oito caracteres.";
    }

    if (
      formData.senha !==
      formData.confirmarSenha
    ) {
      return "As senhas não conferem.";
    }

    if (
      activeTab === "lawyer" &&
      (!formData.estado ||
        formData.oab.length < 3)
    ) {
      return "Informe uma UF e um número de OAB válidos.";
    }

    if (!formData.origem_descoberta) {
      return "Informe onde conheceu o Social Jurídico.";
    }

    if (!formData.termsAccepted) {
      return "Você precisa aceitar os Termos de Uso e a Política de Privacidade.";
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

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setLoading(true);

    const normalizedEmail =
      formData.email.trim().toLowerCase();

    try {
      const response = await signUpAction({
        email: normalizedEmail,
        password: formData.senha,
        name: formData.nome.trim(),
        phone: formData.whatsapp,
        role:
          activeTab === "lawyer"
            ? "LAWYER"
            : "CLIENT",
        oab: formData.oab,
        estado: formData.estado,
        origem_descoberta:
          formData.origem_descoberta,
        referral_code: referralCode,
        requested_plan: requestedPlan,
      });

      if (!response.success) {
        setErrorMsg(
          response.message ||
            "Não foi possível concluir o cadastro.",
        );

        return;
      }

      setRegisteredEmail(normalizedEmail);
      setRegisteredRole(
        activeTab === "lawyer"
          ? "LAWYER"
          : "CLIENT",
      );

      setSuccessMsg(
        response.message ||
          "Conta criada com sucesso.",
      );

      setFormData(initialForm);
    } catch (error) {
      console.error(
        "[Cadastro] Erro:",
        error,
      );

      setErrorMsg(
        "Ocorreu um erro ao criar sua conta. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (!registeredEmail || resending) {
      return;
    }

    setResending(true);
    setResendMessage("");
    setErrorMsg("");

    try {
      const response =
        await resendConfirmationAction(
          registeredEmail,
        );

      if (!response.success) {
        setErrorMsg(response.message);
        return;
      }

      setResendMessage(response.message);
    } catch {
      setErrorMsg(
        "Não foi possível reenviar o e-mail agora.",
      );
    } finally {
      setResending(false);
    }
  }

  function resetRegistration() {
    setRegisteredEmail("");
    setRegisteredRole("");
    setSuccessMsg("");
    setResendMessage("");
    setErrorMsg("");
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
          className={styles.backButton}
        >
          <ArrowLeft size={19} aria-hidden="true" />
          Voltar para a Home
        </Link>

        <div className={styles.leftContent}>
          <span className={styles.eyebrow}>
            Social Jurídico
          </span>

          <h1 className={styles.leftTitle}>
            Crie sua conta e escolha como deseja
            utilizar a plataforma.
          </h1>

          <p className={styles.leftDesc}>
            Clientes podem publicar casos gratuitamente.
            Advogados acessam oportunidades e ferramentas
            profissionais conforme o plano contratado.
          </p>

          <div className={styles.trustList}>
            <div>
              <ShieldCheck size={20} aria-hidden="true" />

              <span>
                Dados tratados conforme nossa Política de
                Privacidade
              </span>
            </div>

            <div>
              <BadgeCheck size={20} aria-hidden="true" />

              <span>
                Perfis profissionais passam por validação
                manual
              </span>
            </div>

            <div>
              <UserRound size={20} aria-hidden="true" />

              <span>
                Você escolhe como deseja utilizar a plataforma
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.rightSide}>
        <div className={styles.formContainer}>
          <Link
            href="/"
            className={styles.logoMobileOnly}
          >
            <Scale size={28} aria-hidden="true" />
            Social Jurídico
          </Link>

          {successMsg ? (
            <section
              className={styles.successCard}
              aria-live="polite"
            >
              <div className={styles.successIcon}>
                <CheckCircle2
                  size={44}
                  aria-hidden="true"
                />
              </div>

              <h1>
                Verifique seu e-mail
              </h1>

              <p>
                Enviamos um link de confirmação para:
              </p>

              <strong className={styles.registeredEmail}>
                {registeredEmail}
              </strong>

              <p className={styles.successInstructions}>
                Abra a mensagem enviada pelo Social Jurídico
                e clique em “Confirmar minha conta”.
              </p>

              {registeredRole === "LAWYER" && (
                <div className={styles.lawyerNotice}>
                  Após confirmar o e-mail, siga as instruções
                  recebidas para concluir a validação manual
                  da sua OAB.
                </div>
              )}

              <div className={styles.emailTips}>
                <Mail size={18} aria-hidden="true" />

                <span>
                  Verifique também as pastas Spam,
                  Promoções e Lixeira.
                </span>
              </div>

              {resendMessage && (
                <div className={styles.successMessage}>
                  <CheckCircle2
                    size={17}
                    aria-hidden="true"
                  />

                  {resendMessage}
                </div>
              )}

              {errorMsg && (
                <div
                  className={styles.errorMessage}
                  role="alert"
                >
                  <AlertCircle
                    size={17}
                    aria-hidden="true"
                  />

                  {errorMsg}
                </div>
              )}

              <div className={styles.successActions}>
                <Link
                  href="/login"
                  className={styles.primaryButton}
                >
                  Ir para o login
                </Link>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={
                    handleResendConfirmation
                  }
                  disabled={resending}
                >
                  {resending ? (
                    <>
                      <Loader2
                        size={18}
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

              <button
                type="button"
                className={styles.newRegistrationButton}
                onClick={resetRegistration}
              >
                Fazer outro cadastro
              </button>
            </section>
          ) : (
            <>
              <header className={styles.formHeader}>
                <span className={styles.eyebrow}>
                  Criar conta
                </span>

                <h1 className={styles.formTitle}>
                  Comece no Social Jurídico
                </h1>

                <p className={styles.formSubtitle}>
                  Escolha seu perfil e preencha seus dados.
                </p>

                {planLabel && (
                  <div className={styles.planIntent}>
                    Interesse inicial: {planLabel}
                  </div>
                )}
              </header>

              <div
                className={styles.tabs}
                role="tablist"
                aria-label="Tipo de cadastro"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    activeTab === "client"
                  }
                  className={`${styles.tab} ${
                    activeTab === "client"
                      ? styles.tabActive
                      : ""
                  }`}
                  onClick={() =>
                    changeProfile("client")
                  }
                >
                  Sou cliente
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={
                    activeTab === "lawyer"
                  }
                  className={`${styles.tab} ${
                    activeTab === "lawyer"
                      ? styles.tabActive
                      : ""
                  }`}
                  onClick={() =>
                    changeProfile("lawyer")
                  }
                >
                  Sou advogado
                </button>
              </div>

              {activeTab === "lawyer" && (
                <div className={styles.professionalNotice}>
                  <BadgeCheck
                    size={18}
                    aria-hidden="true"
                  />

                  <p>
                    Seus dados profissionais serão conferidos
                    manualmente após a confirmação do e-mail.
                  </p>
                </div>
              )}

              <form
                className={styles.form}
                onSubmit={handleSubmit}
                noValidate
              >
                  <div className={styles.formGroup}>
                    <label
                      htmlFor="cadastro-nome"
                      className={styles.label}
                    >
                      Nome completo
                    </label>

                    <input
                      id="cadastro-nome"
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Seu nome completo"
                      autoComplete="name"
                      minLength={3}
                      maxLength={120}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label
                        htmlFor="cadastro-email"
                        className={styles.label}
                      >
                        E-mail
                      </label>

                      <input
                        id="cadastro-email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="seu@email.com"
                        autoComplete="email"
                        maxLength={160}
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label
                        htmlFor="cadastro-whatsapp"
                        className={styles.label}
                      >
                        WhatsApp
                      </label>

                      <input
                        id="cadastro-whatsapp"
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="(15) 99999-9999"
                        autoComplete="tel"
                        inputMode="tel"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {activeTab === "lawyer" && (
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label
                          htmlFor="cadastro-oab"
                          className={styles.label}
                        >
                          Número da OAB
                        </label>

                        <input
                          id="cadastro-oab"
                          type="text"
                          name="oab"
                          value={formData.oab}
                          onChange={handleChange}
                          className={styles.input}
                          placeholder="Somente números"
                          inputMode="numeric"
                          maxLength={10}
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className={styles.formGroup}>
                        <label
                          htmlFor="cadastro-estado"
                          className={styles.label}
                        >
                          Seccional
                        </label>

                        <select
                          id="cadastro-estado"
                          name="estado"
                          value={formData.estado}
                          onChange={handleChange}
                          className={styles.input}
                          required
                          disabled={loading}
                        >
                          <option value="">
                            Selecione
                          </option>

                          {states.map(([uf, name]) => (
                            <option key={uf} value={uf}>
                              {uf} — {name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label
                      htmlFor="cadastro-origem"
                      className={styles.label}
                    >
                      Onde conheceu o Social Jurídico?
                    </label>

                    <select
                      id="cadastro-origem"
                      name="origem_descoberta"
                      value={
                        formData.origem_descoberta
                      }
                      onChange={handleChange}
                      className={styles.input}
                      required
                      disabled={loading}
                    >
                      <option value="">
                        Selecione uma opção
                      </option>

                      <option value="Grupo do Facebook">
                        Grupo do Facebook
                      </option>

                      <option value="Instagram">
                        Instagram
                      </option>

                      <option value="LinkedIn">
                        LinkedIn
                      </option>

                      <option value="Pesquisa Google">
                        Pesquisa no Google
                      </option>

                      <option value="Indicação">
                        Indicação
                      </option>

                      <option value="Outro">
                        Outro
                      </option>
                    </select>
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label
                        htmlFor="cadastro-senha"
                        className={styles.label}
                      >
                        Senha
                      </label>

                      <div className={styles.passwordField}>
                        <input
                          id="cadastro-senha"
                          type={
                            showPassword
                              ? "text"
                              : "password"
                          }
                          name="senha"
                          value={formData.senha}
                          onChange={handleChange}
                          className={styles.input}
                          placeholder="Mínimo de 8 caracteres"
                          autoComplete="new-password"
                          minLength={8}
                          required
                          disabled={loading}
                        />

                        <button
                          type="button"
                          className={styles.passwordToggle}
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

                    <div className={styles.formGroup}>
                      <label
                        htmlFor="cadastro-confirmar-senha"
                        className={styles.label}
                      >
                        Confirmar senha
                      </label>

                      <input
                        id="cadastro-confirmar-senha"
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        name="confirmarSenha"
                        value={
                          formData.confirmarSenha
                        }
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="Repita a senha"
                        autoComplete="new-password"
                        minLength={8}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className={styles.checkboxGroup}>
                    <input
                      id="cadastro-termos"
                      type="checkbox"
                      name="termsAccepted"
                      checked={
                        formData.termsAccepted
                      }
                      onChange={handleChange}
                      className={styles.checkbox}
                      required
                      disabled={loading}
                    />

                    <label
                      htmlFor="cadastro-termos"
                      className={styles.checkboxLabel}
                    >
                      Concordo com os{" "}
                      <Link
                        href="/termos"
                        className={styles.linkTag}
                      >
                        Termos de Uso
                      </Link>{" "}
                      e com a{" "}
                      <Link
                        href="/privacidade"
                        className={styles.linkTag}
                      >
                        Política de Privacidade
                      </Link>
                      .
                    </label>
                  </div>

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

                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={19}
                          className={styles.spinner}
                          aria-hidden="true"
                        />

                        {activeTab === "lawyer"
                          ? "Criando perfil profissional..."
                          : "Criando sua conta..."}
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </button>

                  <p className={styles.loginHint}>
                    Já possui uma conta?{" "}
                    <Link
                      href="/login"
                      className={styles.linkTag}
                    >
                      Fazer login
                    </Link>
                  </p>
                </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.loadingPage}>
          <Loader2
            size={35}
            className={styles.spinner}
            aria-label="Carregando cadastro"
          />
        </main>
      }
    >
      <CadastroContent />
    </Suspense>
  );
}
