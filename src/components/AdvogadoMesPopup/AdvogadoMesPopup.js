"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, X } from "lucide-react";

import styles from "./AdvogadoMesPopup.module.css";

export default function AdvogadoMesPopup() {
  const [banner, setBanner] = useState(null);
  const closeRef = useRef(null);

  const handleClose = useCallback(() => {
    setBanner(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadBanner = async () => {
      try {
        const response = await fetch("/api/advogado-mes", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success || !data.banner?.image_url) return;

        const version = String(data.banner.version || data.banner.id || "current");
        const sessionKey = `advogadoMesShown:${data.banner.id}:${version}`;
        if (sessionStorage.getItem(sessionKey)) return;

        sessionStorage.setItem(sessionKey, "true");
        setBanner(data.banner);
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error("[AdvogadoMesPopup] Falha ao carregar destaque:", error);
        }
      }
    };

    void loadBanner();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!banner) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [banner, handleClose]);

  if (!banner) return null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={banner.image_url}
      alt={banner.alt_text || "Destaque Advogado do Mês"}
      className={styles.image}
      onError={handleClose}
    />
  );

  return (
    <div className={styles.overlay} onMouseDown={handleClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Destaque Advogado do Mês"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Fechar destaque"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {banner.link_url ? (
          <a
            href={banner.link_url}
            target={banner.link_url.startsWith("/") ? undefined : "_blank"}
            rel={
              banner.link_url.startsWith("/") ? undefined : "noopener noreferrer"
            }
            className={styles.imageLink}
            aria-label={`${banner.alt_text || "Abrir destaque"}. Abrir destino.`}
          >
            {image}
            <span className={styles.linkHint}>
              <ExternalLink size={13} aria-hidden="true" />
              Abrir destaque
            </span>
          </a>
        ) : (
          image
        )}
      </div>
    </div>
  );
}
