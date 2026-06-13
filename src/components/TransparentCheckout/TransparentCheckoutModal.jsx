"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  buildDashboardReturnUrl,
  createJurisCheckout,
  createProSubscription,
} from "@/services/stripeCheckoutService";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);

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

function readCheckoutSettings() {
  if (typeof window === "undefined") {
    return { planType: "PRO", billingCycle: "", addOnType: "", priceId: "" };
  }
  const value = (key) => {
    const stored = window.localStorage.getItem(key);
    return stored && !["undefined", "null"].includes(stored) ? stored : "";
  };
  return {
    planType: value("sj_selected_plan_type") || "PRO",
    billingCycle: value("sj_selected_billing"),
    addOnType: value("sj_selected_addon_type"),
    priceId: value("sj_selected_price_id"),
  };
}

function CheckoutForm({ amount, currency, onCancel, onSuccess, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [elementsReady, setElementsReady] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !elementsReady || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const confirmParams = {
        return_url: buildDashboardReturnUrl("success", "payment_status"),
      };
      const isSetup = clientSecret?.startsWith("seti_");
      const confirmResult = isSetup
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

      const confirmationError = confirmResult.error;
      const intent = confirmResult.paymentIntent || confirmResult.setupIntent;
      if (confirmationError) {
        setErrorMessage(
          confirmationError.message || "Erro ao processar pagamento.",
        );
        setPaymentStatus("error");
        return;
      }

      if (intent?.status === "succeeded") {
        setPaymentStatus("success");
        toast.success("Pagamento aprovado!");
        try {
          const response = await fetch("/api/checkout/confirm-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId: intent.id }),
          });
          const data = await response.json().catch(() => null);
          if (data?.success) {
            if (data.isPro) {
              toast.success(data.message || "Plano PRO ativado com sucesso!");
            } else if (data.isSetup) {
              toast.success(
                data.message ||
                  "Configuração concluída. A ativação ocorrerá em instantes.",
              );
            } else {
              toast.success(
                `${data.jurisAmount || ""} Juris adicionados com sucesso!`,
              );
            }
          }
        } catch (confirmationFailure) {
          console.warn(
            "[TransparentCheckout] Confirmação direta falhou; o webhook continuará o processamento:",
            confirmationFailure,
          );
        }
        window.setTimeout(() => onSuccess?.(), 1500);
      }
    } catch (error) {
      console.error("[TransparentCheckout] Erro inesperado:", error);
      setErrorMessage(error.message || "Erro inesperado. Tente novamente.");
      setPaymentStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "brl",
  }).format(Number(amount || 0) / 100);

  if (paymentStatus === "success") {
    return (
      <div style={successStyles.container}>
        <CheckCircle2 size={56} color="#10b981" />
        <h3 style={successStyles.title}>Pagamento Aprovado!</h3>
        <p style={successStyles.text}>
          Seu pedido foi processado com sucesso. As atualizações serão refletidas
          em sua conta em instantes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: "100%" }}>
      <div style={formStyles.securityBadge}>
        <ShieldCheck size={14} />
        <span>Pagamento 100% seguro via Stripe</span>
        <Lock size={12} />
      </div>

      <div style={formStyles.elementWrapper}>
        <PaymentElement
          onReady={() => setElementsReady(true)}
          onLoadError={(event) => {
            console.error("[TransparentCheckout] PaymentElement load error:", event);
            setErrorMessage(
              "Não foi possível carregar o formulário de pagamento.",
            );
          }}
          options={{
            layout: "tabs",
            defaultValues: { billingDetails: { address: { country: "BR" } } },
          }}
        />
      </div>

      {errorMessage && (
        <div style={formStyles.errorBox}>
          <p>{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isProcessing || !elementsReady}
        style={{
          ...formStyles.payButton,
          opacity: isProcessing || !elementsReady ? 0.7 : 1,
          cursor: isProcessing || !elementsReady ? "not-allowed" : "pointer",
        }}
      >
        {isProcessing || !elementsReady ? (
          <>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            {isProcessing ? "Processando..." : "Carregando..."}
          </>
        ) : (
          <>
            <CreditCard size={18} /> Pagar {formattedAmount}
          </>
        )}
      </button>

      <button
        type="button"
        onClick={onCancel}
        style={formStyles.cancelButton}
        disabled={isProcessing}
      >
        Cancelar
      </button>
    </form>
  );
}

