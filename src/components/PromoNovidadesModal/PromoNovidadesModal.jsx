"use client";

import { useEffect, useRef, useState } from "react";
import { X, FileSearch, Newspaper, Download, Users, ArrowRight, Sparkles } from "lucide-react";
import { useLawyerSession } from "@/app/dashboard/advogado/LawyerSessionContext";
import styles from "./PromoNovidadesModal.module.css";

const STORAGE_KEY = "sj:promo_novidades_last_shown";
const DELAY_MS = 15_000; // 15 segundos

function getTodayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function wasShownToday() {
  try {
    return localStorage.getItem(STORAGE_KEY) === getTodayKey();
  } catch {
    return false;
  }
}

function markShownToday() {
  try {
    localStorage.setItem(STORAGE_KEY, getTodayKey());
  } catch {
    // ignore
  }
}

const FEATURES = [
  {
    icon: FileSearch,
    title: "Monitoramento de Processos",
    description: "Acompanhe em tempo real todos os processos vinculados à sua OAB.",
    color: "#d4af37",
  },
  {
    icon: Newspaper,
    title: "Monitoramento de Diário Oficial",
    description: "Receba alertas automáticos toda vez que seu nome aparecer nos diários.",
    color: "#a78bfa",
  },
  {
    icon: Download,
    title: "Importação de Processos CNJ",
    description: "Baixe até 20 processos diretamente do DataJud com um clique.",
    color: "#34d399",
  },
  {
    icon: Users,
    title: "Importação de Partes para o CRM",
    description: "Cadastre automaticamente clientes e partes diretamente no seu CRM.",
    color: "#60a5fa",
  },
];

export default function PromoNovidadesModal() {
  const { profileData } = useLawyerSession();
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!profileData) return;

    if (wasShownToday()) return;

    timerRef.current = setTimeout(() => {
      setIsOpen(true);
      markShownToday();
    }, DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [profileData]);

  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isPro = String(profileData?.plan_type || "").toUpperCase() === "PRO";

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-modal-title"
      >
        {/* Close */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={() => setIsOpen(false)}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Sparkles size={13} />
            Novidades Exclusivas PRO
          </div>
          <h2 id="promo-modal-title" className={styles.title}>
            Sua advocacia em outro nível
          </h2>
          <p className={styles.subtitle}>
            Recursos que os melhores escritórios já estão usando. Disponíveis agora no Plano PRO.
          </p>
        </div>

        {/* Features grid */}
        <div className={styles.features}>
          {FEATURES.map(({ icon: Icon, title, description, color }) => (
            <div key={title} className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ color, background: `${color}15` }}>
                <Icon size={22} />
              </div>
              <div className={styles.featureText}>
                <strong>{title}</strong>
                <span>{description}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.ctaBtn}
            onClick={() => {
              setIsOpen(false);
              if (isPro) {
                if (window.location.pathname !== "/dashboard/advogado/processos") {
                  window.location.href = "/dashboard/advogado/processos";
                }
              } else {
                window.dispatchEvent(new CustomEvent("sj:open-lawyer-plans"));
              }
            }}
          >
            <Sparkles size={16} />
            {isPro ? "Explorar Novidades" : "Quero o Plano PRO"}
            <ArrowRight size={16} />
          </button>
          <button
            type="button"
            className={styles.skipBtn}
            onClick={() => setIsOpen(false)}
          >
            Ver mais tarde
          </button>
        </div>
      </div>
    </div>
  );
}
