"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, GraduationCap, Loader2 } from "lucide-react";

import styles from "./InstitutionInvite.module.css";

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.message || "Nao foi possivel concluir.");
    error.code = payload?.code;
    throw error;
  }
  return payload;
}

export default function InstitutionInvitePage() {
  const { token } = useParams();
  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [password, setPassword] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [requiresExistingPassword, setRequiresExistingPassword] =
    useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadInvite() {
      try {
        const response = await fetch(
          `/api/oraculoacademico/instituicoes/convites/${token}`,
          { cache: "no-store" },
        );
        const payload = await readJson(response);
        if (!cancelled) setInvite(payload.data);
      } catch (loadError) {
        if (!cancelled) setError(loadError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function acceptInvite(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/oraculoacademico/instituicoes/convites/${token}/aceitar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, existingPassword }),
        },
      );
      const payload = await readJson(response);
      setSuccess(payload.message || "Convite aceito.");
    } catch (submitError) {
      if (submitError.code === "EXISTING_ACCOUNT_PASSWORD_REQUIRED") {
        setRequiresExistingPassword(true);
      }
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.brand}>
          <GraduationCap size={24} aria-hidden="true" />
          Oraculo Academico
        </div>

        {loading ? (
          <div className={styles.state}>
            <Loader2 className={styles.spinner} size={30} aria-hidden="true" />
            <p>Carregando convite...</p>
          </div>
        ) : success ? (
          <div className={styles.state}>
            <CheckCircle2 size={44} color="#4ade80" aria-hidden="true" />
            <h1>Convite aceito</h1>
            <p>{success}</p>
            <Link href="/oraculoacademico/login" className={styles.primaryBtn}>
              Ir para o login
            </Link>
          </div>
        ) : (
          <>
            <span className={styles.eyebrow}>Acesso institucional</span>
            <h1>Voce foi convidado para acessar o Oraculo Academico</h1>

            {error && (
              <div className={styles.error} role="alert">
                <AlertCircle size={16} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}

            {invite && invite.status === "PENDENTE" ? (
              <>
                <div className={styles.summary}>
                  <p>
                    <strong>Instituicao</strong>
                    <span>{invite.instituicao?.nome}</span>
                  </p>
                  <p>
                    <strong>Perfil</strong>
                    <span>{invite.roleLabel}</span>
                  </p>
                  <p>
                    <strong>E-mail</strong>
                    <span>{invite.email}</span>
                  </p>
                </div>

                <form onSubmit={acceptInvite} className={styles.form}>
                  {requiresExistingPassword ? (
                    <label>
                      Senha da sua conta existente
                      <input
                        type="password"
                        value={existingPassword}
                        onChange={(event) =>
                          setExistingPassword(event.target.value)
                        }
                        autoComplete="current-password"
                      />
                    </label>
                  ) : (
                    <label>
                      Crie sua senha
                      <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        minLength={8}
                        autoComplete="new-password"
                      />
                    </label>
                  )}
                  <button type="submit" disabled={submitting}>
                    {submitting ? (
                      <Loader2 className={styles.spinner} size={16} />
                    ) : null}
                    Aceitar convite
                  </button>
                </form>
              </>
            ) : (
              <div className={styles.state}>
                <AlertCircle size={36} color="#facc15" aria-hidden="true" />
                <h1>Convite indisponivel</h1>
                <p>
                  Este convite esta {invite?.status?.toLowerCase() || "indisponivel"}.
                  Solicite um novo convite ao administrador da instituicao ou
                  ao Social Juridico.
                </p>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
