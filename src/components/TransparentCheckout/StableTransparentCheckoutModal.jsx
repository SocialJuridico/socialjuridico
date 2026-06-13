"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { CheckCircle2, CreditCard, Loader2, Lock, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";

import {
  buildDashboardReturnUrl,
  createJurisCheckout,
  createProSubscription,
} from "@/services/stripeCheckoutService";

import {
  getOrCreateIntentRequest,
  resetIntentRequestCache,
} from "./intentRequestCache";

const STRIPE_PUBLIC_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || "";
const stripePromise = STRIPE_PUBLIC_KEY ? loadStripe(STRIPE_PUBLIC_KEY) : null;

const JURIS_PRICE_MAP = Object.freeze({
  10: process.env.NEXT_PUBLIC_PRICE_JURIS_10,
  20: process.env.NEXT_PUBLIC_PRICE_JURIS_20,
  50: process.env.NEXT_PUBLIC_PRICE_JURIS_50,
});

const JURIS_PRICE_LABELS = Object.freeze({
  10: "R$ 9,90",
  20: "R$ 16,90",
  50: "R$ 39,90",
});

function readStoredPlanSettings() {
  if (typeof window === "undefined") {
    return { planType: "", billingCycle: "", addOnType: "", priceId: "" };
  }

  const read = (key) => {
    const value = window.localStorage.getItem(key);
    return value && !["undefined", "null"].includes(value) ? value : "";
  };

  return {
    planType: read("sj_selected_plan_type"),
    billingCycle: read("sj_selected_billing"),
    addOnType: read("sj_selected_addon_type"),
    priceId: read("sj_selected_price_id"),
  };
}

async function readResponse(response) {
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || "Não foi possível preparar o pagamento.");
  }
  if (!data.clientSecret) {
    throw new Error("O Stripe não retornou o formulário de pagamento.");
  }
  return data;
}

