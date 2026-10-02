"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, Copy, HandCoins, LoaderCircle, QrCode, ShieldCheck, X } from "lucide-react";

import base from "../TransparentCheckout/HybridCheckoutModal.module.css";
import styles from "./PromoInvestModal.module.css";

const PROMO_ENDPOINT = "/api/checkout/quer-investir-quanto";
const STATUS_ENDPOINT = "/api/checkout/hybrid";
const SUGGESTIONS = [1000, 3000, 5000, 10000];
const TERMINAL = ["expired", "cancelled", "canceled"];
const money = (cents) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function toCents(text) {
  const digits = String(text || "").replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function Checkout({ onClose, onPaymentSuccess }) {
  const [info, setInfo] = useState(null);
  const [amount, setAmount] = useState("");
  const [data, setData] = useState(null);
  const [id, setId] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const requestId = useRef(null);
  const complete = useRef(false);
  const inFlight = useRef(false);
  const callback = useRef(onPaymentSuccess);
  const dialog = useRef(null);
  useEffect(() => { callback.current = onPaymentSuccess; }, [onPaymentSuccess]);

  const cents = toCents(amount);
  const valid = info && cents >= info.minCents && cents <= info.maxCents;

  const accept = useCallback(async (result) => {
    setData(result);
    if (result.checkoutId) setId(result.checkoutId);
    if (result.approved && !complete.current) {
      complete.current = true;
      requestId.current = null;
      await callback.current?.();
    }
  }, []);

  const check = useCallback(async (checkoutId) => {
    if (!checkoutId || inFlight.current || complete.current) return;
    inFlight.current = true;
    try {
      const response = await fetch(`${STATUS_ENDPOINT}?checkout=${encodeURIComponent(checkoutId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setError("");
      await accept(result);
    } catch (failure) {
      setError(failure.message || "A confirmação ainda não está disponível.");
    } finally {
      inFlight.current = false;
    }
  }, [accept]);

  useEffect(() => {
    let alive = true;
    fetch(PROMO_ENDPOINT, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        if (!alive) return;
        setInfo(result);
        if (result.openCheckout) {
          setAmount(String(result.openCheckout.amount));
          setId(result.openCheckout.id);
          void check(result.openCheckout.id);
        }
      })
      .catch((failure) => alive && setError(failure.message || "Não foi possível carregar a promoção."));
    return () => { alive = false; };
  }, [check]);

  useEffect(() => {
    if (!id || data?.approved || TERMINAL.includes(data?.status)) return undefined;
    const timer = setInterval(() => check(id), 4000);
    return () => clearInterval(timer);
  }, [id, data?.approved, data?.status, check]);

  useEffect(() => {
    const before = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [onClose]);

  function reset() {
    requestId.current = null;
    setId(null); setData(null); setPrevious(null); setCopied(false); setError("");
  }

  async function start(replaceCheckoutId = null) {
    if (busy || !valid) return;
    setBusy(true); setError("");
    requestId.current = requestId.current || crypto.randomUUID();
    try {
      const response = await fetch(PROMO_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: requestId.current, amount: (cents / 100).toFixed(2), replaceCheckoutId }),
      });
      const result = await response.json();
      if (!response.ok) {
        requestId.current = null;
        if (result.code === "CHECKOUT_OPEN" && result.previousCheckout) { setPrevious(result.previousCheckout); return; }
        throw new Error(result.message);
      }
      setPrevious(null);
      await accept(result);
    } catch (failure) {
      setError(failure.message || "Não foi possível gerar o Pix.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (busy || !id) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(STATUS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", checkoutId: id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      reset();
    } catch (failure) {
      setError(failure.message || "Não foi possível encerrar este Pix. Verifique o pagamento.");
    } finally {
      setBusy(false);
    }
  }

  const terminal = TERMINAL.includes(data?.status);
  const showForm = info?.eligible && !data?.qrCode && !data?.approved && !(id && !terminal);

  return (
    <div className={base.overlay}>
      <section ref={dialog} tabIndex={-1} className={base.modal} role="dialog" aria-modal="true" aria-labelledby="promo-invest-title">
        <header className={base.header}>
          <div>
            <span className={styles.tag}><HandCoins size={14} aria-hidden="true" /> Promoção</span>
            <h2 id="promo-invest-title">Quer Investir Quanto?</h2>
            <p>Você escolhe o valor e usa o Plano PRO por 30 dias.</p>
          </div>
          <button className={base.close} onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </header>

        <div className={base.body}>
          {!info && !error && <p role="status" className={base.waiting}><LoaderCircle size={16} className={base.spinner} /> Carregando promoção…</p>}

          {info && !info.enabled && <div className={base.status}><strong>Promoção encerrada</strong><p>Confira os planos disponíveis no menu.</p></div>}

          {info?.enabled && !info.eligible && !data?.approved && (
            <div className={base.notice} role="status"><strong>Promoção indisponível</strong><p>{info.reason}</p></div>
          )}

          {data?.approved && (
            <div role="status" className={base.status}>
              <strong>Pagamento confirmado</strong>
              <p>Seu Plano PRO está ativo por 30 dias e os Juris do plano já estão na sua carteira.</p>
              <button className={base.primary} onClick={onClose}>Continuar</button>
            </div>
          )}

          {showForm && (
            <>
              <ul className={styles.rules}>
                <li>Pagamento único via <strong>Pix</strong>, sem renovação automática.</li>
                <li>Libera o <strong>Plano PRO por 30 dias</strong> e os Juris do plano na sua carteira.</li>
                <li>Pode ser usada <strong>{info.purchasesLeft === 1 ? "mais 1 vez" : "2 vezes"}</strong>: 1º mês e uma renovação. Do 3º mês em diante, vale o valor normal do plano.</li>
              </ul>
              <label className={styles.label} htmlFor="promo-invest-amount">Quanto você quer investir?</label>
              <div className={styles.inputWrap}>
                <span aria-hidden="true">R$</span>
                <input
                  id="promo-invest-amount"
                  inputMode="numeric"
                  autoComplete="off"
                  className={styles.input}
                  value={cents ? (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : ""}
                  placeholder="0,00"
                  onChange={(event) => { setAmount(String(toCents(event.target.value))); setPrevious(null); requestId.current = null; }}
                  disabled={busy}
                />
              </div>
              <div className={styles.chips}>
                {SUGGESTIONS.filter((value) => value <= info.maxCents).map((value) => (
                  <button key={value} type="button" className={styles.chip} aria-pressed={cents === value} disabled={busy}
                    onClick={() => { setAmount(String(value)); setPrevious(null); requestId.current = null; }}>
                    {money(value)}
                  </button>
                ))}
              </div>
              <p className={styles.hint}>Valores de {money(info.minCents)} a {money(info.maxCents)}.</p>
              {!previous && (
                <button type="button" className={base.primary} disabled={busy || !valid} onClick={() => start()}>
                  {busy ? <><LoaderCircle size={18} className={base.spinner} /> Gerando Pix…</> : <><QrCode size={18} /> Gerar Pix de {valid ? money(cents) : "—"}</>}
                </button>
              )}
              {previous && (
                <div className={base.notice} role="status">
                  <strong>Você já tem um Pix em aberto</strong>
                  <p>Existe um Pix da promoção de {money(previous.amount)}. Vamos encerrá-lo antes de gerar o novo; o código anterior deixará de funcionar.</p>
                  <button type="button" className={base.primary} disabled={busy} onClick={() => start(previous.id)}>
                    {busy ? "Encerrando Pix anterior…" : "Encerrar anterior e gerar novo"}
                  </button>
                </div>
              )}
            </>
          )}

          {data?.qrCode && !terminal && !data.approved && (
            <div className={base.pix}>
              <div className={base.pixHeading}><QrCode size={20} /><strong>Pague {money(data.amount)} com Pix</strong></div>
              {data.qrCodeBase64 && (
                <div className={base.qrFrame}>
                  <Image unoptimized src={`data:image/png;base64,${data.qrCodeBase64}`} width={220} height={220} alt="QR Code para pagamento Pix" />
                </div>
              )}
              <p>Escaneie o QR Code ou copie o código para pagar no aplicativo do seu banco. O código vale por 1 hora.</p>
              <label className={base.codeLabel} htmlFor="promo-invest-pix">Pix Copia e Cola</label>
              <textarea id="promo-invest-pix" className={base.pixCode} readOnly value={data.qrCode} onFocus={(event) => event.target.select()} />
              <button className={base.primary} onClick={async () => {
                try { await navigator.clipboard.writeText(data.qrCode); setCopied(true); }
                catch { setError("Selecione o código acima e copie manualmente."); }
              }}>
                {copied ? <Check size={18} /> : <Copy size={18} />} {copied ? "Código copiado" : "Copiar código Pix"}
              </button>
              <p role="status" className={base.waiting}><LoaderCircle size={16} className={base.spinner} /> Aguardando a confirmação do pagamento…</p>
            </div>
          )}

          {id && !terminal && !data?.approved && (
            <>
              <button className={base.secondary} disabled={busy} onClick={() => check(id)}>Verificar pagamento</button>
              <button className={base.secondary} disabled={busy} onClick={cancel}>{busy ? "Encerrando Pix…" : "Encerrar Pix e alterar o valor"}</button>
            </>
          )}

          {terminal && (
            <div className={base.status}>
              <strong>Pix expirado</strong>
              <p>Este código não pode mais ser pago. Gere um novo para continuar.</p>
              <button className={base.secondary} onClick={reset}>Gerar novo Pix</button>
            </div>
          )}

          {error && <p role="alert" className={base.error}>{error}</p>}
          <p className={base.security}><ShieldCheck size={16} /> Pagamento processado pelo Mercado Pago · Confirmação aqui no site</p>
        </div>
      </section>
    </div>
  );
}

export default function PromoInvestModal(props) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return createPortal(<Checkout {...props} />, document.body);
}
