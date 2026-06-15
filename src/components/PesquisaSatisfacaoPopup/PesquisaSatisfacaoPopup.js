"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, X } from "lucide-react";

import styles from "./PesquisaSatisfacaoPopup.module.css";

export default function PesquisaSatisfacaoPopup() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const isSurveyPage = pathname === "/dashboard/advogado/pesquisa-atualizacao";

  useEffect(() => {
    let cancelled = false;

    async function checkEligibility() {
      if (isSurveyPage) return;

      try {
        const response = await fetch("/api/pesquisa/advogado/atualizacao", {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!cancelled && response.ok && data?.canEvaluate) {
          setShow(true);
        }
      } catch (error) {
        console.error("[PesquisaAtualizacaoPopup] Erro ao verificar pesquisa:", error);
      }
    }

    void checkEligibility();
    return () => {
      cancelled = true;
    };
  }, [isSurveyPage]);

  useEffect(() => {
    if (isSurveyPage) setShow(false);
  }, [isSurveyPage]);

  if (!show || isSurveyPage) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => setShow(false)}
          aria-label="Fechar pesquisa"
        >
          <X size={24} />
        </button>

        <div className={styles.banner}>
          <div className={styles.icon}>
            <Gift size={36} color="#0d0f12" />
          </div>
          <h2 className={styles.title}>AVALIE A ATUALIZACAO</h2>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            Queremos saber como ficaram as novas telas, a IA, a velocidade, a
            seguranca e o cartao digital interativo.
            <br />
            <br />
            Responda a pesquisa e ganhe 4 Juris agora mesmo.
          </p>

          <Link
            href="/dashboard/advogado/pesquisa-atualizacao"
            className={styles.actionBtn}
            onClick={() => setShow(false)}
          >
            Responder Pesquisa
          </Link>
        </div>
      </div>
    </div>
  );
}