function CardCheckoutForm({
  clientSecret,
  amount,
  currency,
  onCancel,
  onSuccess,
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  const formattedAmount = useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: String(currency || "brl").toUpperCase(),
      }).format(Number(amount || 0) / 100),
    [amount, currency],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !ready || processing) return;

    setProcessing(true);
    setError("");

    try {
      const confirmParams = {
        return_url: buildDashboardReturnUrl("success", "payment_status"),
      };
      const isSetupIntent = clientSecret.startsWith("seti_");
      const result = isSetupIntent
        ? await stripe.confirmSetup({
            elements,
            confirmParams,
            redirect: "if_required",
          })
        : await stripe.confirmPayment({
            elements,
            confirmParams,
            redirect: "if_required",
          });

      if (result.error) {
        throw new Error(result.error.message || "O pagamento não foi aprovado.");
      }

      const intent = result.paymentIntent || result.setupIntent;
      if (!intent || !["succeeded", "processing"].includes(intent.status)) {
        throw new Error(
          "O pagamento ainda não foi confirmado. Revise os dados do cartão.",
        );
      }

      if (result.paymentIntent?.id) {
        const confirmation = await fetch("/api/checkout/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentIntentId: result.paymentIntent.id }),
        });
        const confirmationData = await confirmation.json().catch(() => null);
        if (!confirmation.ok && confirmation.status !== 409) {
          console.warn(
            "[TransparentCheckout] A confirmação direta falhou; o webhook continuará:",
            confirmationData,
          );
        }
      }

      setCompleted(true);
      toast.success("Pagamento aprovado!");
      window.setTimeout(() => onSuccess?.(), 900);
    } catch (paymentError) {
      console.error("[TransparentCheckout] Falha na confirmação:", paymentError);
      setError(paymentError.message || "Não foi possível processar o pagamento.");
    } finally {
      setProcessing(false);
    }
  };

  if (completed) {
    return (
      <div style={styles.successBox}>
        <CheckCircle2 size={54} color="#22c55e" />
        <strong>Pagamento aprovado</strong>
        <span>Sua conta será atualizada em instantes.</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.securityLine}>
        <ShieldCheck size={15} /> Pagamento seguro via Stripe <Lock size={12} />
      </div>

      <div style={styles.paymentElementBox}>
        <PaymentElement
          onReady={() => setReady(true)}
          onLoadError={(event) => {
            console.error("[TransparentCheckout] PaymentElement:", event);
            setError("Não foi possível carregar os campos do cartão.");
          }}
          options={{
            layout: "tabs",
            defaultValues: {
              billingDetails: { address: { country: "BR" } },
            },
          }}
        />
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <button
        type="submit"
        style={styles.primaryButton}
        disabled={!stripe || !elements || !ready || processing}
      >
        {processing || !ready ? (
          <>
            <Loader2 size={17} style={styles.spinner} />
            {processing ? "Processando..." : "Carregando cartão..."}
          </>
        ) : (
          <>
            <CreditCard size={17} /> Pagar {formattedAmount}
          </>
        )}
      </button>

      <button
        type="button"
        style={styles.secondaryButton}
        onClick={onCancel}
        disabled={processing}
      >
        Cancelar
      </button>
    </form>
  );
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
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [clientSecret, setClientSecret] = useState("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("brl");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [loadingPix, setLoadingPix] = useState(false);
  const [awaitingPix, setAwaitingPix] = useState(false);
  const [checkoutSettings, setCheckoutSettings] = useState({
    planType: "",
    billingCycle: "",
    priceId: "",
  });
  const requestCacheRef = useRef({ key: "", promise: null });

  const fallbackToRedirect = useCallback(async () => {
    try {
      if (isPro) await createProSubscription(couponData);
      else await createJurisCheckout(jurisAmount, couponData);
    } catch (fallbackError) {
      toast.error(fallbackError.message || "Não foi possível abrir o checkout alternativo.");
    }
  }, [couponData, isPro, jurisAmount]);

  useEffect(() => {
    if (!isOpen) {
      resetIntentRequestCache(requestCacheRef.current);
      setClientSecret("");
      setError("");
      setLoading(false);
      setPaymentMethod("stripe");
      setAwaitingPix(false);
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || (!isPro && !jurisAmount)) return undefined;

    let active = true;
    const stored = isPro ? readStoredPlanSettings() : null;
    const planType = isPro ? stored.planType : "";
    const billingCycle = isPro ? stored.billingCycle : "AVULSO";
    const addOnType = isPro ? stored.addOnType : "";
    const priceId = isPro
      ? stored.priceId
      : JURIS_PRICE_MAP[Number(jurisAmount)] || "";
    const endpoint =
      isPro && billingCycle !== "AVULSO"
        ? "/api/checkout/create-subscription-intent"
        : "/api/checkout/create-payment-intent";

    setCheckoutSettings({ planType, billingCycle, priceId });

    async function loadIntent() {
      setLoading(true);
      setError("");
      setClientSecret("");

      try {
        if (!STRIPE_PUBLIC_KEY) {
          throw new Error("A chave pública do Stripe não está configurada.");
        }
        if (!priceId) {
          throw new Error("O preço do produto não está configurado.");
        }

        const requestKey = [
          endpoint,
          priceId,
          couponData?.id || "",
          planType,
          billingCycle,
          addOnType,
          retryAttempt,
        ].join(":");

        const data = await getOrCreateIntentRequest(
          requestCacheRef.current,
          requestKey,
          async () => {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                isPro
                  ? {
                      priceId,
                      internalCouponId: couponData?.id || null,
                      planType,
                      billingCycle,
                      addOnType: addOnType || null,
                    }
                  : {
                      priceId,
                      internalCouponId: couponData?.id || null,
                      planType: null,
                      billingCycle: "AVULSO",
                      addOnType: null,
                    },
              ),
            });
            return readResponse(response);
          },
        );

        if (!active) return;
        setClientSecret(data.clientSecret);
        setAmount(Number(data.amount || data.originalAmount || 0));
        setCurrency(data.currency || "brl");
      } catch (intentError) {
        if (!active) return;
        console.error("[TransparentCheckout] Falha ao preparar formulário:", intentError);
        setError(intentError.message || "Não foi possível carregar o formulário.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadIntent();
    return () => {
      active = false;
    };
  }, [
    couponData?.id,
    isOpen,
    isPro,
    jurisAmount,
    retryAttempt,
  ]);

  const retryStripe = useCallback(() => {
    resetIntentRequestCache(requestCacheRef.current);
    setRetryAttempt((value) => value + 1);
  }, []);

  const openInfinitePay = useCallback(async () => {
    if (loadingPix) return;
    setLoadingPix(true);
    try {
      const response = await fetch("/api/checkout/infinitepay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: isPro ? checkoutSettings.planType || "PRO" : "START",
          jurisAmount,
          customer: {
            name: profileData?.name,
            email: profileData?.email,
            phone: profileData?.phone,
          },
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data.url) {
        throw new Error(data?.message || "Não foi possível gerar o PIX.");
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
      setAwaitingPix(true);
    } catch (pixError) {
      toast.error(pixError.message || "Não foi possível gerar o PIX.");
    } finally {
      setLoadingPix(false);
    }
  }, [
    checkoutSettings.planType,
    isPro,
    jurisAmount,
    loadingPix,
    profileData?.email,
    profileData?.name,
    profileData?.phone,
  ]);

  if (!isOpen) return null;

  return (
    <div
      style={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loadingPix) onClose?.();
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
              <CreditCard size={21} /> Finalizar compra
            </h2>
            <p style={styles.subtitle}>
              {isPro
                ? `Plano ${checkoutSettings.planType || "PRO"} · ${checkoutSettings.billingCycle || ""}`
                : `${jurisAmount} Juris · ${JURIS_PRICE_LABELS[jurisAmount] || ""}`}
            </p>
          </div>
          <button type="button" style={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <div style={styles.body}>
          <div style={styles.tabs}>
            <button
              type="button"
              style={paymentMethod === "stripe" ? styles.activeCardTab : styles.tab}
              onClick={() => setPaymentMethod("stripe")}
            >
              <CreditCard size={16} /> Cartão
            </button>
            <button
              type="button"
              style={paymentMethod === "pix" ? styles.activePixTab : styles.tab}
              onClick={() => setPaymentMethod("pix")}
            >
              PIX
            </button>
          </div>

          {paymentMethod === "stripe" && (
            <div>
              {loading && (
                <div style={styles.loadingBox}>
                  <Loader2 size={28} style={styles.spinner} />
                  <span>Carregando campos do cartão...</span>
                </div>
              )}

              {!loading && error && (
                <div style={styles.errorPanel}>
                  <strong>Não foi possível abrir o cartão</strong>
                  <span>{error}</span>
                  <button type="button" style={styles.primaryButton} onClick={retryStripe}>
                    Tentar novamente
                  </button>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => void fallbackToRedirect()}
                  >
                    Usar checkout alternativo
                  </button>
                </div>
              )}

              {!loading && !error && clientSecret && stripePromise && (
                <Elements
                  key={clientSecret}
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    locale: "pt-BR",
                    appearance: {
                      theme: "night",
                      variables: {
                        colorPrimary: "#d4af37",
                        colorBackground: "#141824",
                        colorText: "#f5f5f5",
                        colorDanger: "#ef4444",
                        borderRadius: "10px",
                      },
                    },
                  }}
                >
                  <CardCheckoutForm
                    clientSecret={clientSecret}
                    amount={amount}
                    currency={currency}
                    onCancel={onClose}
                    onSuccess={() => {
                      onPaymentSuccess?.();
                      onClose?.();
                    }}
                  />
                </Elements>
              )}
            </div>
          )}

          {paymentMethod === "pix" && (
            <div style={styles.pixPanel}>
              {awaitingPix ? (
                <>
                  <Loader2 size={35} style={styles.spinner} />
                  <strong>Aguardando confirmação do PIX</strong>
                  <span>Conclua o pagamento na página da InfinitePay.</span>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => setAwaitingPix(false)}
                  >
                    Gerar outro link
                  </button>
                </>
              ) : (
                <>
                  <strong>Pagamento via PIX</strong>
                  <span>O link seguro será aberto em uma nova aba.</span>
                  <button
                    type="button"
                    style={styles.pixButton}
                    disabled={loadingPix}
                    onClick={() => void openInfinitePay()}
                  >
                    {loadingPix ? (
                      <>
                        <Loader2 size={17} style={styles.spinner} /> Gerando...
                      </>
                    ) : (
                      "Pagar com PIX"
                    )}
                  </button>
                </>
              )}
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
    width: "min(100%, 560px)",
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
  title: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    margin: 0,
    fontSize: 20,
  },
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
  tabs: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  tab: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 10,
    background: "transparent",
    color: "#9aa3b6",
    cursor: "pointer",
  },
  activeCardTab: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #d4af37",
    borderRadius: 10,
    background: "rgba(212,175,55,.1)",
    color: "#f3d66e",
    cursor: "pointer",
  },
  activePixTab: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    border: "1px solid #22c55e",
    borderRadius: 10,
    background: "rgba(34,197,94,.1)",
    color: "#4ade80",
    cursor: "pointer",
  },
  form: { display: "grid", gap: 14 },
  securityLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    color: "#9ca3af",
    fontSize: 12,
  },
  paymentElementBox: {
    minHeight: 210,
    padding: 14,
    border: "1px solid rgba(255,255,255,.09)",
    borderRadius: 12,
    background: "#141824",
  },
  loadingBox: {
    minHeight: 230,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 12,
    color: "#cbd5e1",
  },
  spinner: { animation: "spin 1s linear infinite" },
  errorBox: {
    padding: 12,
    border: "1px solid rgba(239,68,68,.35)",
    borderRadius: 10,
    background: "rgba(239,68,68,.08)",
    color: "#fca5a5",
    fontSize: 13,
  },
  errorPanel: { display: "grid", gap: 12, textAlign: "center", padding: "24px 8px" },
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
  pixPanel: { display: "grid", gap: 14, textAlign: "center", padding: "24px 4px" },
  successBox: {
    minHeight: 260,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
    textAlign: "center",
  },
};
