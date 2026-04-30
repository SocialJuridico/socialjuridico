"use client";

import { useState, useEffect, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { CreditCard, ShieldCheck, Lock, X, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createJurisCheckout } from "@/services/stripeCheckoutService";

// Carregar Stripe uma única vez (singleton)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
);

/* ═══════════════════════════════════════════════
   FORMULÁRIO DE PAGAMENTO (Filho do Elements)
   ═══════════════════════════════════════════════ */
function CheckoutForm({ amount, currency, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [elementsReady, setElementsReady] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !elementsReady) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/dashboard/advogado?payment_status=success`,
        },
        redirect: "if_required",
      });

      if (error) {
        setErrorMessage(error.message || "Erro ao processar pagamento.");
        setPaymentStatus("error");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setPaymentStatus("success");
        toast.success("Pagamento aprovado! Creditando seus Juris...");
        
        // Confirmar créditos diretamente via API (sem depender do webhook)
        try {
          const confirmRes = await fetch("/api/checkout/confirm-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
          });
          const confirmData = await confirmRes.json();
          if (confirmData.success) {
            toast.success(`${confirmData.jurisAmount || ''} Juris adicionados com sucesso!`);
          }
        } catch (confirmErr) {
          console.warn("[TransparentCheckout] Confirmação direta falhou, webhook irá processar:", confirmErr);
        }
        
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      }
    } catch (err) {
      setErrorMessage("Erro inesperado. Tente novamente.");
      setPaymentStatus("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatAmount = (cents, curr) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: curr || "brl",
    }).format(cents / 100);
  };

  if (paymentStatus === "success") {
    return (
      <div style={successStyles.container}>
        <CheckCircle2 size={56} color="#10b981" />
        <h3 style={successStyles.title}>Pagamento Aprovado!</h3>
        <p style={successStyles.text}>
          Seus créditos Juris serão adicionados automaticamente em instantes.
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
          onLoadError={(e) => {
            console.error("[TransparentCheckout] PaymentElement load error:", e);
            setErrorMessage("Não foi possível carregar o formulário de pagamento.");
          }}
          options={{
            layout: "tabs",
            defaultValues: {
              billingDetails: {
                address: { country: "BR" },
              },
            },
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
          opacity: (isProcessing || !elementsReady) ? 0.7 : 1,
          cursor: (isProcessing || !elementsReady) ? "not-allowed" : "pointer",
        }}
      >
        {isProcessing ? (
          <>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Processando...
          </>
        ) : !elementsReady ? (
          <>
            <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            Carregando...
          </>
        ) : (
          <>
            <CreditCard size={18} />
            Pagar {formatAmount(amount, currency)}
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

/* ═══════════════════════════════════════════════
   MODAL PRINCIPAL (Exportado)
   ═══════════════════════════════════════════════ */
export default function TransparentCheckoutModal({
  isOpen,
  onClose,
  jurisAmount,
  couponData,
  onPaymentSuccess,
}) {
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentCurrency, setPaymentCurrency] = useState("brl");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Mapear quantidade de Juris para Price ID
  const priceMap = {
    10: process.env.NEXT_PUBLIC_PRICE_JURIS_10,
    20: process.env.NEXT_PUBLIC_PRICE_JURIS_20,
    50: process.env.NEXT_PUBLIC_PRICE_JURIS_50,
  };

  // Fallback: redirecionar para checkout antigo se o transparente falhar
  const fallbackToRedirect = useCallback(async () => {
    try {
      toast.loading("Redirecionando para pagamento seguro...");
      await createJurisCheckout(jurisAmount, couponData);
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao iniciar pagamento: " + err.message);
    }
  }, [jurisAmount, couponData]);

  useEffect(() => {
    if (!isOpen || !jurisAmount) return;

    const createIntent = async () => {
      setLoading(true);
      setError(null);
      setClientSecret(null);

      try {
        const priceId = priceMap[jurisAmount];
        if (!priceId) throw new Error("Pacote de Juris inválido");

        const res = await fetch("/api/checkout/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            stripeCouponId: couponData?.stripe_coupon_id,
            internalCouponId: couponData?.id,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || "Erro ao criar pagamento");
        }

        setClientSecret(data.clientSecret);
        setPaymentAmount(data.amount);
        setPaymentCurrency(data.currency);
      } catch (err) {
        console.error("Erro ao criar PaymentIntent:", err);
        // Se falhar (ex: chave test vs live), fallback para redirect
        console.warn("[TransparentCheckout] Fallback para checkout redirect...");
        onClose();
        await fallbackToRedirect();
      } finally {
        setLoading(false);
      }
    };

    createIntent();
  }, [isOpen, jurisAmount]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const handleSuccess = () => {
    setClientSecret(null);
    onPaymentSuccess?.();
    onClose();
  };

  const priceLabel = { 10: "R$ 9,90", 20: "R$ 16,90", 50: "R$ 39,90" };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.card} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={modalStyles.header}>
          <div>
            <h2 style={modalStyles.title}>
              <CreditCard size={22} /> Finalizar Compra
            </h2>
            <p style={modalStyles.subtitle}>
              {jurisAmount} Juris • {priceLabel[jurisAmount] || ""}
              {couponData?.status === "success" && (
                <span style={modalStyles.couponTag}> • Cupom aplicado ✓</span>
              )}
            </p>
          </div>
          <button style={modalStyles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={modalStyles.body}>
          {loading && (
            <div style={modalStyles.loadingBox}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite" }} />
              <p>Preparando pagamento seguro...</p>
            </div>
          )}

          {error && (
            <div style={modalStyles.errorBox}>
              <p>❌ {error}</p>
              <button
                style={formStyles.cancelButton}
                onClick={onClose}
              >
                Fechar
              </button>
            </div>
          )}

          {clientSecret && (
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
                    ".Label": {
                      color: "#a0a0a0",
                    },
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
                onSuccess={handleSuccess}
                onCancel={onClose}
              />
            </Elements>
          )}
        </div>
      </div>

      {/* Keyframe para spinner */}
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   ESTILOS INLINE (mantém o componente isolado)
   ═══════════════════════════════════════════════ */
const modalStyles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(212, 175, 55, 0.08)",
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
  subtitle: {
    color: "#a0a0a0",
    fontSize: "0.9rem",
    margin: "6px 0 0 0",
  },
  couponTag: {
    color: "#10b981",
    fontWeight: 600,
  },
  closeBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    color: "#888",
    padding: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: "24px",
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "40px 0",
    color: "#a0a0a0",
  },
  errorBox: {
    textAlign: "center",
    padding: "30px 0",
    color: "#ef4444",
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
  elementWrapper: {
    marginBottom: "20px",
  },
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
  title: {
    color: "#10b981",
    fontSize: "1.3rem",
    fontWeight: 700,
    margin: 0,
  },
  text: {
    color: "#a0a0a0",
    fontSize: "0.95rem",
    margin: 0,
  },
};
