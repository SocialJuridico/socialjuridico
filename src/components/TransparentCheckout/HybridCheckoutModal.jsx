"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { CreditCard, X, QrCode, Copy, Check, ShieldCheck, LoaderCircle } from "lucide-react";
import Image from "next/image";
import styles from "./HybridCheckoutModal.module.css";

const endpoint = "/api/checkout/hybrid";
const money = cents => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100);
const clients = new Map();
function stripeFor(key) {
  if (!clients.has(key)) clients.set(key,loadStripe(key));
  return clients.get(key);
}

function Checkout({onClose,isPro,planType,billingCycle,jurisAmount,aiCreditsAmount,displayAmount,
  renewalAmount,isPromoEligible,couponData,onPaymentSuccess,checkoutId: initialId}) {
  const recurring = isPro && ["MONTHLY","ANNUAL"].includes(billingCycle);
  const [method,setMethod] = useState("card");
  const [data,setData] = useState(null);
  const [error,setError] = useState("");
  const [errorCode,setErrorCode] = useState("");
  const [busy,setBusy] = useState(false);
  const [waiting,setWaiting] = useState(Boolean(initialId));
  const [copied,setCopied] = useState(false);
  const [id,setId] = useState(initialId || null);
  const complete = useRef(false);
  const inFlight = useRef(false);
  const callback = useRef(onPaymentSuccess);
  const dialog = useRef(null);
  useEffect(()=>{callback.current=onPaymentSuccess;},[onPaymentSuccess]);
  const storageKey = `sj-hybrid:${planType || ""}:${billingCycle || ""}:${jurisAmount || 0}:${aiCreditsAmount || 0}:${isPromoEligible?1:0}:${couponData?.id || ""}:${method}`;
  const accept = useCallback(async (result) => {
    setData(result);
    if(result.checkoutId){setId(result.checkoutId);sessionStorage.setItem(storageKey,result.checkoutId);}
    if (["expired","cancelled","canceled"].includes(result.status)) {
      setWaiting(false);sessionStorage.removeItem(storageKey);
    }
    if (result.approved && !complete.current) {
      complete.current=true;setWaiting(false);setError("");
      sessionStorage.removeItem(storageKey);
      await callback.current?.();
    }
  },[storageKey]);
  const check = useCallback(async () => {
    if (!id || inFlight.current || complete.current) return;
    inFlight.current=true;
    try {
      const response=await fetch(`${endpoint}?checkout=${encodeURIComponent(id)}`,{cache:"no-store"});
      const result=await response.json();
      if (!response.ok) throw new Error(result.message);
      setError("");setErrorCode("");
      await accept(result);
      if (["expired","cancelled","canceled"].includes(result.status)) {setWaiting(false);sessionStorage.removeItem(storageKey);}
    } catch (failure) {setError(failure.message || "A confirmação ainda não está disponível.");}
    finally {inFlight.current=false;}
  },[id,accept,storageKey]);
  useEffect(()=>{
    if (!id || ["expired","cancelled","canceled"].includes(data?.status) || (!waiting && data?.method !== "pix")) return;
    void check(); const timer=setInterval(check,4000);return()=>clearInterval(timer);
  },[id,waiting,data?.method,data?.status,check]);
  useEffect(()=>{
    const previous=document.activeElement;
    const overflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    dialog.current?.focus();
    const closeOnEscape=event=>{
      if(event.key==="Escape")onClose?.();
      if(event.key==="Tab") {
        const elements=dialog.current?.querySelectorAll('button:not(:disabled), textarea, iframe, [tabindex="0"]');
        const first=elements?.[0],last=elements?.[elements.length-1];
        if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    window.addEventListener("keydown",closeOnEscape);
    return()=>{window.removeEventListener("keydown",closeOnEscape);document.body.style.overflow=overflow;previous?.focus?.();};
  },[onClose]);
  async function start() {
    if (busy) return;
    setBusy(true);setError("");setErrorCode("");
    const requestId=sessionStorage.getItem(storageKey) || crypto.randomUUID();
    sessionStorage.setItem(storageKey,requestId);setId(requestId);
    try {
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({requestId,method,planType:isPro?planType:null,billingCycle:isPro?billingCycle:null,
          jurisAmount:isPro||aiCreditsAmount?0:jurisAmount,aiCreditsAmount:aiCreditsAmount||0,
          isPromoEligible:Boolean(isPromoEligible),internalCouponId:couponData?.id||null})});
      const result=await response.json();
      if (!response.ok) {
        setErrorCode(result.code || "");
        // These preflight failures did not create a new checkout. Keep the UUID
        // for a possible existing session, but don't offer a fake status lookup.
        if (["LEGACY_PENDING","STRIPE_CONFIGURATION"].includes(result.code)) setId(null);
        throw new Error(result.message);
      }
      await accept(result);
      if (result.method==="pix") setWaiting(true);
    } catch(failure) {setError(failure.message || "Não foi possível iniciar o pagamento.");}
    finally{setBusy(false);}
  }
  const onComplete=useCallback(()=>{setWaiting(true);},[]);
  const options=useMemo(()=>({clientSecret:data?.clientSecret,onComplete}),[data?.clientSecret,onComplete]);
  const terminal=["expired","cancelled","canceled"].includes(data?.status);
  return <div className={styles.overlay}>
    <section ref={dialog} tabIndex={-1} className={`${styles.modal} ${data?.clientSecret?styles.cardModal:""}`} role="dialog" aria-modal="true" aria-labelledby="hybrid-title">
      <header className={styles.header}><div><h2 id="hybrid-title">{initialId?"Confirmação do pagamento":isPro?`Plano ${planType}`:aiCreditsAmount?`${aiCreditsAmount} consultas de IA`:`${jurisAmount} Juris`}</h2>
        {!initialId&&<p>{money(data?.amount ?? Math.round(Number(displayAmount||0)*100))}{recurring&&Number(renewalAmount)>0?` · Renovação: ${money(Math.round(renewalAmount*100))}${billingCycle==="ANNUAL"?"/ano":"/mês"}`:""}</p>}</div>
        <button className={styles.close} onClick={onClose} aria-label="Fechar pagamento"><X size={18}/></button></header>
      <div className={styles.body}>
        {data?.approved?<div role="status" className={styles.status}><strong>Pagamento confirmado</strong><p>Os benefícios da sua compra foram liberados.</p></div>:<>
          {!data?.clientSecret&&!data?.qrCode&&!initialId&&!terminal&&<>
            <div className={styles.methods} aria-label="Forma de pagamento">
              <button type="button" className={styles.method} disabled={busy||Boolean(id)} aria-pressed={method==="card"} onClick={()=>setMethod("card")}><CreditCard size={20}/> Cartão de crédito</button>
              {!recurring&&<button type="button" className={styles.method} disabled={busy||Boolean(id)} aria-pressed={method==="pix"} onClick={()=>setMethod("pix")}><QrCode size={20}/> Pix</button>}
            </div>
            <p className={styles.securityCopy}>{recurring?"Assinatura com renovação automática no cartão. Você poderá concluir o pagamento aqui no site.":"Escolha como deseja pagar. A confirmação aparecerá aqui."}</p>
            <button type="button" className={styles.primary} disabled={busy} onClick={start}>{busy?<><LoaderCircle size={18} className={styles.spinner}/> Preparando pagamento…</>:errorCode==="LEGACY_PENDING"?"Verificar tentativa anterior":id?"Retomar esta tentativa":method==="pix"?"Gerar Pix":"Continuar com cartão"}</button>
          </>}
          {data?.clientSecret&&data?.publicKey&&!waiting&&!terminal&&<div className={styles.stripeForm}><EmbeddedCheckoutProvider stripe={stripeFor(data.publicKey)} options={options}><EmbeddedCheckout/></EmbeddedCheckoutProvider></div>}
          {data?.qrCode&&!terminal&&<div className={styles.pix}>
            <div className={styles.pixHeading}><QrCode size={20}/><strong>Pague com Pix</strong></div>
            {data.qrCodeBase64&&<div className={styles.qrFrame}><Image unoptimized src={`data:image/png;base64,${data.qrCodeBase64}`} width={220} height={220} alt="QR Code para pagamento Pix"/></div>}
            <p>Escaneie o QR Code ou copie o código para pagar no aplicativo do seu banco.</p>
            <label className={styles.codeLabel} htmlFor="hybrid-pix-code">Pix Copia e Cola</label>
            <textarea id="hybrid-pix-code" className={styles.pixCode} readOnly value={data.qrCode} onFocus={event=>event.target.select()}/>
            <button className={styles.primary} onClick={async()=>{try{await navigator.clipboard.writeText(data.qrCode);setCopied(true);}catch{setError("Selecione o código acima e copie manualmente.");}}}>{copied?<Check size={18}/>:<Copy size={18}/>} {copied?"Código copiado":"Copiar código Pix"}</button>
          </div>}
          {waiting&&!terminal&&<p role="status" className={styles.waiting}><LoaderCircle size={16} className={styles.spinner}/> Aguardando a confirmação do pagamento…</p>}
          {(data?.checkoutId||initialId)&&!terminal&&<button className={styles.secondary} onClick={check}>Verificar pagamento</button>}
          {terminal&&<div className={styles.status}><strong>Pagamento expirado</strong><p>Esta tentativa foi encerrada. Nenhum novo pagamento será iniciado automaticamente.</p><button className={styles.secondary} onClick={onClose}>Fechar e escolher novamente</button></div>}
        </>}
        {error&&<p role="alert" className={styles.error}>{error}</p>}
        <p className={styles.security}><ShieldCheck size={16}/> Pagamento protegido · Confirmação aqui no site</p>
      </div>
    </section>
  </div>;
}
export default function HybridCheckoutModal(props) {
  if (!props.isOpen || typeof document === "undefined") return null;
  return createPortal(<Checkout {...props}/>,document.body);
}
