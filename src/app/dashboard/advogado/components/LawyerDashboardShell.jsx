"use client";

import { useEffect } from "react";

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
  const { isSidebarOpen, setIsSidebarOpen } = useLawyerSession();

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
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
