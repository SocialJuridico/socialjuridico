"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { CreditCard, ShieldCheck, Lock, X, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createJurisCheckout, createProSubscription } from "@/services/stripeCheckoutService";

// Carregar Stripe uma única vez (singleton)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY
);

/* ═══════════════════════════════════════════════
   FORMULÁRIO DE PAGAMENTO (Filho do Elements)
   ═══════════════════════════════════════════════ */
function CheckoutForm({ amount, currency, onCancel, onSuccess, clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [elementsReady, setElementsReady] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !elementsReady) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const confirmParams = {
        return_url: `${window.location.origin}/dashboard/advogado?payment_status=success`,
      };

      const isSetup = clientSecret && clientSecret.startsWith("seti_");

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

      const error = confirmResult.error;
      const intent = confirmResult.paymentIntent || confirmResult.setupIntent;

      if (error) {
        setErrorMessage(error.message || "Erro ao processar pagamento.");
        setPaymentStatus("error");
      } else if (intent && intent.status === "succeeded") {
        setPaymentStatus("success");
        toast.success("Pagamento aprovado!");
        
        // Confirmar créditos diretamente via API
        if (intent && intent.id) {
          try {
            const confirmRes = await fetch("/api/checkout/confirm-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentIntentId: intent.id }),
            });
            const confirmData = await confirmRes.json();
            if (confirmData.success) {
              if (confirmData.isPro) {
                toast.success(confirmData.message || "Plano PRO ativado com sucesso!");
              } else if (confirmData.isSetup) {
                toast.success(confirmData.message || "Configuração concluída! A ativação ocorrerá em instantes.");
              } else {
                toast.success(`${confirmData.jurisAmount || ''} Juris adicionados com sucesso!`);
              }
            }
          } catch (confirmErr) {
            console.warn("[TransparentCheckout] Confirmação direta falhou, webhook irá processar:", confirmErr);
          }
        }
        
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      }
    } catch (err) {
      console.error("[TransparentCheckout] Erro inesperado:", err);
      setErrorMessage(err.message || "Erro inesperado. Tente novamente.");
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
          Seu pedido foi processado com sucesso. As atualizações serão refletidas em sua conta em instantes.
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
  const lastFetchedPriceId = useRef(null);
  const [paymentMethod, setPaymentMethod] = useState("stripe"); // 'stripe' ou 'greenn'
  const [pixData, setPixData] = useState(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [showAwaitingMessage, setShowAwaitingMessage] = useState(false);

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
      if (isPro) {
        await createProSubscription(couponData);
      } else {
        await createJurisCheckout(jurisAmount, couponData);
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao iniciar pagamento: " + err.message);
    }
  }, [jurisAmount, isPro, couponData]);

  const handleGeneratePix = async () => {
    setLoadingPix(true);
    try {
      const res = await fetch("/api/checkout/greenn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileData,
          planType: window.localStorage.getItem('sj_selected_plan_type'),
          billingCycle: window.localStorage.getItem('sj_selected_billing'),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPixData(data.data);
        toast.success(data.message);
      } else {
        toast.error(data.message || "Erro ao gerar Pix.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao gerar Pix.");
    } finally {
      setLoadingPix(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      lastFetchedPriceId.current = null;
      return;
    }
    if (!jurisAmount && !isPro) return;

    const createIntent = async () => {
      setLoading(true);
      setError(null);
      setClientSecret(null);

      try {
        let endpoint = "";
        let priceId = "";

        // Carregar metadados do localStorage se for assinatura de plano
        const planType = window.localStorage.getItem('sj_selected_plan_type');
        const billingCycle = window.localStorage.getItem('sj_selected_billing');
        const addOnType = window.localStorage.getItem('sj_selected_addon_type');
        let storedPriceId = window.localStorage.getItem('sj_selected_price_id');
        
        // Limpeza de valores inválidos
        if (storedPriceId === 'undefined' || storedPriceId === 'null') storedPriceId = null;

        console.log(`💳 [Checkout] Iniciando intent. isPro: ${isPro}, planType: ${planType}, cycle: ${billingCycle}`);

        if (isPro && billingCycle !== 'AVULSO') {
          endpoint = "/api/checkout/create-subscription-intent";
          // Tentar pegar do localStorage o Price ID específico (Start/Pro Mensal/Anual)
          priceId = storedPriceId || process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MENSAL || process.env.NEXT_PUBLIC_PRICE_PRO_MONTHLY;
          
          console.log(`📈 [Checkout] Assinatura: usando priceId ${priceId}`);
          if (!priceId) throw new Error("Plano não configurado corretamente no ambiente.");
        } else {
          endpoint = "/api/checkout/create-payment-intent";
          if (isPro && billingCycle === 'AVULSO') {
            priceId = storedPriceId;
            console.log(`💰 [Checkout] Avulso PRO: usando priceId ${priceId}`);
          } else {
            priceId = priceMap[jurisAmount];
            console.log(`⚖️ [Checkout] Juris: usando priceId ${priceId} para quantidade ${jurisAmount}`);
          }
          
          if (!priceId) throw new Error("Plano ou pacote inválido");
        }

        // Evitar chamadas duplicadas se o preço não mudou
        if (lastFetchedPriceId.current === priceId + (couponData?.id || '')) return;
        lastFetchedPriceId.current = priceId + (couponData?.id || '');

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            priceId,
            stripeCouponId: couponData?.stripe_coupon_id,
            internalCouponId: couponData?.id,
            planType,
            billingCycle,
            addOnType,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.message || "Erro ao criar pagamento");
        }

        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
          setPaymentAmount(data.amount);
          setPaymentCurrency(data.currency);
        } else {
          throw new Error("Não foi possível carregar o checkout transparente. Contate o suporte.");
        }
      } catch (err) {
        console.error("Erro ao criar PaymentIntent:", err);
        setError(err.message || "Erro ao carregar checkout transparente.");
        toast.error("Erro no checkout transparente: " + (err.message || "Tente novamente. Redirecionando..."));
        // Se falhar (ex: chave test vs live), fallback para redirect
        console.warn("[TransparentCheckout] Fallback para checkout redirect...");
        onClose();
        await fallbackToRedirect();
      } finally {
        setLoading(false);
      }
    };

    createIntent();
  }, [isOpen, jurisAmount, isPro]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

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
              {isPro ? (
                <>Plano {window.localStorage.getItem('sj_selected_plan_type') || 'PRO'} • {window.localStorage.getItem('sj_selected_billing') || ''}</>
              ) : (
                <>{jurisAmount} Juris • {priceLabel[jurisAmount] || ""}</>
              )}
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
          {/* Métodos de Pagamento */}
          <div style={modalStyles.paymentMethods}>
            <button 
              style={{
                ...modalStyles.methodBtn,
                borderColor: paymentMethod === 'stripe' ? '#d4af37' : 'rgba(255,255,255,0.1)',
                backgroundColor: paymentMethod === 'stripe' ? 'rgba(212, 175, 55, 0.1)' : 'transparent',
                color: paymentMethod === 'stripe' ? '#d4af37' : '#888'
              }}
              onClick={() => setPaymentMethod('stripe')}
            >
              <CreditCard size={16} />
              <span>Cartão de Crédito</span>
            </button>
            <button 
              style={{
                ...modalStyles.methodBtn,
                borderColor: paymentMethod === 'greenn' ? '#00e676' : 'rgba(255,255,255,0.1)',
                backgroundColor: paymentMethod === 'greenn' ? 'rgba(0, 230, 118, 0.1)' : 'transparent',
                color: paymentMethod === 'greenn' ? '#00e676' : '#888'
              }}
              onClick={() => setPaymentMethod('greenn')}
            >
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>PIX</span>
              <span>Pagamento via Pix</span>
            </button>
          </div>
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

          {paymentMethod === 'stripe' && clientSecret && (
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
                onCancel={onClose} 
                onSuccess={() => {
                  onPaymentSuccess?.();
                  onClose();
                }}
                clientSecret={clientSecret}
              />
            </Elements>
          )}

          {paymentMethod === 'greenn' && (
            <div style={{ textAlign: 'center', padding: '20px', color: '#a0a0a0' }}>
              {!showAwaitingMessage ? (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00e676' }}>Pagar com PIX</span>
                    <p style={{ fontSize: '0.9rem', marginTop: '5px' }}>Você será redirecionado para a página segura da Greenn para concluir o pagamento via Pix.</p>
                  </div>
                  
                  {/* Determinar link correto */}
                  {(() => {
                    const planType = typeof window !== 'undefined' ? window.localStorage.getItem('sj_selected_plan_type') : 'START';
                    const isPromo = couponData?.id === 'START_MES1_1099' || couponData?.id === 'PRO_MES1_1099';
                    
                    let greennLink = "";
                    if (planType === 'PRO') {
                      greennLink = isPromo ? "https://payfast.greenn.com.br/krmm54f?cupom=PRIMEIROMESPRO" : "https://payfast.greenn.com.br/krmm54f";
                    } else {
                      greennLink = isPromo ? "https://payfast.greenn.com.br/vb3mmaq?cupom=PRIMEIROMES" : "https://payfast.greenn.com.br/vb3mmaq";
                    }
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                        {isPromo && (
                          <div style={{ color: '#00e676', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '10px' }}>
                            ★ O desconto de R$ 10,99 já está embutido no link! ★
                          </div>
                        )}
                        
                        <a
                          href={greennLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            ...formStyles.payButton,
                            background: 'linear-gradient(135deg, #00e676 0%, #00c853 100%)',
                            color: '#fff',
                            boxShadow: '0 4px 15px rgba(0, 230, 118, 0.3)',
                            textDecoration: 'none',
                            width: '100%'
                          }}
                          onClick={() => {
                            toast.success("Redirecionando para o checkout...");
                            setShowAwaitingMessage(true);
                          }}
                        >
                          Ir para Pagamento Greenn
                        </a>
                      </div>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={onClose}
                    style={{ ...formStyles.cancelButton, marginTop: '15px' }}
                  >
                    Voltar
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  <div style={{ color: '#d4af37', fontSize: '3rem', marginBottom: '10px' }}>⏳</div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>Aguardando Confirmação</span>
                  <p style={{ fontSize: '0.95rem', color: '#a0a0a0', lineHeight: '1.5' }}>
                    O Social Jurídico está aguardando a confirmação do seu pagamento.
                  </p>
                  <p style={{ fontSize: '0.95rem', color: '#a0a0a0', lineHeight: '1.5' }}>
                    Assim que o pagamento for confirmado por nossa equipe, seu plano será liberado juntamente com os seus Juris!
                  </p>
                  <p style={{ fontSize: '0.9rem', color: '#00e676', fontWeight: 'bold', marginTop: '10px' }}>
                    Agradecemos a confiança e credibilidade!
                  </p>
                  
                  <button
                    type="button"
                    onClick={onClose}
                    style={{ ...formStyles.payButton, marginTop: '20px' }}
                  >
                    Fechar
                  </button>
                </div>
              )}
            </div>
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
  paymentMethods: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
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
