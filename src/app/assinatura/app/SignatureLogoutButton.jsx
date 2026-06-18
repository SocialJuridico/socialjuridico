"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

import styles from "./app.module.css";

export default function SignatureLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/assinatura/auth/logout", { method: "POST" });
    } finally {
      router.replace("/assinatura/entrar");
      router.refresh();
    }
  }

  return (
    <button type="button" className={styles.iconButton} onClick={logout} disabled={loading} title="Sair da conta">
      {loading ? <Loader2 size={18} className={styles.spin} /> : <LogOut size={18} />}
      <span className={styles.srOnly}>Sair da conta</span>
    </button>
  );
}
