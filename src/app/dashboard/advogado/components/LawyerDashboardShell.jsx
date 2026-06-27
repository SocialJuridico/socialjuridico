"use client";

import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

import { useLawyerSession } from "../LawyerSessionContext";
import LawyerRouteSidebar from "./LawyerRouteSidebar";
import LawyerRouteTopBar from "./LawyerRouteTopBar";
import styles from "./LawyerShell.module.css";

export default function LawyerDashboardShell({
  activeRoute,
  title,
  subtitle,
  icon,
  children,
}) {
  const {
    isSidebarOpen,
    setIsSidebarOpen,
    profileData,
    oabVerified,
    oabDaysLeft,
    openOabModal,
  } = useLawyerSession();

  const showOabBanner = Boolean(profileData) && !oabVerified;
  const bannerContagem =
    oabDaysLeft > 0
      ? `Faltam ${oabDaysLeft} ${oabDaysLeft === 1 ? "dia" : "dias"} antes do bloqueio.`
      : "O prazo de carência terminou.";

  useEffect(() => {
    if (!isSidebarOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleEscape = (event) => {
      if (event.key === "Escape") setIsSidebarOpen(false);
    };

    if (window.matchMedia("(max-width: 820px)").matches) {
      document.body.style.overflow = "hidden";
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isSidebarOpen, setIsSidebarOpen]);

  return (
    <div className={styles.shell}>
      <LawyerRouteSidebar activeRoute={activeRoute} />

      {isSidebarOpen && (
        <button
          type="button"
          className={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <div className={styles.main}>
        <LawyerRouteTopBar title={title} subtitle={subtitle} icon={icon} />
        {showOabBanner && (
          <div className={styles.oabBanner} role="status">
            <ShieldAlert size={18} aria-hidden="true" />
            <span className={styles.oabBannerText}>
              Sua OAB ainda não foi verificada. Sem a verificação, o acesso é
              limitado e recursos como as <strong>Oportunidades</strong> ficam
              bloqueados. <strong>{bannerContagem}</strong>
            </span>
            <button
              type="button"
              className={styles.oabBannerBtn}
              onClick={openOabModal}
            >
              Verificar agora
            </button>
          </div>
        )}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
