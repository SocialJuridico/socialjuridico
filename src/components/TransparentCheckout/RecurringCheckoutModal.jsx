"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, CreditCard, Loader2, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./RecurringCheckoutModal.module.css";

let sdkPromise = null;

function loadSdk() {
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("mercadopago-js-v2");
    const script = existing || document.createElement("script");
    const loaded = () => window.MercadoPago
      ? resolve(window.MercadoPago)
      : reject(new Error("SDK do Mercado Pago indisponível."));
    const failed = () => reject(new Error("Não foi possível carregar o Mercado Pago."));
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener("error", failed, { once: true });
    if (!existing) {
      script.id = "mercadopago-js-v2";
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      document.head.appendChild(script);
    }
  }).catch((error) => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}

function money(value) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));
}

export default function RecurringCheckoutModal({
  isOpen,
  onClose,
  planType,
  billingCycle,
  displayAmount,
  renewalAmount,
  isPromoEligible,
  couponData,
  onPaymentSuccess,
}) {
  const brickId = useRef(`sj-recurring-${Math.random().toString(36).slice(2)}`);
  const controller = useRef(null);
  const submitting = useRef(false);
  const notified = useRef(false);
  const [configuration, setConfiguration] = useState(null);
  const [stage, setStage] = useState("loading");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [retryVersion, setRetryVersion] = useState(0);

  const notifySuccess = useCallback(async () => {
    if (notified.current) return;
    notified.current = true;
    toast.success("Plano ativado com sucesso!");
    await onPaymentSuccess?.();
  }, [onPaymentSuccess]);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setConfiguration(null);
    setResult(null);
    setError("");
    setStage("loading");
    notified.current = false;
    submitting.current = false;

    async function loadConfiguration() {
      try {
        const response = await fetch("/api/checkout/mercadopago/recurring-config", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success || !data.publicKey || !data.payerEmail) {
          throw new Error(data?.message || "Configuração de pagamento indisponível.");
        }
        if (!cancelled) setConfiguration(data);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Não foi possível carregar o checkout.");
          setStage("blocked");
        }
      }
    }

    void loadConfiguration();
    return () => {
      cancelled = true;
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !configuration || result) return undefined;
    let cancelled = false;
    let localController = null;
    submitting.current = false;

    async function mountBrick() {
      setStage("loading");
      setError("");
      try {
        const MercadoPago = await loadSdk();
        if (cancelled) return;
        const mp = new MercadoPago(configuration.publicKey, { locale: "pt-BR" });
        localController = await mp.bricks().create("payment", brickId.current, {
          initialization: {
            amount: Number(displayAmount),
            payer: { email: configuration.payerEmail },
          },
          customization: {
            paymentMethods: { creditCard: "all" },
            visual: { style: { theme: "dark" } },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setStage("ready");
            },
            onError: () => {
              if (!cancelled) {
                setError("Não foi possível carregar a forma de pagamento.");
                setStage("blocked");
              }
            },
            onSubmit: async ({ formData }) => {
              if (submitting.current) return;
              submitting.current = true;
              if (!cancelled) {
                setStage("submitting");
                setError("");
              }
              try {
                const response = await fetch("/api/checkout/mercadopago", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    planType,
                    billingCycle,
                    jurisAmount: 0,
                    aiCreditsAmount: 0,
                    isPromoEligible: Boolean(isPromoEligible),
                    internalCouponId: couponData?.id || null,
                    paymentData: formData,
                  }),
                });
                const data = await response.json().catch(() => null);
                if (!response.ok || !data?.success) {
                  throw new Error(data?.message || "Não foi possível confirmar a assinatura. Verifique a tentativa anterior antes de tentar novamente.");
                }
                if (cancelled) return;
                setResult(data);
                setStage(data.approved ? "approved" : "pending");
                if (data.approved) await notifySuccess();
              } catch (submitError) {
                if (!cancelled) {
                  setError(submitError.message || "Não foi possível confirmar a assinatura.");
                  setStage("blocked");
                }
                // Do not resubmit this token, even after a network failure.
                throw submitError;
              }
            },
          },
        });
        if (cancelled) {
          await localController?.unmount?.();
          return;
        }
        controller.current = localController;
      } catch (mountError) {
        if (!cancelled) {
          setError(mountError.message || "Não foi possível inicializar o pagamento.");
          setStage("blocked");
        }
      }
    }

    void mountBrick();
    return () => {
      cancelled = true;
      const instance = localController || controller.current;
      controller.current = null;
      if (instance?.unmount) Promise.resolve(instance.unmount()).catch(() => undefined);
    };
  }, [isOpen, configuration, result, retryVersion, displayAmount, planType, billingCycle, isPromoEligible, couponData?.id, notifySuccess]);

  useEffect(() => {
    if (!isOpen || !result?.subscriptionId || result.approved) return undefined;
    let cancelled = false;
    let inFlight = false;
    async function checkStatus() {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/checkout/mercadopago/status?subscriptionId=${encodeURIComponent(result.subscriptionId)}`, { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success || cancelled) return;
        setResult((current) => ({ ...current, ...data }));
        if (data.approved) {
          setStage("approved");
          await notifySuccess();
        } else if (["rejected", "cancelled", "canceled"].includes(String(data.status || "").toLowerCase())) {
          setStage("blocked");
          setError(data.activationMessage || "A primeira cobrança não foi aprovada.");
        }
      } catch {
        // Polling failures do not authorize another card submission.
      } finally {
        inFlight = false;
      }
    }
    void checkStatus();
    const interval = window.setInterval(checkStatus, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isOpen, result?.subscriptionId, result?.approved, notifySuccess]);

  if (!isOpen || typeof document === "undefined") return null;
  const processing = stage === "submitting";
  const canRetry = stage === "blocked" && !result && Boolean(configuration) && !submitting.current;

  return createPortal(
    <div className={styles.overlay} onMouseDown={(event) => {
      if (event.target === event.currentTarget && !processing) onClose?.();
    }}>
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="recurring-checkout-title">
        <header className={styles.header}>
          <div>
            <h2 id="recurring-checkout-title"><CreditCard size={21} /> Assinatura Social Jurídico</h2>
            <p>Plano {planType} · {billingCycle === "ANNUAL" ? "Anual" : "Mensal"} · {money(displayAmount)}</p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} disabled={processing} aria-label="Fechar checkout"><X size={20} /></button>
        </header>
        <div className={styles.body}>
          {stage === "approved" ? (
            <div className={styles.status}><CheckCircle2 size={42} /><strong>Pagamento aprovado</strong><p>Seu plano foi ativado após a confirmação da cobrança.</p></div>
          ) : result ? (
            <div className={styles.status}>
              <ShieldCheck size={40} />
              <strong>{stage === "blocked" ? "Cobrança não confirmada" : "Assinatura em confirmação"}</strong>
              <p>{result.activationMessage || "Estamos aguardando a confirmação da primeira cobrança. Nenhum Juris será creditado antes dela."}</p>
              {stage === "pending" && <p><Loader2 className={styles.spinner} size={17} /> Acompanhando o pagamento...</p>}
            </div>
          ) : (
            <>
              <div className={styles.security}><ShieldCheck size={15} /> Pagamento seguro via Mercado Pago</div>
              <div className={styles.info}>
                {isPromoEligible ? "A primeira cobrança é promocional." : couponData ? "O cupom será aplicado à primeira cobrança conforme as regras do plano." : "Renovação automática no ciclo selecionado."}
                {Number(renewalAmount) > 0 && <p>Próximas cobranças: <strong>{money(renewalAmount)}</strong>.</p>}
              </div>
              <div id={brickId.current} className={styles.brick} hidden={stage === "blocked"} />
              {stage === "loading" && <p className={styles.loading}><Loader2 className={styles.spinner} size={18} /> Carregando pagamento...</p>}
              {processing && <p className={styles.loading}><Loader2 className={styles.spinner} size={18} /> Enviando assinatura...</p>}
              <p className={styles.securityCopy}>Os dados do cartão são tokenizados pelo Mercado Pago e não são armazenados pelo Social Jurídico.</p>
            </>
          )}
          {error && <div className={styles.error} role="alert">{error}</div>}
          {canRetry && <button type="button" className={styles.secondary} onClick={() => {
            // A fresh Brick is required; never resend the previous formData.
            setResult(null);
            setRetryVersion((current) => current + 1);
          }}>Reiniciar checkout</button>}
        </div>
      </section>
    </div>,
    document.body,
  );
}
