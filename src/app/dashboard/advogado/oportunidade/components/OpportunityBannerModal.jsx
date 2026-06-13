"use client";

import { ExternalLink, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { useLawyerSession } from "../../LawyerSessionContext";
import styles from "./OpportunityBannerModal.module.css";

const PLAN_SHORTCUTS = new Set([
  "open_plans_modal",
  "open-plan-modal",
  "modal:planos",
  "modal:plano",
  "#planos",
  "#plano",
  "sj://planos",
]);

const PLAN_QUERY_VALUES = new Set([
  "plans",
  "planos",
  "plano",
  "pro",
  "upgrade",
  "true",
  "1",
]);

function isPlanModalLink(raw) {
  const normalized = String(raw || "").trim().toLowerCase();
  if (!normalized) return false;
  if (PLAN_SHORTCUTS.has(normalized)) return true;

  try {
    const url = new URL(raw, "https://socialjuridico.com.br");
    if (!url.pathname.includes("/dashboard/advogado")) return false;

    const value =
      url.searchParams.get("open") ||
      url.searchParams.get("modal") ||
      url.searchParams.get("planModal");

    return value
      ? PLAN_QUERY_VALUES.has(String(value).trim().toLowerCase())
      : false;
  } catch {
    return false;
  }
}

function normalizeBannerAction(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (isPlanModalLink(raw)) return { type: "plans" };

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return { type: "link", href: raw, external: false };
  }

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return {
      type: "link",
      href: url.toString(),
      external: true,
    };
  } catch {
    return null;
  }
}

export default function OpportunityBannerModal({ banner, onClose }) {
  const closeButtonRef = useRef(null);
  const { openPlansModal } = useLawyerSession();
  const action = useMemo(
    () => normalizeBannerAction(banner?.link_url),
    [banner?.link_url],
  );

  useEffect(() => {
    if (!banner) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
      previouslyFocused?.focus?.();
    };
  }, [banner, onClose]);

  if (!banner) return null;

  const title = banner.name || banner.alt_text || "Banner";

  function handleOpenPlans() {
    onClose();
    window.setTimeout(openPlansModal, 0);
  }

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="opportunity-banner-modal-title"
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 id="opportunity-banner-modal-title">{title}</h2>
            <p>Visualização completa do banner</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fechar banner"
          >
            <X size={19} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.imageArea}>
          <img
            className={styles.image}
            src={banner.image_url}
            alt={banner.alt_text || title}
          />
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            A ação abaixo corresponde ao destino configurado para este banner.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={onClose}
            >
              Fechar
            </button>

            {action?.type === "plans" && (
              <button
                type="button"
                className={styles.linkButton}
                onClick={handleOpenPlans}
              >
                Ver planos
                <Sparkles size={15} aria-hidden="true" />
              </button>
            )}

            {action?.type === "link" && (
              <a
                className={styles.linkButton}
                href={action.href}
                target={action.external ? "_blank" : undefined}
                rel={
                  action.external
                    ? "noopener noreferrer sponsored"
                    : undefined
                }
                onClick={onClose}
              >
                Acessar conteúdo
                <ExternalLink size={15} aria-hidden="true" />
              </a>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
