"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageSquare, PlayCircle } from "lucide-react";

import styles from "../../../OraculoStudentDashboard.module.css";

export default function DossieActions({ caseId, interviewStatus, canAct }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const interviewLabel =
    interviewStatus === "COMPLETED"
      ? "Ver atendimento simulado"
      : interviewStatus === "ACTIVE"
        ? "Continuar atendimento simulado"
        : "Iniciar atendimento simulado";

  async function iniciarAnalise() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/oraculo/casos/radar/${caseId}/iniciar-analise`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        setError(payload?.message || "Não foi possível iniciar a análise.");
      } else {
        router.push(payload.data?.redirectTo || "/dashboard/oraculo/analises");
      }
    } catch {
      setError("Falha de rede. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.dossieActions}>
      <button
        type="button"
        className={styles.caseCta}
        onClick={iniciarAnalise}
        disabled={pending || !canAct}
      >
        <PlayCircle size={16} aria-hidden="true" />
        {pending ? "Iniciando…" : "Iniciar análise"}
      </button>
      <Link
        href={`/dashboard/oraculo/casos/radar/${caseId}/entrevista`}
        className={styles.dossieSecondaryCta}
      >
        <MessageSquare size={16} aria-hidden="true" />
        {interviewLabel}
      </Link>
      {!canAct && (
        <p className={styles.muted}>
          Seu vínculo acadêmico precisa estar ativo para iniciar a atividade.
        </p>
      )}
      {error && <p className={styles.dossieError}>{error}</p>}
    </div>
  );
}
