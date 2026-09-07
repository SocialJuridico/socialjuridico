"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";

const endpoint = "/api/checkout/mercadopago";
const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

export default function HostedCheckoutModal({
  isOpen, onClose, isPro = false, planType, billingCycle, jurisAmount,
  aiCreditsAmount, displayAmount, renewalAmount, isPromoEligible = false,
  couponData, onPaymentSuccess,
}) {
  const requestId = useRef(null);
  const started = useRef(false);
  const notified = useRef(false);
  const [result, setResult] = useState(null);
  const [stage, setStage] = useState("loading");
  const [error, setError] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  const redirect = useCallback((url) => {
    if (!url) return;
    setRedirectUrl(url);
    setStage("redirecting");
    window.location.assign(url);
  }, []);

  useEffect(() => {
    if (!isOpen || started.current) return;
    started.current = true;
    requestId.current = crypto.randomUUID();
    let cancelled = false;
    async function start() {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: requestId.current,
            planType: isPro ? planType : null,
            billingCycle: isPro ? billingCycle : null,
            jurisAmount: isPro || aiCreditsAmount ? 0 : jurisAmount,
            aiCreditsAmount: aiCreditsAmount || 0,
            isPromoEligible: Boolean(isPromoEligible),
            internalCouponId: couponData?.id || null,
          }),
        });
        const data = await response.json().catch(() => null);
        if (cancelled) return;
        setResult(data);
        if (data?.checkoutUrl) {
          redirect(data.checkoutUrl);
        } else if (data?.reference) {
          setStage("pending");
          setError(data?.message || "A tentativa anterior está em confirmação. Consulte o estado antes de tentar novamente.");
        } else {
          setStage("error");
          setError(data?.message || "Não foi possível iniciar o pagamento.");
        }
      } catch {
        if (cancelled) return;
        setStage("pending");
        setError("Não foi possível confirmar a abertura do checkout. Não faça outra cobrança antes de verificar a tentativa.");
      }
    }
    void start();
    return () => { cancelled = true; };
  }, [isOpen, isPro, planType, billingCycle, jurisAmount, aiCreditsAmount, isPromoEligible, couponData?.id, redirect]);

  useEffect(() => {
    if (!isOpen || !result?.reference || stage !== "pending") return;
    let cancelled = false;
    let busy = false;
    async function check() {
      if (busy || cancelled) return;
      busy = true;
      try {
        const response = await fetch(`${endpoint}/status?reference=${encodeURIComponent(result.reference)}`, { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (cancelled || !response.ok || !data?.success) return;
        setResult((previous) => ({ ...previous, ...data }));
        if (data.checkoutUrl) {
          redirect(data.checkoutUrl);
        } else if (data.approved) {
          setStage("approved");
          setError("");
          if (!notified.current) {
            notified.current = true;
            toast.success("Pagamento confirmado pelo Mercado Pago.");
            await onPaymentSuccess?.();
          }
        } else if (["rejected", "cancelled", "canceled"].includes(String(data.status || "").toLowerCase())) {
          setStage("rejected");
          setError(data.activationMessage || "O pagamento não foi aprovado. Nenhuma nova cobrança será feita automaticamente.");
        }
      } catch {
        // A falha de consulta não autoriza uma nova cobrança.
      } finally { busy = false; }
    }
    void check();
    const interval = window.setInterval(check, 4000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [isOpen, result?.reference, stage, redirect, onPaymentSuccess]);

  useEffect(() => {
    if (isOpen) return;
    started.current = false;
    notified.current = false;
    setResult(null);
    setStage("loading");
    setError("");
    setRedirectUrl("");
  }, [isOpen]);

  if (!isOpen || typeof document === "undefined") return null;
  const description = isPro
    ? `Plano ${planType || "START"} · ${billingCycle === "ANNUAL" ? "Anual" : billingCycle === "AVULSO" ? "Avulso" : "Mensal"}`
    : aiCreditsAmount ? `${aiCreditsAmount} consultas de IA` : `${jurisAmount} Juris`;

  return createPortal(
    <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.75)", display: "grid", placeItems: "center", padding: 16 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="hosted-checkout-title" style={{ width: "100%", maxWidth: 440, background: "#18181b", color: "#fafafa", border: "1px solid #3f3f46", borderRadius: 16, padding: 24, display: "grid", gap: 16 }}>
        <h2 id="hosted-checkout-title" style={{ margin: 0, fontSize: 21 }}>Pagamento Social Jurídico</h2>
        <p style={{ margin: 0 }}>{description} · <strong>{money(displayAmount)}</strong></p>
        {isPro && Number(renewalAmount) > 0 && <p style={{ margin: 0, fontSize: 14 }}>Próximas cobranças: {money(renewalAmount)} no ciclo contratado.</p>}
        {stage === "loading" && <p role="status">Preparando o checkout seguro do Mercado Pago...</p>}
        {stage === "redirecting" && <p role="status">Redirecionando para o Mercado Pago...</p>}
        {stage === "pending" && <p role="status">Estamos verificando a tentativa. Você não precisa informar o cartão novamente.</p>}
        {stage === "approved" && <p role="status">Pagamento confirmado. Seus benefícios estão disponíveis.</p>}
        {error && <p role="alert" style={{ color: "#fca5a5", margin: 0 }}>{error}</p>}
        {redirectUrl && <a href={redirectUrl} style={{ color: "#93c5fd", fontWeight: 600 }}>Continuar no Mercado Pago</a>}
        <p style={{ fontSize: 13, color: "#a1a1aa", margin: 0 }}>O cartão é informado no ambiente do Mercado Pago. O Social Jurídico não solicita o número ou CVV neste checkout.</p>
        <button type="button" onClick={onClose} style={{ padding: 12, borderRadius: 8, border: "1px solid #52525b", background: "transparent", color: "inherit", cursor: "pointer" }}>Voltar ao painel</button>
      </section>
    </div>, document.body,
  );
}
