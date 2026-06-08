"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X } from "lucide-react";

import styles from "./CookieNotice.module.css";

const STORAGE_KEY = "socialjuridico:cookie-notice-acknowledged";
const STORAGE_VERSION = "1";

export default function CookieNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);

      if (storedValue !== STORAGE_VERSION) {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  function acknowledgeNotice() {
    window.dispatchEvent(new Event("cookieNoticeAcknowledged"));
    try {
      window.localStorage.setItem(STORAGE_KEY, STORAGE_VERSION);
    } catch {
      // O aviso pode ser fechado mesmo sem acesso ao localStorage.
    }

    setIsVisible(false);
  }

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      className={styles.wrapper}
      aria-label="Aviso sobre cookies e armazenamento local"
    >
      <div className={styles.notice}>
        <button
          type="button"
          className={styles.closeButton}
          onClick={acknowledgeNotice}
          aria-label="Fechar aviso de cookies"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className={styles.iconWrapper} aria-hidden="true">
          <Cookie size={24} strokeWidth={1.8} />
        </div>

        <div className={styles.content}>
          <h2 className={styles.title}>
            Privacidade e funcionamento da plataforma
          </h2>

          <p className={styles.description}>
            Utilizamos cookies e tecnologias essenciais para manter sua sessão,
            proteger sua conta, guardar preferências e permitir o funcionamento
            do Social Jurídico. Não utilizamos cookies publicitários neste
            momento.
          </p>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryAction}
              onClick={acknowledgeNotice}
            >
              Entendi
            </button>

            <Link
              href="/privacidade#cookies"
              className={styles.secondaryAction}
            >
              Ver Política de Privacidade
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
