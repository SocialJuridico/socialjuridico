"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, HeartHandshake } from "lucide-react";
import styles from "./PesquisaSatisfacaoClientePopup.module.css";

export default function PesquisaSatisfacaoClientePopup() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check once per session to avoid spamming the API unless necessary
    // But since it's important, we'll let it check.
    async function checkEligibility() {
      try {
        const res = await fetch("/api/pesquisa/cliente");
        if (res.ok) {
          const data = await res.json();
          if (data.canEvaluate) {
            setShow(true);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar pesquisa do cliente:", err);
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

        <div className={styles.iconWrapper}>
          <HeartHandshake size={40} />
        </div>

        <h2 className={styles.title}>Como foi sua experiência?</h2>
        <p className={styles.description}>
          Sua opinião é fundamental para democratizarmos o acesso à justiça. 
          Gostaria de avaliar a plataforma rapidamente?
        </p>

        <Link
          href="/dashboard/cliente/avaliacao"
          className={styles.ctaBtn}
          onClick={handleClose}
        >
          Avaliar Agora
        </Link>
      </div>
    </div>
  );
}
