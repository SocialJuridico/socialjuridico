"use client";

import React from "react";
import { Shield } from "lucide-react";
import { useDashboard } from "../DashboardContext";
import styles from "../Dashboard.module.css";

export default function PlanUsageCard() {
  const { profileData, setShowProModal } = useDashboard();

  const planType = profileData?.plan_type || "FREE";

  const metrics = [
    {
      key: "redator",
      label: "Redator IA",
      usage: profileData?.uso_redator_ia || 0,
      limit:
        (planType === "PRO" ? 200 : planType === "START" ? 20 : 0) +
        (profileData?.extra_redator_ia || 0),
    },
    {
      key: "crm",
      label: "Clientes CRM",
      usage: profileData?.crm_count || 0,
      limit: planType === "PRO" ? Infinity : planType === "START" ? 10 : 0,
    },
    {
      key: "triagem",
      label: "Triagem IA",
      usage: profileData?.uso_triagem || 0,
      limit:
        (planType === "PRO" ? 200 : planType === "START" ? 10 : 0) +
        (profileData?.extra_triagem || 0),
    },
    {
      key: "agenda",
      label: "Agenda",
      usage: profileData?.uso_agenda || 0,
      limit: planType === "PRO" ? Infinity : planType === "START" ? 30 : 0,
    },
    {
      key: "storage",
      label: "Armazenamento",
      usage: profileData?.uso_storage_mb || 0,
      limit:
        (planType === "PRO" ? 10240 : planType === "START" ? 500 : 0) +
        (profileData?.extra_storage_mb || 0),
    },
  ];

  const now = new Date();
  const periodLabel = now
    .toLocaleString("pt-BR", { month: "long", year: "numeric" })
    .toUpperCase();

  const formatStorage = (mb) => {
    if (mb === undefined || mb === null) return "0MB";
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)}GB`;
    // keep small values with 3 decimals like screenshots
    if (mb < 1) return `${mb.toFixed(3)}`.replace(/^-?0+/, "") + "MB";
    return `${mb}MB`;
  };

  return (
    <div className={styles.planUsagePanel}>
      <div className={styles.planUsageInner}>
        <div className={styles.planUsageLeft}>
          <div className={styles.kickerBadge}>
            <Shield size={14} />
          </div>
          <div style={{ marginLeft: 12 }}>
            <div className={styles.kickerTitle}>MÉTRICAS ATUAIS</div>
            <div className={styles.kickerSub}>Uso do Plano ({planType})</div>
          </div>
        </div>

        <div className={styles.planUsageCenter}>
          <div className={styles.metricsRow}>
            {metrics.map((m, idx) => {
              const limitLabel =
                m.key === "storage"
                  ? formatStorage(m.limit || 0)
                  : m.limit === Infinity
                    ? "0"
                    : m.limit || 0;
              const usageLabel =
                m.key === "storage"
                  ? formatStorage(m.usage || 0)
                  : `${m.usage || 0}`;
              const pct =
                m.limit && m.limit !== Infinity
                  ? Math.min(100, (m.usage / (m.limit || 1)) * 100)
                  : 0;

              return (
                <div key={m.key} className={styles.metricColumn}>
                  <div
                    className={styles.metricLabel}
                  >{`${idx + 1}. ${m.label}`}</div>
                  <div className={styles.metricNumberRow}>
                    <div className={styles.metricValue}>{usageLabel}</div>
                    <div className={styles.metricSmall}>/ {limitLabel}</div>
                  </div>
                  <div className={styles.metricUnderline} />
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.planUsageRight}>
          <div className={styles.periodLabel}>PERÍODO: {periodLabel}</div>
          <button
            className={styles.verPlanBtn}
            onClick={() => setShowProModal(true)}
          >
            Ver Planos
          </button>
        </div>
      </div>
    </div>
  );
}