export default function TransparentCheckoutModal({
  isOpen,
  onClose,
  jurisAmount,
  isPro = false,
  couponData,
  profileData,
  onPaymentSuccess,
}) {
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentCurrency, setPaymentCurrency] = useState("brl");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe");
  const [loadingPix, setLoadingPix] = useState(false);
  const [showAwaitingMessage, setShowAwaitingMessage] = useState(false);
  const [checkoutSettings, setCheckoutSettings] = useState({
    planType: "PRO",
    billingCycle: "",
    addOnType: "",
    priceId: "",
  });
  const lastFetchedKey = useRef("");

  const fallbackToRedirect = useCallback(async () => {
    try {
      toast.loading("Redirecionando para pagamento seguro...");
      if (isPro) await createProSubscription(couponData);
      else await createJurisCheckout(jurisAmount, couponData);
    } catch (fallbackError) {
      toast.dismiss();
      toast.error(`Erro ao iniciar pagamento: ${fallbackError.message}`);
    }
  }, [couponData, isPro, jurisAmount]);

  useEffect(() => {
    if (!isOpen) {
      lastFetchedKey.current = "";
      setClientSecret(null);
      setError(null);
      setShowAwaitingMessage(false);
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || (!jurisAmount && !isPro)) return;

    const settings = readCheckoutSettings();
    setCheckoutSettings(settings);
    let cancelled = false;

    async function createIntent() {
      setLoading(true);
      setError(null);
      setClientSecret(null);

      try {
        let endpoint = "/api/checkout/create-payment-intent";
        let priceId = "";

        if (isPro && settings.billingCycle !== "AVULSO") {
          endpoint = "/api/checkout/create-subscription-intent";
          priceId =
            settings.priceId ||
            process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MENSAL ||
            process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY;
        } else if (isPro && settings.billingCycle === "AVULSO") {
          priceId = settings.priceId;
        } else if (![10, 20, 50].includes(Number(jurisAmount))) {
          priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_START_MENSAL;
        } else {
          priceId = JURIS_PRICE_MAP[jurisAmount];
        }

        if (!priceId) throw new Error("Plano ou pacote não configurado corretamente.");

        const requestKey = [
          priceId,
          couponData?.id || "",
          settings.planType,
          settings.billingCycle,
          settings.addOnType,
        ].join(":");
        if (lastFetchedKey.current === requestKey) return;
        lastFetchedKey.current = requestKey;

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            stripeCouponId: couponData?.stripe_coupon_id,
            internalCouponId: couponData?.id,
            planType: settings.planType,
            billingCycle: settings.billingCycle,
            addOnType: settings.addOnType,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Erro ao criar pagamento.");
        }
        if (!data.clientSecret) {
          throw new Error(
            "Não foi possível carregar o checkout transparente. Contate o suporte.",
          );
        }

        if (!cancelled) {
          setClientSecret(data.clientSecret);
          setPaymentAmount(data.amount);
          setPaymentCurrency(data.currency);
        }
      } catch (intentError) {
        if (cancelled) return;
        console.error("[TransparentCheckout] Erro ao criar intent:", intentError);
        setError(intentError.message || "Erro ao carregar checkout transparente.");
        toast.error(
          `Erro no checkout transparente: ${intentError.message || "Tente novamente."}`,
        );
        onClose?.();
        await fallbackToRedirect();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void createIntent();
    return () => {
      cancelled = true;
    };
  }, [
    couponData?.id,
    couponData?.stripe_coupon_id,
    fallbackToRedirect,
    isOpen,
    isPro,
    jurisAmount,
    onClose,
  ]);

  if (!isOpen) return null;

  const isPromoEligible = isPro
    ? profileData?.promo_pro_used === false && profileData?.plan_type !== "PRO"
    : profileData?.promo_start_used === false &&
      profileData?.plan_type !== "START";

  async function openInfinitePay() {
    if (loadingPix) return;
    setLoadingPix(true);
    toast.loading("Gerando link de pagamento...");
    try {
      const response = await fetch("/api/checkout/infinitepay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: isPro ? "PRO" : "START",
          jurisAmount,
          isPromoEligible,
          customer: {
            name: profileData?.name,
            email: profileData?.email,
            phone: profileData?.phone,
          },
        }),
      });
      const data = await response.json().catch(() => null);
      toast.dismiss();
      if (!response.ok || !data?.success || !data.url) {
        throw new Error(data?.message || "Erro ao gerar link.");
      }
      toast.success("Redirecionando...");
      window.open(data.url, "_blank", "noopener,noreferrer");
      setShowAwaitingMessage(true);
    } catch (pixError) {
      toast.dismiss();
      toast.error(pixError.message || "Erro de conexão.");
      console.error("[TransparentCheckout] InfinitePay:", pixError);
    } finally {
      setLoadingPix(false);
    }
  }

  return (
    <div
      style={modalStyles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loadingPix) onClose?.();
      }}
    >
      <section
        style={modalStyles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby="transparent-checkout-title"
      >
        <header style={modalStyles.header}>
          <div>
            <h2 id="transparent-checkout-title" style={modalStyles.title}>
              <CreditCard size={22} /> Finalizar Compra
            </h2>
            <p style={modalStyles.subtitle}>
              {isPro ? (
                <>
                  Plano {checkoutSettings.planType || "PRO"} •{" "}
                  {checkoutSettings.billingCycle || ""}
                </>
              ) : (
                <>
                  {jurisAmount} Juris • {JURIS_PRICE_LABELS[jurisAmount] || ""}
                </>
              )}
              {couponData?.status === "success" && (
                <span style={modalStyles.couponTag}> • Cupom aplicado ✓</span>
              )}
            </p>
          </div>
          <button
            type="button"
            style={modalStyles.closeBtn}
            onClick={onClose}
            aria-label="Fechar checkout"
          >
            <X size={20} />
          </button>
        </header>

        <div style={modalStyles.body}>
          <div style={modalStyles.paymentMethods}>
            <button
              type="button"
              style={{
                ...modalStyles.methodBtn,
                borderColor:
                  paymentMethod === "stripe"
                    ? "#d4af37"
                    : "rgba(255,255,255,0.1)",
                backgroundColor:
                  paymentMethod === "stripe"
                    ? "rgba(212, 175, 55, 0.1)"
                    : "transparent",
                color: paymentMethod === "stripe" ? "#d4af37" : "#888",
              }}
              onClick={() => setPaymentMethod("stripe")}
            >
              <CreditCard size={16} />
              <span>Cartão de Crédito</span>
            </button>
            <button
              type="button"
              style={{
                ...modalStyles.methodBtn,
                borderColor:
                  paymentMethod === "infinitepay"
                    ? "#00e676"
                    : "rgba(255,255,255,0.1)",
                backgroundColor:
                  paymentMethod === "infinitepay"
                    ? "rgba(0, 230, 118, 0.1)"
                    : "transparent",
                color: paymentMethod === "infinitepay" ? "#00e676" : "#888",
              }}
              onClick={() => setPaymentMethod("infinitepay")}
            >
              <strong style={{ fontSize: "14px" }}>PIX</strong>
              <span>Pagamento via Pix</span>
            </button>
          </div>

          {loading && (
            <div style={modalStyles.loadingBox}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
              <p>Preparando pagamento seguro...</p>
            </div>
          )}

          {error && !loading && (
            <div style={modalStyles.errorBox}>
              <p>❌ {error}</p>
              <button style={formStyles.cancelButton} onClick={onClose}>
                Fechar
              </button>
            </div>
          )}

          {paymentMethod === "stripe" && clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "night",
                  variables: {
                    colorPrimary: "#d4af37",
                    colorBackground: "#1a1a2e",
                    colorText: "#e0e0e0",
                    colorDanger: "#ef4444",
                    fontFamily: "Inter, system-ui, sans-serif",
                    borderRadius: "8px",
                    spacingUnit: "4px",
                  },
                  rules: {
                    ".Input": {
                      backgroundColor: "#16213e",
                      border: "1px solid rgba(212, 175, 55, 0.2)",
                      color: "#e0e0e0",
                    },
                    ".Input:focus": {
                      border: "1px solid #d4af37",
                      boxShadow: "0 0 0 2px rgba(212, 175, 55, 0.15)",
                    },
                    ".Label": { color: "#a0a0a0" },
                    ".Tab": {
                      backgroundColor: "#16213e",
                      border: "1px solid rgba(212, 175, 55, 0.15)",
                      color: "#a0a0a0",
                    },
                    ".Tab--selected": {
                      backgroundColor: "#1a1a2e",
                      borderColor: "#d4af37",
                      color: "#d4af37",
                    },
                  },
                },
                locale: "pt-BR",
              }}
            >
              <CheckoutForm
                amount={paymentAmount}
                currency={paymentCurrency}
                onCancel={onClose}
                onSuccess={() => {
                  onPaymentSuccess?.();
                  onClose?.();
                }}
                clientSecret={clientSecret}
              />
            </Elements>
          )}

          {paymentMethod === "infinitepay" && (
            <div style={modalStyles.pixArea}>
              <div style={{ marginBottom: "20px" }}>
                <strong style={{ fontSize: "1.2rem", color: "#00e676" }}>
                  Pagar com PIX
                </strong>
                <p style={{ fontSize: "0.9rem", marginTop: "5px" }}>
                  Você será redirecionado para a página segura da InfinitePay
                  para concluir o pagamento via Pix.
                </p>
              </div>

              {showAwaitingMessage ? (
                <div style={modalStyles.awaitingBox}>
                  <Loader2
                    size={48}
                    style={{ animation: "spin 1s linear infinite", color: "#00e676" }}
                  />
                  <div>
                    <strong style={{ color: "#fff", fontSize: "1.1rem" }}>
                      Aguardando confirmação do pagamento...
                    </strong>
                    <p style={{ fontSize: "0.9rem" }}>
                      Conclua o pagamento no site da InfinitePay. Assim que
                      recebermos a confirmação, sua conta será atualizada.
                    </p>
                  </div>
                  <button
                    type="button"
                    style={modalStyles.pixSecondaryButton}
                    onClick={() => setShowAwaitingMessage(false)}
                  >
                    Voltar / Gerar novo link
                  </button>
                </div>
              ) : (
                <div style={modalStyles.pixActions}>
                  {isPromoEligible && !jurisAmount && (
                    <strong style={{ color: "#00e676", fontSize: "0.9rem" }}>
                      ★ Você está aproveitando o desconto do 1º mês! ★
                    </strong>
                  )}
                  <button
                    type="button"
                    disabled={loadingPix}
                    style={{
                      ...formStyles.payButton,
                      background:
                        "linear-gradient(135deg, #00e676 0%, #00c853 100%)",
                      color: "#fff",
                      opacity: loadingPix ? 0.7 : 1,
                      cursor: loadingPix ? "not-allowed" : "pointer",
                    }}
                    onClick={openInfinitePay}
                  >
                    {loadingPix ? (
                      <>
                        <Loader2
                          size={16}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                        Gerando Link...
                      </>
                    ) : (
                      "Ir para Pagamento InfinitePay"
                    )}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                style={{ ...formStyles.cancelButton, marginTop: "15px" }}
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      </section>

      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

const modalStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 99999,
    padding: "20px",
  },
  card: {
    background: "linear-gradient(145deg, #1a1a2e 0%, #0f0f23 100%)",
    borderRadius: "16px",
    border: "1px solid rgba(212, 175, 55, 0.2)",
    width: "100%",
    maxWidth: "480px",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow:
      "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(212, 175, 55, 0.08)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "24px 24px 16px",
    borderBottom: "1px solid rgba(212, 175, 55, 0.1)",
  },
  title: {
    color: "#fff",
    fontSize: "1.2rem",
    fontWeight: 700,
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  subtitle: { color: "#a0a0a0", fontSize: "0.9rem", margin: "6px 0 0" },
  couponTag: { color: "#10b981", fontWeight: 600 },
  closeBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#888",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
  },
  body: { padding: "24px" },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "40px 0",
    color: "#a0a0a0",
  },
  errorBox: { textAlign: "center", padding: "30px 0", color: "#ef4444" },
  paymentMethods: { display: "flex", gap: "10px", marginBottom: "20px" },
  methodBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    transition: "all 0.2s ease",
  },
  pixArea: { textAlign: "center", padding: "20px", color: "#a0a0a0" },
  awaitingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    padding: "20px",
  },
  pixActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "15px",
  },
  pixSecondaryButton: {
    padding: "10px 20px",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#fff",
    cursor: "pointer",
  },
};

const formStyles = {
  securityBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    color: "#10b981",
    fontSize: "0.8rem",
    fontWeight: 500,
    marginBottom: "20px",
    padding: "8px",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: "8px",
    border: "1px solid rgba(16, 185, 129, 0.15)",
  },
  elementWrapper: { marginBottom: "20px" },
  errorBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "16px",
    color: "#ef4444",
    fontSize: "0.85rem",
    textAlign: "center",
  },
  payButton: {
    width: "100%",
    padding: "14px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #d4af37 0%, #b8972e 100%)",
    color: "#1a1a2e",
    fontSize: "1rem",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)",
  },
  cancelButton: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: "#888",
    fontSize: "0.9rem",
    cursor: "pointer",
    marginTop: "10px",
    transition: "all 0.2s ease",
  },
};

const successStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    padding: "40px 20px",
    textAlign: "center",
  },
  title: { color: "#10b981", fontSize: "1.3rem", fontWeight: 700, margin: 0 },
  text: { color: "#a0a0a0", fontSize: "0.95rem", margin: 0 },
};
