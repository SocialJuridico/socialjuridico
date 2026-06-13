"use client";

import { Coins, Menu } from "lucide-react";

import VerifiedBadge from "@/components/VerifiedBadge/VerifiedBadge";

import { useLawyerSession } from "../LawyerSessionContext";
import styles from "./LawyerShell.module.css";

export default function LawyerRouteTopBar({ title, subtitle, icon: Icon }) {
  const {
    profileData,
    userName,
    setIsSidebarOpen,
    openPlansModal,
  } = useLawyerSession();

  const safeName = userName || profileData?.name || "Advogado";
  const initials =
    safeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "AD";

  return (
    <header className={styles.topbar}>
      <div className={styles.titleArea}>
        <button
          type="button"
          className={styles.mobileMenu}
          onClick={() => setIsSidebarOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        {Icon && (
          <span className={styles.titleIcon}>
            <Icon size={20} aria-hidden="true" />
          </span>
        )}

        <div className={styles.titleText}>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className={styles.userArea}>
        <div className={styles.balance} aria-label="Saldo de Juris">
          <Coins size={15} aria-hidden="true" />
          <span>{profileData?.balance || 0} Juris</span>
          <button type="button" onClick={openPlansModal}>
            Ver planos
          </button>
        </div>

        <div className={styles.identity}>
          <div className={styles.identityText}>
            <div className={styles.identityName}>
              <span>{safeName}</span>
              {profileData?.oab_verification_status === "VERIFIED" && (
                <VerifiedBadge size={15} />
              )}
            </div>
            <span className={styles.identityOab}>
              {profileData?.oab || "OAB pendente"}
            </span>
          </div>
          <div className={styles.avatar} aria-hidden="true">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
