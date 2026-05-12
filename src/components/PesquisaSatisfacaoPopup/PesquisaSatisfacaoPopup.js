"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Gift } from "lucide-react";
import styles from "./PesquisaSatisfacaoPopup.module.css";

export default function PesquisaSatisfacaoPopup() {
  const [show, setShow] = useState(false);
  console.log("[PesquisaSatisfacaoPopup] Componente renderizando no React...");

  useEffect(() => {
    console.log("[PesquisaSatisfacaoPopup] Montou o componente. Disparando API...");
    async function checkEligibility() {
      try {
        const res = await fetch("/api/pesquisa/advogado");
        console.log("[PesquisaSatisfacaoPopup] Resposta da API:", res.status);
        if (res.ok) {
          const data = await res.json();
          console.log("[PesquisaSatisfacaoPopup] Dados da API:", data);
          if (data.canEvaluate) {
            setShow(true);
          }
        }
      } catch (err) {
        console.error("[PesquisaSatisfacaoPopup] Erro ao verificar pesquisa:", err);
      }
    }

    checkEligibility();
  }, []);

  const handleClose = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button className={styles.closeBtn} onClick={handleClose}>
          <X size={24} />
        </button>

        <div className={styles.banner}>
          <div className={styles.icon}>
            <Gift size={36} color="#0d0f12" />
          </div>
          <h2 className={styles.title}>QUER GANHAR 4 JURIS?</h2>
        </div>

        <div className={styles.content}>
          <p className={styles.message}>
            Então avalie a plataforma Social Juridico, e ganhe 4 juris agora mesmo.<br/><br/>
            Sua opinião é fundamental para continuarmos melhorando!
          </p>
          
          <Link href="/dashboard/advogado/avaliacao" className={styles.actionBtn}>
            Avaliar Agora
          </Link>
        </div>
      </div>
    </div>
  );
}
