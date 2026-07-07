"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Scale, ShieldAlert, XCircle } from "lucide-react";

import styles from "./SupervisorInvite.module.css";

export default function SupervisorInvitePage({ params }) {
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [resultMsg, setResultMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/oraculo/supervisor/${token}`, {
          cache: "no-store",
        });
        const payload = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok || !payload?.success) {
          setError(payload?.message || "Convite não encontrado.");
          return;
        }

        setInvite(payload.data);
      } catch {
        if (!cancelled) setError("Não foi possível carregar o convite.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function respond(decision) {
    if (deciding) return;
    setDeciding(true);
    setError("");

    try {
      const response = await fetch(`/api/oraculo/supervisor/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        setError(payload?.message || "Não foi possível registrar sua resposta.");
        return;
      }

      setResultMsg(payload.message);
    } catch {
      setError("Não foi possível registrar sua resposta.");
    } finally {
      setDeciding(false);
    }
  }

  if (loading) {
    return (
      <main className={styles.page}>
        <Loader2 size={32} className={styles.spinner} aria-hidden="true" />
      </main>
    );
  }

  if (error && !invite) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <ShieldAlert size={36} color="#fca5a5" aria-hidden="true" />
          <h1>Convite indisponível</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (resultMsg) {
    return (
      <main className={styles.page}>
        <div className={styles.card}>
          <CheckCircle2 size={36} color="#4ade80" aria-hidden="true" />
          <h1>Resposta registrada</h1>
          <p>{resultMsg}</p>
        </div>
      </main>
    );
  }

  const alreadyResponded = invite.status !== "CONVIDADO";

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>
          <Scale size={15} aria-hidden="true" />
          Convite de supervisor — Oráculo Acadêmico
        </span>

        <h1>Olá, {invite.supervisorNome?.split(" ")[0] || "Advogado(a)"}</h1>

        <p>
          <strong>{invite.oraculoNome}</strong> indicou você como supervisor
          (padrinho) na relação: <strong>{invite.relacaoLabel}</strong>.
        </p>

        {alreadyResponded ? (
          <div className={styles.statusNotice} data-status={invite.status}>
            Este convite já foi respondido ({invite.status.toLowerCase()}).
          </div>
        ) : (
          <>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.approveBtn}
                onClick={() => respond("APROVADO")}
                disabled={deciding}
              >
                <CheckCircle2 size={17} aria-hidden="true" />
                Aceitar convite
              </button>

              <button
                type="button"
                className={styles.declineBtn}
                onClick={() => respond("RECUSADO")}
                disabled={deciding}
              >
                <XCircle size={17} aria-hidden="true" />
                Recusar
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
