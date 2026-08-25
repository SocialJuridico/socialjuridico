"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Clipboard,
  CreditCard,
  Loader2,
  MapPin,
  QrCode,
  ShieldCheck,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import {
  billingAddressValidationError,
  EMPTY_BILLING_ADDRESS,
  normalizeBillingAddress,
} from "@/lib/billing/billingAddress";

let mercadoPagoSdkPromise = null;

const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

function loadMercadoPagoSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Checkout indisponível no servidor."));
  }

  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  if (mercadoPagoSdkPromise) return mercadoPagoSdkPromise;

  mercadoPagoSdkPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("mercadopago-js-v2");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.MercadoPago), {
        once: true,
      });
      existing.addEventListener(
        "error",
        () => reject(new Error("Não foi possível carregar o Mercado Pago.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "mercadopago-js-v2";
    script.src = "https://sdk.mercadopago.com/js/v2";
    script.async = true;
    script.onload = () => {
      if (window.MercadoPago) resolve(window.MercadoPago);
      else reject(new Error("SDK do Mercado Pago indisponível."));
    };
    script.onerror = () =>
      reject(new Error("Não foi possível carregar o Mercado Pago."));
    document.head.appendChild(script);
  });

  return mercadoPagoSdkPromise;
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function pixImageSource(base64) {
  const value = String(base64 || "").trim();
  if (!value) return "";
  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
}

function normalizedStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isRecurringCycle(value) {
  return ["MONTHLY", "ANNUAL"].includes(
    String(value || "")
      .trim()
      .toUpperCase(),
  );
}

export default function StableTransparentCheckoutModal({
  isOpen,
  onClose,
  jurisAmount,
  aiCreditsAmount,
  isPro = false,
  planType,
  billingCycle,
  displayAmount,
  renewalAmount,
  isPromoEligible = false,
  couponData,
  profileData,
  onPaymentSuccess,
}) {
  const controllerRef = useRef(null);
  const successNotifiedRef = useRef(false);
  const provisionalNotifiedRef = useRef(false);
  const mountedRef = useRef(false);
  const processingRef = useRef(false);
  const billingAddressRef = useRef({
    ...EMPTY_BILLING_ADDRESS,
    state: String(profileData?.estado || "")
      .trim()
      .toUpperCase()
      .slice(0, 2),
  });
  const brickIdRef = useRef(
    `sj-mp-payment-${Math.random().toString(36).slice(2, 10)}`,
  );

  const [brickReady, setBrickReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [billingProfileLoading, setBillingProfileLoading] = useState(false);
  const [billingAddress, setBillingAddress] = useState(
    billingAddressRef.current,
  );
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
  const amount = Number(displayAmount || 0);
  const nextAmount = Number(renewalAmount || 0);
  const isAiCredits = Number(aiCreditsAmount || 0) > 0;
  const recurring = Boolean(isPro) && isRecurringCycle(billingCycle);

  const summary = useMemo(() => {
    if (isPro) {
      const cycle =
        billingCycle === "ANNUAL"
          ? "Anual"
          : billingCycle === "AVULSO"
            ? "Avulso"
            : "Mensal";
      return `Plano ${planType || "PRO"} · ${cycle} · ${formatBRL(amount)}`;
    }

    if (isAiCredits) {
      return `${aiCreditsAmount} consultas de IA · ${formatBRL(amount)}`;
    }

    return `${jurisAmount} Juris · ${formatBRL(amount)}`;
  }, [
    aiCreditsAmount,
    amount,
    billingCycle,
    isAiCredits,
    isPro,
    jurisAmount,
    planType,
  ]);

  const notifySuccess = useCallback(async () => {
    if (successNotifiedRef.current) return;
    successNotifiedRef.current = true;

    toast.success(
      isPro
        ? "Plano ativado com sucesso!"
        : isAiCredits
          ? "Créditos de IA adicionados com sucesso!"
          : "Juris creditados com sucesso!",
    );

    try {
      await onPaymentSuccess?.();
    } finally {
      window.setTimeout(() => onClose?.(), 700);
    }
  }, [isAiCredits, isPro, onClose, onPaymentSuccess]);

  const notifyProvisionalAccess = useCallback(async () => {
    if (provisionalNotifiedRef.current) return;
    provisionalNotifiedRef.current = true;
    await onPaymentSuccess?.({ provisional: true });
  }, [onPaymentSuccess]);

  const updateBillingField = useCallback((field, value) => {
    let normalizedValue = value;

    if (field === "zipCode") {
      normalizedValue = String(value || "")
        .replace(/\D/g, "")
        .slice(0, 8);
    } else if (field === "state") {
      normalizedValue = String(value || "")
        .replace(/[^a-z]/gi, "")
        .toUpperCase()
        .slice(0, 2);
    }

    setBillingAddress((current) => {
      const next = { ...current, [field]: normalizedValue };
      billingAddressRef.current = next;
      return next;
    });
    setError("");
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    processingRef.current = processing;
  }, [processing]);

  useEffect(() => {
    billingAddressRef.current = billingAddress;
  }, [billingAddress]);

  useEffect(() => {
    if (!isOpen || recurring) return undefined;

    let cancelled = false;
    setBillingProfileLoading(true);

    async function loadBillingAddress() {
      try {
        const response = await fetch(
          "/api/checkout/mercadopago/billing-profile",
          { cache: "no-store" },
        );
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.success || cancelled) return;

        const address = normalizeBillingAddress(
          data.address || {},
          profileData?.estado,
        );
        billingAddressRef.current = address;
        setBillingAddress(address);
      } catch (loadError) {
        console.warn(
          "[MercadoPago/BillingProfile] Endereço não carregado:",
          loadError,
        );
      } finally {
        if (!cancelled) setBillingProfileLoading(false);
      }
    }

    void loadBillingAddress();

    return () => {
      cancelled = true;
    };
  }, [isOpen, profileData?.estado, recurring]);

  useEffect(() => {
    if (!isOpen) {
      successNotifiedRef.current = false;
      provisionalNotifiedRef.current = false;
      processingRef.current = false;
      setBrickReady(false);
      setProcessing(false);
      setBillingProfileLoading(false);
      setError("");
      setResult(null);
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || result) return undefined;

    let cancelled = false;
    let localController = null;

    async function mountBrick() {
      setBrickReady(false);
      setError("");

      if (!publicKey) {
        setError("Chave pública do Mercado Pago não configurada.");
        return;
      }

      if (!Number.isFinite(amount) || amount <= 0) {
        setError("Valor do pagamento inválido.");
        return;
      }

      try {
        const MercadoPago = await loadMercadoPagoSdk();
        if (cancelled) return;

        const mp = new MercadoPago(publicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        const paymentMethods = recurring
          ? { creditCard: "all" }
          : {
              creditCard: "all",
              debitCard: "all",
              prepaidCard: "all",
              bankTransfer: ["pix"],
            };

        const settings = {
          initialization: {
            amount,
            payer: profileData?.email
              ? { email: String(profileData.email).trim().toLowerCase() }
              : undefined,
          },
          customization: {
            paymentMethods,
            visual: {
              style: { theme: "dark" },
            },
          },
          callbacks: {
            onReady: () => {
              if (!cancelled && mountedRef.current) setBrickReady(true);
            },
            onError: (brickError) => {
              console.error("[MercadoPago/Brick] Erro:", brickError);
              if (!cancelled && mountedRef.current) {
                setError("Não foi possível carregar a forma de pagamento.");
              }
            },
            onSubmit: ({ formData }) =>
              new Promise(async (resolve, reject) => {
                if (processingRef.current) {
                  resolve();
                  return;
                }

                const checkoutBillingAddress = recurring
                  ? null
                  : normalizeBillingAddress(
                      billingAddressRef.current,
                      profileData?.estado,
                    );
                const addressError = checkoutBillingAddress
                  ? billingAddressValidationError(
                      checkoutBillingAddress,
                      profileData?.estado,
                    )
                  : null;

                if (addressError) {
                  setError(addressError);
                  reject(new Error(addressError));
                  return;
                }

                processingRef.current = true;
                setProcessing(true);
                setError("");

                try {
                  const response = await fetch("/api/checkout/mercadopago", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      planType: isPro ? planType : null,
                      billingCycle: isPro ? billingCycle : null,
                      jurisAmount: isPro || isAiCredits ? 0 : jurisAmount,
                      aiCreditsAmount: isAiCredits ? aiCreditsAmount : 0,
                      isPromoEligible: Boolean(isPromoEligible),
                      internalCouponId: isAiCredits
                        ? null
                        : couponData?.id || null,
                      billingAddress: checkoutBillingAddress,
                      paymentData: formData,
                    }),
                  });

                  const data = await response.json().catch(() => null);
                  if (!response.ok || !data?.success) {
                    throw new Error(
                      data?.message || "Não foi possível processar o pagamento.",
                    );
                  }

                  if (mountedRef.current) setResult(data);

                  if (data.approved) {
                    await notifySuccess();
                  } else if (data.kind === "pix") {
                    toast.success("PIX gerado. Aguardando o pagamento.");
                  } else if (data.kind === "subscription") {
                    toast.success("Assinatura criada com sucesso!");
                    if (data.accessProvisioned) {
                      await notifyProvisionalAccess();
                    }
                  } else {
                    toast("Pagamento enviado para análise.");
                  }

                  resolve();
                } catch (submitError) {
                  console.error("[MercadoPago/Checkout] Falha:", submitError);
                  if (mountedRef.current) {
                    setError(
                      submitError.message ||
                        "Não foi possível processar o pagamento.",
                    );
                  }
                  reject(submitError);
                } finally {
                  processingRef.current = false;
                  if (mountedRef.current) setProcessing(false);
                }
              }),
          },
        };

        localController = await bricksBuilder.create(
          "payment",
          brickIdRef.current,
          settings,
        );
        controllerRef.current = localController;
      } catch (sdkError) {
        console.error("[MercadoPago/Brick] Inicialização falhou:", sdkError);
        if (!cancelled && mountedRef.current) {
          setError(
            sdkError.message || "Não foi possível inicializar o Mercado Pago.",
          );
        }
      }
    }

    void mountBrick();

    return () => {
      cancelled = true;
      const controller = localController || controllerRef.current;
      controllerRef.current = null;
      if (controller?.unmount) {
        Promise.resolve(controller.unmount()).catch(() => undefined);
      }
    };
  }, [
    aiCreditsAmount,
    amount,
    billingCycle,
    couponData?.id,
    isAiCredits,
    isOpen,
    isPro,
    isPromoEligible,
    jurisAmount,
    notifyProvisionalAccess,
    notifySuccess,
    planType,
    profileData?.email,
    profileData?.estado,
    publicKey,
    recurring,
    result,
  ]);

  useEffect(() => {
    if (!isOpen || !result || result.approved) return undefined;

    const paymentId = result.paymentId;
    const subscriptionId = result.subscriptionId;
    if (!paymentId && !subscriptionId) return undefined;

    let cancelled = false;
    let inFlight = false;

    async function checkStatus() {
      if (cancelled || inFlight) return;
      inFlight = true;

      try {
        const query = paymentId
          ? `paymentId=${encodeURIComponent(paymentId)}`
          : `subscriptionId=${encodeURIComponent(subscriptionId)}`;
        const response = await fetch(
          `/api/checkout/mercadopago/status?${query}`,
          { cache: "no-store" },
        );
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) return;
        if (cancelled || !mountedRef.current) return;

        setResult((current) => ({
          ...current,
          ...data,
          qrCode: data.qrCode || current?.qrCode || null,
          qrCodeBase64: data.qrCodeBase64 || current?.qrCodeBase64 || null,
        }));

        if (data.approved || normalizedStatus(data.status) === "approved") {
          await notifySuccess();
          return;
        }

        if (data.accessProvisioned) {
          await notifyProvisionalAccess();
        }

        const status = normalizedStatus(data.status || data.subscriptionStatus);
        if (["rejected", "cancelled", "canceled"].includes(status)) {
          setError(
            data.activationMessage ||
              (status === "rejected"
                ? "A primeira cobrança não foi aprovada. Tente outro cartão ou forma de pagamento."
                : "A assinatura foi cancelada."),
          );
        }
      } catch (pollError) {
        console.warn(
          "[MercadoPago/Status] Verificação temporariamente indisponível:",
          pollError,
        );
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
  }, [
    isOpen,
    notifyProvisionalAccess,
    notifySuccess,
    result?.approved,
    result?.paymentId,
    result?.subscriptionId,
  ]);

  const copyPix = useCallback(async () => {
    if (!result?.qrCode) return;
    try {
      await navigator.clipboard.writeText(result.qrCode);
      toast.success("Código PIX copiado.");
    } catch {
      toast.error("Não foi possível copiar o código PIX.");
    }
  }, [result?.qrCode]);

  if (!isOpen || typeof document === "undefined") return null;

  const approved =
    Boolean(result?.approved) || normalizedStatus(result?.status) === "approved";
  const pixPending = result?.kind === "pix" && !approved;
  const subscriptionPending = result?.kind === "subscription" && !approved;
  const subscriptionRejected =
    subscriptionPending &&
    ["rejected", "cancelled", "canceled"].includes(
      normalizedStatus(result?.status || result?.subscriptionStatus),
    );

  const successMessage = isPro
    ? "Seu plano foi atualizado automaticamente."
    : isAiCredits
      ? "Seus créditos de IA já foram adicionados automaticamente."
      : "Seus Juris já foram creditados automaticamente.";

  const checkout = (
    <div
      style={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !processing) onClose?.();
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
            <p style={styles.subtitle}>{summary}</p>
          </div>
          <button
            type="button"
            style={styles.closeButton}
            onClick={onClose}
            disabled={processing}
            aria-label="Fechar checkout"
          >
            <X size={20} />
          </button>
        </header>

        <div style={styles.body}>
          {approved ? (
            <div style={styles.statusPanel}>
              <CheckCircle2 size={54} />
              <strong style={styles.statusTitle}>Pagamento aprovado</strong>
              <span style={styles.muted}>{successMessage}</span>
            </div>
          ) : pixPending ? (
            <div style={styles.statusPanel}>
              <QrCode size={34} />
              <strong style={styles.statusTitle}>Pague o PIX abaixo</strong>
              <span style={styles.muted}>
                A confirmação é automática. Esta janela pode permanecer aberta
                enquanto você paga pelo aplicativo do seu banco.
              </span>

              {result.qrCodeBase64 && (
                <img
                  src={pixImageSource(result.qrCodeBase64)}
                  alt="QR Code PIX"
                  style={styles.qrImage}
                />
              )}

              {result.qrCode && (
                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={copyPix}
                >
                  <Clipboard size={17} /> Copiar PIX copia e cola
                </button>
              )}

              <div style={styles.waitingLine}>
                <Loader2 size={17} style={styles.spinner} />
                Aguardando confirmação do Mercado Pago...
              </div>
            </div>
          ) : subscriptionRejected ? (
            <div style={styles.statusPanel}>
              <ShieldCheck size={40} />
              <strong style={styles.statusTitle}>Cobrança não confirmada</strong>
              <span style={styles.muted}>
                {result?.activationMessage ||
                  "A primeira cobrança não foi aprovada. Nenhum Juris foi creditado e o acesso provisório foi encerrado automaticamente."}
              </span>
            </div>
          ) : subscriptionPending ? (
            <div style={styles.statusPanel}>
              <CheckCircle2 size={46} />
              <strong style={styles.statusTitle}>
                Assinatura criada com sucesso
              </strong>
              <span style={styles.muted}>
                {result?.activationMessage ||
                  "Seu cartão foi validado e sua assinatura foi criada. Estamos confirmando a primeira cobrança automaticamente."}
              </span>
              <div style={styles.waitingLine}>
                <Loader2 size={17} style={styles.spinner} />
                Ativação em andamento · acompanhando a 1ª cobrança
              </div>
            </div>
          ) : result ? (
            <div style={styles.statusPanel}>
              <Loader2 size={38} style={styles.spinner} />
              <strong style={styles.statusTitle}>
                Pagamento em processamento
              </strong>
              <span style={styles.muted}>
                Estamos consultando o Mercado Pago automaticamente. Você não
                precisa sair do Social Jurídico.
              </span>
            </div>
          ) : (
            <>
              <div style={styles.securityLine}>
                <ShieldCheck size={15} /> Pagamento seguro via Mercado Pago
              </div>

              {recurring && (
                <div style={styles.infoBox}>
                  {isPromoEligible ? (
                    <>
                      Primeira cobrança promocional de{" "}
                      <strong>{formatBRL(amount)}</strong>.
                      {nextAmount > 0 && (
                        <>
                          {" "}
                          Próximas cobranças:{" "}
                          <strong>{formatBRL(nextAmount)}</strong>.
                        </>
                      )}
                    </>
                  ) : couponData ? (
                    <>
                      O cupom vale nesta primeira cobrança.
                      {nextAmount > 0 && (
                        <>
                          {" "}
                          Próximas cobranças:{" "}
                          <strong>{formatBRL(nextAmount)}</strong>.
                        </>
                      )}
                    </>
                  ) : (
                    <>Renovação automática via cartão no ciclo selecionado.</>
                  )}
                </div>
              )}

              {!recurring && (
                <section style={styles.billingBox}>
                  <div style={styles.billingHeading}>
                    <MapPin size={17} />
                    <div>
                      <strong>Endereço de cobrança</strong>
                      <span>
                        Usado na análise antifraude e enviado ao Mercado Pago.
                        Depois da primeira compra, fica preenchido automaticamente.
                      </span>
                    </div>
                  </div>

                  {billingProfileLoading ? (
                    <div style={styles.billingLoading}>
                      <Loader2 size={17} style={styles.spinner} />
                      Carregando endereço salvo...
                    </div>
                  ) : (
                    <div style={styles.billingFields}>
                      <label style={styles.billingField}>
                        <span style={styles.billingLabel}>CEP</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          value={billingAddress.zipCode}
                          onChange={(event) =>
                            updateBillingField("zipCode", event.target.value)
                          }
                          placeholder="00000000"
                          maxLength={8}
                          disabled={processing}
                          style={styles.billingInput}
                        />
                      </label>

                      <label style={styles.billingField}>
                        <span style={styles.billingLabel}>UF</span>
                        <select
                          autoComplete="address-level1"
                          value={billingAddress.state}
                          onChange={(event) =>
                            updateBillingField("state", event.target.value)
                          }
                          disabled={processing}
                          style={styles.billingInput}
                        >
                          <option value="">UF</option>
                          {BRAZIL_STATES.map((state) => (
                            <option key={state} value={state}>
                              {state}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label style={styles.billingFieldWide}>
                        <span style={styles.billingLabel}>Rua</span>
                        <input
                          type="text"
                          autoComplete="address-line1"
                          value={billingAddress.streetName}
                          onChange={(event) =>
                            updateBillingField("streetName", event.target.value)
                          }
                          placeholder="Nome da rua"
                          maxLength={120}
                          disabled={processing}
                          style={styles.billingInput}
                        />
                      </label>

                      <label style={styles.billingField}>
                        <span style={styles.billingLabel}>Número</span>
                        <input
                          type="text"
                          autoComplete="address-line2"
                          value={billingAddress.streetNumber}
                          onChange={(event) =>
                            updateBillingField("streetNumber", event.target.value)
                          }
                          placeholder="123"
                          maxLength={20}
                          disabled={processing}
                          style={styles.billingInput}
                        />
                      </label>

                      <label style={styles.billingFieldWide}>
                        <span style={styles.billingLabel}>Cidade</span>
                        <input
                          type="text"
                          autoComplete="address-level2"
                          value={billingAddress.city}
                          onChange={(event) =>
                            updateBillingField("city", event.target.value)
                          }
                          placeholder="Sua cidade"
                          maxLength={80}
                          disabled={processing}
                          style={styles.billingInput}
                        />
                      </label>
                    </div>
                  )}
                </section>
              )}

              <div id={brickIdRef.current} style={styles.brickContainer} />

              {!brickReady && !error && (
                <div style={styles.loadingBox}>
                  <Loader2 size={22} style={styles.spinner} /> Carregando formas de
                  pagamento...
                </div>
              )}

              <p style={styles.securityCopy}>
                Os dados do cartão são tokenizados pelo Mercado Pago e não são
                armazenados pelo Social Jurídico.
              </p>
            </>
          )}

          {error && <div style={styles.errorBox}>{error}</div>}
        </div>
      </section>
    </div>
  );

  return createPortal(checkout, document.body);
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 2147483000,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: "16px",
    background: "rgba(3, 6, 15, 0.84)",
    backdropFilter: "blur(8px)",
  },
  modal: {
    width: "min(100%, 620px)",
    maxHeight: "calc(100dvh - 32px)",
    overflowY: "auto",
    margin: "0 auto",
    border: "1px solid rgba(212, 175, 55, 0.28)",
    borderRadius: 18,
    background: "#0f1420",
    color: "#f5f5f5",
    boxShadow: "0 24px 80px rgba(0,0,0,.55)",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "20px 22px",
    borderBottom: "1px solid rgba(255,255,255,.08)",
    background: "#0f1420",
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
    flex: "0 0 auto",
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
  securityLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: 14,
    color: "#a8b0c2",
    fontSize: 12,
  },
  infoBox: {
    marginBottom: 14,
    padding: "11px 13px",
    border: "1px solid rgba(212,175,55,.2)",
    borderRadius: 10,
    background: "rgba(212,175,55,.07)",
    color: "#d8dbe4",
    fontSize: 13,
    lineHeight: 1.5,
  },
  billingBox: {
    marginBottom: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,.09)",
    borderRadius: 12,
    background: "rgba(255,255,255,.025)",
  },
  billingHeading: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    marginBottom: 13,
    color: "#dfe3ec",
  },
  billingFields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 110px",
    gap: 10,
  },
  billingField: {
    display: "grid",
    gap: 6,
    minWidth: 0,
  },
  billingFieldWide: {
    display: "grid",
    gridColumn: "1 / -1",
    gap: 6,
    minWidth: 0,
  },
  billingLabel: {
    color: "#aeb5c4",
    fontSize: 11,
    fontWeight: 700,
  },
  billingInput: {
    width: "100%",
    minWidth: 0,
    height: 42,
    padding: "0 11px",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 9,
    outline: "none",
    background: "#0a0f1a",
    color: "#f5f5f5",
    fontSize: 13,
    boxSizing: "border-box",
  },
  billingLoading: {
    minHeight: 70,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: "#a8b0c2",
    fontSize: 12,
  },
  brickContainer: { minHeight: 180 },
  loadingBox: {
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    color: "#a8b0c2",
    fontSize: 13,
  },
  securityCopy: {
    margin: "14px 0 0",
    color: "#7f8798",
    fontSize: 11,
    lineHeight: 1.5,
    textAlign: "center",
  },
  statusPanel: {
    display: "grid",
    justifyItems: "center",
    gap: 14,
    padding: "28px 4px",
    textAlign: "center",
  },
  statusTitle: { fontSize: 18 },
  muted: { color: "#a8b0c2", fontSize: 13, lineHeight: 1.55 },
  qrImage: {
    width: 230,
    maxWidth: "100%",
    aspectRatio: "1 / 1",
    objectFit: "contain",
    padding: 10,
    borderRadius: 14,
    background: "#fff",
  },
  primaryButton: {
    minHeight: 46,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0 18px",
    border: 0,
    borderRadius: 10,
    background: "linear-gradient(135deg,#d4af37,#b88918)",
    color: "#111827",
    fontWeight: 800,
    cursor: "pointer",
  },
  waitingLine: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    color: "#d5d8e1",
    fontSize: 13,
  },
  spinner: { animation: "spin 1s linear infinite" },
  errorBox: {
    marginTop: 14,
    padding: "11px 13px",
    border: "1px solid rgba(239,68,68,.3)",
    borderRadius: 10,
    background: "rgba(239,68,68,.08)",
    color: "#fecaca",
    fontSize: 13,
    lineHeight: 1.45,
  },
};
