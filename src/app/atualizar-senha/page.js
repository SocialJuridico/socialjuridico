"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  getPasswordSessionStatus,
  updatePasswordAction,
} from "@/app/actions/passwordActions";

import styles from "./AtualizarSenha.module.css";

function PasswordRequirement({
  valid,
  children,
}) {
  return (
    <li
      className={
        valid
          ? styles.requirementValid
          : styles.requirement
      }
    >
      {valid ? (
        <Check size={15} aria-hidden="true" />
      ) : (
        <X size={15} aria-hidden="true" />
      )}

      <span>{children}</span>
    </li>
  );
}

function AtualizarSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isRecovery =
    searchParams.get("type") === "recovery";

  const recoveryStatus =
    searchParams.get("status");

  const initialRecoveryError =
    isRecovery &&
    recoveryStatus === "error";

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    checkingSession,
    setCheckingSession,
  ] = useState(!initialRecoveryError);

  const [sessionValid, setSessionValid] =
    useState(false);

  const [errorMsg, setErrorMsg] =
    useState("");

  const [successMsg, setSuccessMsg] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const requirements = useMemo(
    () => ({
      minimumLength: password.length >= 8,
      hasLetter: /[A-Za-zÀ-ÿ]/.test(password),
      hasNumber: /\d/.test(password),
      passwordsMatch:
        password.length > 0 &&
        password === confirmPassword,
    }),
    [password, confirmPassword],
  );

  const passwordValid =
    requirements.minimumLength &&
    requirements.hasLetter &&
    requirements.hasNumber &&
    requirements.passwordsMatch;

  useEffect(() => {
    if (initialRecoveryError) {
      setCheckingSession(false);
      setSessionValid(false);
      return;
    }

    let active = true;

    async function validateSession() {
      try {
        const response =
          await getPasswordSessionStatus();

        if (!active) {
          return;
        }

        setSessionValid(
          response.authenticated === true,
        );

        if (!response.authenticated) {
          setErrorMsg(
            response.message ||
              "Sua sessão expirou ou não é válida.",
          );
        }
      } catch (error) {
        console.error(
          "[Atualizar senha] Erro de sessão:",
          error,
        );

        if (active) {
          setSessionValid(false);
          setErrorMsg(
            "Não foi possível validar sua sessão.",
          );
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    validateSession();

    return () => {
      active = false;
    };
  }, [initialRecoveryError]);

  useEffect(() => {
    if (!successMsg) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      router.push("/login");
    }, 4000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMsg, router]);

  function handlePasswordChange(event) {
    setPassword(event.target.value);
    setErrorMsg("");
  }

  function handleConfirmPasswordChange(
    event,
  ) {
    setConfirmPassword(event.target.value);
    setErrorMsg("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setErrorMsg("");
    setSuccessMsg("");

    if (!sessionValid) {
      setErrorMsg(
        "Sua sessão expirou. Solicite um novo link de recuperação.",
      );
      return;
    }

    if (password.length < 8) {
      setErrorMsg(
        "A senha deve possuir pelo menos oito caracteres.",
      );
      return;
    }

    if (!requirements.hasLetter) {
      setErrorMsg(
        "A senha deve possuir pelo menos uma letra.",
      );
      return;
    }

    if (!requirements.hasNumber) {
      setErrorMsg(
        "A senha deve possuir pelo menos um número.",
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(
        "As senhas informadas não conferem.",
      );
      return;
    }

    setLoading(true);

    try {
      const response =
        await updatePasswordAction(password);

      if (!response.success) {
        if (
          response.code === "INVALID_SESSION"
        ) {
          setSessionValid(false);
        }

        setErrorMsg(
          response.message ||
            "Não foi possível atualizar sua senha.",
        );

        return;
      }

      setPassword("");
      setConfirmPassword("");

      setSuccessMsg(
        response.message ||
          "Sua senha foi atualizada com sucesso.",
      );
    } catch (error) {
      console.error(
        "[Atualizar senha] Erro:",
        error,
      );

      setErrorMsg(
        "Não foi possível atualizar sua senha. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className={styles.loadingPage}>
        <Loader2
          size={40}
          className={styles.spinner}
          aria-label="Validando sessão"
        />

        <p>Validando seu acesso...</p>
      </main>
    );
  }

  if (initialRecoveryError || !sessionValid) {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <div className={styles.errorIcon}>
            <AlertCircle
              size={44}
              aria-hidden="true"
            />
          </div>

          <span className={styles.eyebrow}>
            Link inválido
          </span>

          <h1>
            Não foi possível validar seu acesso
          </h1>

          <p>
            O link de recuperação pode ter
            expirado, já ter sido utilizado ou
            estar incompleto.
          </p>

          {errorMsg && (
            <div
              className={styles.errorMessage}
              role="alert"
            >
              <AlertCircle
                size={17}
                aria-hidden="true"
              />

              <span>{errorMsg}</span>
            </div>
          )}

          <Link
            href="/login/esqueci-senha"
            className={styles.primaryAction}
          >
            Solicitar novo link
          </Link>

          <Link
            href="/login"
            className={styles.secondaryLink}
          >
            Voltar ao login
          </Link>
        </section>
      </main>
    );
  }

  if (successMsg) {
    return (
      <main className={styles.statePage}>
        <section className={styles.stateCard}>
          <div className={styles.successIcon}>
            <CheckCircle2
              size={44}
              aria-hidden="true"
            />
          </div>

          <span className={styles.eyebrow}>
            Senha atualizada
          </span>

          <h1>
            Sua nova senha está pronta
          </h1>

          <p>{successMsg}</p>

          <div
            className={styles.successMessage}
            role="status"
          >
            <CheckCircle2
              size={17}
              aria-hidden="true"
            />

            Você será encaminhado para o login.
          </div>

          <button
            type="button"
            className={styles.primaryAction}
            onClick={() =>
              router.push("/login")
            }
          >
            Ir para o login
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.pageWrapper}>
      <section className={styles.leftSide}>
        <div
          className={styles.leftPattern}
          aria-hidden="true"
        />

        <Link
          href="/login"
          className={styles.backButton}
        >
          <ArrowLeft
            size={19}
            aria-hidden="true"
          />

          Voltar ao login
        </Link>

        <div className={styles.leftContent}>
          <span className={styles.eyebrow}>
            Segurança da conta
          </span>

          <h1 className={styles.leftTitle}>
            Crie uma nova senha para proteger seu
            <span className={styles.highlight}>
              {" "}
              acesso.
            </span>
          </h1>

          <p className={styles.leftDescription}>
            Escolha uma senha exclusiva para o
            Social Jurídico e evite reutilizar
            credenciais de outros serviços.
          </p>

          <div className={styles.trustList}>
            <div>
              <ShieldCheck
                size={20}
                aria-hidden="true"
              />

              <span>
                A sessão de recuperação possui
                validade limitada
              </span>
            </div>

            <div>
              <KeyRound
                size={20}
                aria-hidden="true"
              />

              <span>
                A nova senha substitui a anterior
                imediatamente
              </span>
            </div>

            <div>
              <LockKeyhole
                size={20}
                aria-hidden="true"
              />

              <span>
                Após a alteração, será necessário
                fazer login novamente
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.rightSide}>
        <div className={styles.formContainer}>
          <Link
            href="/"
            className={styles.mobileLogo}
          >
            <Scale
              size={28}
              aria-hidden="true"
            />

            Social Jurídico
          </Link>

          <header className={styles.formHeader}>
            <span className={styles.eyebrow}>
              {isRecovery
                ? "Redefinição de senha"
                : "Atualização obrigatória"}
            </span>

            <h1 className={styles.formTitle}>
              Defina sua nova senha
            </h1>

            <p className={styles.formSubtitle}>
              Utilize pelo menos oito caracteres,
              incluindo letras e números.
            </p>
          </header>

          {errorMsg && (
            <div
              className={styles.errorMessage}
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle
                size={18}
                aria-hidden="true"
              />

              <span>{errorMsg}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={styles.form}
            noValidate
          >
            <div className={styles.formGroup}>
              <label
                htmlFor="new-password"
                className={styles.label}
              >
                Nova senha
              </label>

              <div className={styles.passwordField}>
                <input
                  id="new-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={
                    handlePasswordChange
                  }
                  className={styles.input}
                  placeholder="Digite sua nova senha"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
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

            <div className={styles.formGroup}>
              <label
                htmlFor="confirm-password"
                className={styles.label}
              >
                Confirmar nova senha
              </label>

              <div className={styles.passwordField}>
                <input
                  id="confirm-password"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={
                    handleConfirmPasswordChange
                  }
                  className={styles.input}
                  placeholder="Repita sua nova senha"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() =>
                    setShowConfirmPassword(
                      (current) => !current,
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Ocultar confirmação"
                      : "Mostrar confirmação"
                  }
                >
                  {showConfirmPassword ? (
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

            <ul
              className={styles.requirements}
              aria-label="Requisitos da senha"
            >
              <PasswordRequirement
                valid={
                  requirements.minimumLength
                }
              >
                Pelo menos oito caracteres
              </PasswordRequirement>

              <PasswordRequirement
                valid={requirements.hasLetter}
              >
                Pelo menos uma letra
              </PasswordRequirement>

              <PasswordRequirement
                valid={requirements.hasNumber}
              >
                Pelo menos um número
              </PasswordRequirement>

              <PasswordRequirement
                valid={
                  requirements.passwordsMatch
                }
              >
                As duas senhas são iguais
              </PasswordRequirement>
            </ul>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={
                loading || !passwordValid
              }
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className={styles.spinner}
                    aria-hidden="true"
                  />

                  Salvando nova senha...
                </>
              ) : (
                "Salvar nova senha"
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function AtualizarSenhaPage() {
  return (
    <Suspense
      fallback={
        <main className={styles.loadingPage}>
          <Loader2
            size={40}
            className={styles.spinner}
            aria-label="Carregando"
          />
        </main>
      }
    >
      <AtualizarSenhaContent />
    </Suspense>
  );
}