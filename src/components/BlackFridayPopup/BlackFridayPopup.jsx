"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";

import styles from "./BlackFridayPopup.module.css";

// Popup da Black Friday (promoção "Quer Investir Quanto?") na home. A arte
// inteira é clicável e leva ao login. Depois de fechado ou clicado, volta a
// aparecer só após 24h no mesmo navegador.
const STORAGE_KEY = "sj_popup_black_friday_v1";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

function wasDismissedRecently() {
  try {
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    return Date.now() - dismissedAt < SNOOZE_MS;
  } catch {
    return false;
  }
}

export default function BlackFridayPopup({ href = "/login" }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef(null);

  useEffect(() => {
    // Abre após a montagem para evitar divergência de hidratação.
    const id = requestAnimationFrame(() => {
      if (!wasDismissedRecently()) setOpen(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignora storage indisponível */
    }
  }

  if (!open) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Black Friday Social Jurídico: escolha quanto quer pagar"
      onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}
    >
      <div className={styles.card}>
        <button ref={closeRef} type="button" className={styles.close} onClick={dismiss} aria-label="Fechar">
          <X size={18} aria-hidden="true" />
        </button>

        <Link href={href} className={styles.link} onClick={dismiss} prefetch={false}>
          <Image
            className={styles.image}
            src="/promocao/promocao.png"
            alt="Black Friday Social Jurídico: escolha quanto quer pagar e use o Plano PRO por 30 dias, renovável por até 3 meses. Aproveitar agora."
            width={1254}
            height={1254}
            sizes="(max-width: 600px) 92vw, 560px"
          />
        </Link>
      </div>
    </div>
  );
}
