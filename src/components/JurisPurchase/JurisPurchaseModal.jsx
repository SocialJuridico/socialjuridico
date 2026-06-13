"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Coins, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";

import styles from "./JurisPurchaseModal.module.css";

const JURIS_PACKAGES = Object.freeze([
  { amount: 10, price: 9.9, popular: false },
  { amount: 20, price: 16.9, popular: true },
  { amount: 50, price: 39.9, popular: false },
]);

function normalizeCoupon(data, fallbackCode) {
  const id = data?.id || data?.cupom_id || data?.internal_coupon_id || null;
  if (!id) {
    throw new Error("A validação não retornou o identificador do cupom.");
  }

  return {
    id,
    code: String(data?.codigo || fallbackCode || "")
      .trim()
      .toUpperCase(),
    discountType: String(data?.desconto_tipo || "").toUpperCase(),
    value: Number(data?.valor || 0),
    stripe_coupon_id: data?.stripe_coupon_id || null,
  };
}

function discountedPrice(price, coupon) {
  if (!coupon || !Number.isFinite(price)) return price;
  if (coupon.discountType === "PERCENTUAL") {
    return Math.max(0, price * (1 - coupon.value / 100));
  }
  if (coupon.discountType === "FIXO") {
    return Math.max(0, price - coupon.value);
  }
  return price;
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default function JurisPurchaseModal({
  isOpen,
  onClose,
  onSelectPackage,
}) {
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState(null);
  const [validating, setValidating] = useState(false);
  const [selecting, setSelecting] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKey = (event) => {
      if (event.key === "Escape" && !selecting) onClose?.();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose, selecting]);

  useEffect(() => {
    if (!isOpen) {
      setCouponCode("");
      setCoupon(null);
      setValidating(false);
      setSelecting(null);
    }
  }, [isOpen]);

  const cards = useMemo(
    () =>
      JURIS_PACKAGES.map((item) => ({
        ...item,
        finalPrice: discountedPrice(item.price, coupon),
      })),
    [coupon],
  );

  if (!isOpen) return null;

  async function applyCoupon(event) {
    event?.preventDefault();
    const code = couponCode.trim().toUpperCase();
    if (!code || validating) return;

    setValidating(true);
    try {
      const response = await fetch("/api/checkout/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: code, tipo: "COMPRA_JURIS" }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Cupom inválido ou indisponível.");
      }
      setCoupon(normalizeCoupon(data, code));
      toast.success("Cupom aplicado à compra de Juris.");
    } catch (error) {
      setCoupon(null);
      toast.error(error.message || "Não foi possível validar o cupom.");
    } finally {
      setValidating(false);
    }
  }

  async function selectPackage(item) {
    if (selecting) return;
    if (item.finalPrice < 0.5) {
      toast.error("O desconto deixa o pagamento abaixo do mínimo permitido.");
      return;
    }

    setSelecting(item.amount);
    try {
      await onSelectPackage?.({
        jurisAmount: item.amount,
        couponData: coupon,
      });
    } catch (error) {
      toast.error(error.message || "Não foi possível preparar o pagamento.");
      setSelecting(null);
    }
  }

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !selecting) onClose?.();
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="juris-purchase-title"
      >
        <header className={styles.header}>
          <div>
            <span>
              <Coins size={15} /> Créditos instantâneos
            </span>
            <h2 id="juris-purchase-title">Comprar Juris</h2>
            <p>Escolha um pacote para continuar usando os recursos da plataforma.</p>
          </div>
          <button
            type="button"
            className={styles.closeIcon}
            onClick={onClose}
            disabled={Boolean(selecting)}
            aria-label="Fechar compra de Juris"
          >
            <X size={20} />
          </button>
        </header>

        <div className={styles.content}>
          <p className={styles.helper}>
            Adicione créditos para manifestar interesse, blindar documentos e usar
            funcionalidades que consomem Juris no plano START.
          </p>

          <div className={styles.packages}>
            {cards.map((item) => (
              <article
                key={item.amount}
                className={
                  item.popular ? styles.packagePopular : styles.package
                }
              >
                {item.popular && (
                  <span className={styles.popularBadge}>Mais Popular</span>
                )}
                <strong className={styles.amount}>{item.amount}</strong>
                <span className={styles.unit}>Juris</span>
                <strong className={styles.price}>
                  {formatPrice(item.finalPrice)}
                </strong>
                <span className={styles.originalPrice}>
                  {coupon && item.finalPrice !== item.price
                    ? formatPrice(item.price)
                    : ""}
                </span>
                <button
                  type="button"
                  onClick={() => selectPackage(item)}
                  disabled={Boolean(selecting)}
                >
                  {selecting === item.amount ? (
                    <>
                      <Loader2 size={16} /> Preparando...
                    </>
                  ) : (
                    "Comprar"
                  )}
                </button>
              </article>
            ))}
          </div>

          <div className={styles.couponArea}>
            <span>Possui um cupom de desconto?</span>
            <form className={styles.couponForm} onSubmit={applyCoupon}>
              <input
                value={couponCode}
                onChange={(event) => setCouponCode(event.target.value)}
                placeholder="Digite seu cupom"
                maxLength={40}
                disabled={validating || Boolean(selecting)}
              />
              <button
                type="submit"
                disabled={!couponCode.trim() || validating || Boolean(selecting)}
              >
                {validating ? "Validando..." : "Validar"}
              </button>
            </form>
            {coupon && (
              <div className={styles.couponSuccess}>
                <span>
                  <CheckCircle2 size={14} /> Cupom {coupon.code} aplicado
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCoupon(null);
                    setCouponCode("");
                  }}
                  disabled={Boolean(selecting)}
                >
                  Remover
                </button>
              </div>
            )}
          </div>

          <footer className={styles.footer}>
            <button type="button" onClick={onClose} disabled={Boolean(selecting)}>
              Fechar
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
