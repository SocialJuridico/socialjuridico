"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";

const JURIS_PRICE_LABELS = Object.freeze({
  10: "R$ 9,90",
  20: "R$ 16,90",
  50: "R$ 39,90",
});

function readStoredPlanSettings() {
  if (typeof window === "undefined") {
    return { planType: "", billingCycle: "", promo: false };
  }

  const read = (key) => {
    const value = window.localStorage.getItem(key);
    return value && !["undefined", "null"].includes(value) ? value : "";
  };

  return {
    planType: read("sj_selected_plan_type"),
    billingCycle: read("sj_selected_billing"),
    promo: read("sj_selected_promo") === "1",
  };
}

export default function StableTransparentCheckoutModal({
  isOpen,
  onClose,
  jurisAmount,
  isPro = false,
  couponData,
  profileData,
  onPaymentSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [planSettings, setPlanSettings] = useState({
    planType: "",
    billingCycle: "",
    promo: false,
  });

  useEffect(() => {
    if (!isOpen) {
      setLoading(false);
      setAwaiting(false);
      setCheckoutUrl("");
      return undefined;
    }

    if (isPro) setPlanSettings(readStoredPlanSettings());

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isPro]);

  const generateLink = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const body = isPro
        ? {
            planType: planSettings.planType || "PRO",
            billingCycle: planSettings.billingCycle || "MONTHLY",
            isPromoEligible: Boolean(planSettings.promo),
            internalCouponId: couponData?.id || null,
          }
        : {
            jurisAmount,
            internalCouponId: couponData?.id || null,
          };

      const response = await fetch("/api/checkout/infinitepay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data.url) {
        throw new Error(
          data?.message || "Não foi possível gerar o link de pagamento.",
        );
      }

      setCheckoutUrl(data.url);
      window.open(data.url, "_blank", "noopener,noreferrer");
      setAwaiting(true);
    } catch (error) {
      toast.error(error.message || "Não foi possível iniciar o pagamento.");
    } finally {
      setLoading(false);
    }
  }, [
    couponData?.id,
    isPro,
    jurisAmount,
    loading,
    planSettings.billingCycle,
    planSettings.planType,
    planSettings.promo,
  ]);

  if (!isOpen) return null;

  const summary = isPro
    ? `Plano ${planSettings.planType || "PRO"} · ${planSettings.billingCycle || "MENSAL"}`
    : `${jurisAmount} Juris · ${JURIS_PRICE_LABELS[jurisAmount] || ""}`;

  return (
    <div
      style={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onClose?.();
      }}
    >
      <section
        style={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stable-checkout-title"
      >
        <header style={styles.header}>
          <div>
            <h2 id="stable-checkout-title" style={styles.title}>
              Finalizar compra
            </h2>
            <p style={styles.subtitle}>{summary}</p>
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div style={styles.body}>
          {awaiting ? (
            <div style={styles.pixPanel}>
              <Loader2 size={35} style={styles.spinner} />
              <strong>Aguardando confirmação do pagamento</strong>
              <span style={styles.muted}>
                Conclua o pagamento (PIX ou cartão) na página da InfinitePay que
                abrimos em outra aba. Seu plano/Juris é liberado automaticamente
                assim que o pagamento é aprovado.
              </span>

              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.linkButton}
                >
                  <ExternalLink size={16} /> Reabrir página de pagamento
                </a>
              )}

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  onPaymentSuccess?.();
                  onClose?.();
                }}
              >
                <CheckCircle2 size={17} /> Já efetuei o pagamento
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => {
                  setAwaiting(false);
                  setCheckoutUrl("");
                }}
              >
                Gerar outro link
              </button>
            </div>
          ) : (
            <div style={styles.pixPanel}>
              <div style={styles.securityLine}>
                <ShieldCheck size={15} /> Pagamento seguro via InfinitePay
              </div>
              <span style={styles.muted}>
                Você será direcionado à página da InfinitePay para pagar com PIX
                ou cartão. A confirmação é automática.
              </span>

              <button
                type="button"
                style={styles.pixButton}
                disabled={loading}
                onClick={() => void generateLink()}
              >
                {loading ? (
                  <>
                    <Loader2 size={17} style={styles.spinner} /> Gerando...
                  </>
                ) : (
                  "Pagar com InfinitePay"
                )}
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 100000,
    display: "grid",
    placeItems: "center",
    padding: 16,
    background: "rgba(3, 6, 15, 0.82)",
    backdropFilter: "blur(8px)",
  },
  modal: {
    width: "min(100%, 520px)",
    maxHeight: "calc(100vh - 32px)",
    overflowY: "auto",
    border: "1px solid rgba(212, 175, 55, 0.28)",
    borderRadius: 18,
    background: "#0f1420",
    color: "#f5f5f5",
    boxShadow: "0 24px 80px rgba(0,0,0,.55)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "20px 22px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
  },
  title: { display: "flex", alignItems: "center", gap: 9, margin: 0, fontSize: 20 },
  subtitle: { margin: "6px 0 0", color: "#a8b0c2", fontSize: 14 },
  closeButton: {
    width: 38,
    height: 38,
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,.1)",
    borderRadius: 10,
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },
  body: { padding: 22 },
  muted: { color: "#a8b0c2", fontSize: 13, lineHeight: 1.5 },
  securityLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    color: "#9ca3af",
    fontSize: 12,
  },
  spinner: { animation: "spin 1s linear infinite" },
  pixPanel: { display: "grid", gap: 14, textAlign: "center", padding: "20px 4px" },
  primaryButton: {
    minHeight: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: 0,
    borderRadius: 10,
    background: "linear-gradient(135deg,#d4af37,#b88918)",
    color: "#111827",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    minHeight: 42,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 10,
    background: "transparent",
    color: "#d1d5db",
    cursor: "pointer",
  },
  pixButton: {
    minHeight: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: 0,
    borderRadius: 10,
    background: "linear-gradient(135deg,#22c55e,#16a34a)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  linkButton: {
    minHeight: 42,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid rgba(255,255,255,.14)",
    borderRadius: 10,
    background: "transparent",
    color: "#e5e7eb",
    textDecoration: "none",
  },
};
