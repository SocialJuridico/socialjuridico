"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

import styles from "./PartnershipPopup.module.css";

// Popup de parceria OAB/RS. Aparece 1x por navegador (localStorage), com botão
// de fechar. Mostrado na home, no login e no cadastro.
const STORAGE_KEY = "sj_popup_parceria_rs_v1";

export default function PartnershipPopup({ ctaHref = "/cadastro?perfil=advogado" }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Após a montagem (evita mismatch de hidratação): abre se ainda não foi
    // dispensado neste navegador.
    const id = requestAnimationFrame(() => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
      } catch {
        setOpen(true);
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignora storage indisponível */
    }
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Parceria OAB/RS">
      <div className={styles.card}>
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Fechar">
          <X size={18} />
        </button>

        <img
          className={styles.image}
          src="/popup/popupparceria.png"
          alt="Parceria Social Jurídico e OAB/RS"
        />

        <div className={styles.body}>
          <p className={styles.headline}>
            Advogados do <strong>Rio Grande do Sul</strong> têm desconto especial
          </p>
          <p className={styles.text}>
            <strong>10% de desconto</strong> no plano <strong>START</strong> e{" "}
            <strong>15% de desconto</strong> no plano <strong>PRO</strong>. O
            desconto é aplicado automaticamente quando sua OAB é do RS.
          </p>
          <div className={styles.actions}>
            <Link href={ctaHref} className={styles.cta} onClick={dismiss}>
              Quero aproveitar
            </Link>
            <button type="button" className={styles.later} onClick={dismiss}>
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
