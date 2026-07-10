"use client";

import { useState } from "react";

import styles from "./OraculoStudentDashboard.module.css";

// Aviso LGPD: informa que a atividade e o tempo de uso no dashboard são
// registrados e disponibilizados ao supervisor/instituição. Registra a ciência.
export default function OraculoTelemetryNotice({ initiallyConsented }) {
  const [visible, setVisible] = useState(!initiallyConsented);
  const [saving, setSaving] = useState(false);

  if (!visible) return null;

  async function acknowledge() {
    setSaving(true);
    try {
      await fetch("/api/oraculo/telemetry/consent", { method: "POST" });
    } catch {
      // Mesmo em falha de rede, não bloqueia o uso; tentará de novo no próximo acesso.
    }
    setVisible(false);
  }

  return (
    <div className={styles.telemetryNotice} role="region" aria-label="Aviso de privacidade">
      <div>
        <strong>Aviso de privacidade</strong>
        <p>
          Sua atividade neste dashboard — telas visitadas, ações e tempo de uso —
          é registrada e disponibilizada ao seu supervisor acadêmico e à instituição
          de ensino, para acompanhamento da prática jurídica. Nenhum dado é usado
          para outra finalidade.
        </p>
      </div>
      <button type="button" onClick={acknowledge} disabled={saving}>
        {saving ? "Registrando..." : "Estou ciente"}
      </button>
    </div>
  );
}
