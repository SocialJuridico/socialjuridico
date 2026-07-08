"use client";

import { LogOut } from "lucide-react";

import styles from "./InstitutionDashboard.module.css";

export default function InstitutionLogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    window.location.href = "/oraculoacademico/login";
  }

  return (
    <button type="button" className={styles.logoutButton} onClick={handleLogout}>
      <LogOut size={16} aria-hidden="true" />
      Sair
    </button>
  );
}
