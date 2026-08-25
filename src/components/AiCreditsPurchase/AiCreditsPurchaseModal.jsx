"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Brain, X } from "lucide-react";

import StableTransparentCheckoutModal from "@/components/TransparentCheckout/StableTransparentCheckoutModal";
import styles from "./AiCreditsPurchaseModal.module.css";

const AI_CREDIT_PACKAGES = Object.freeze([
  { amount: 10, price: 10.0 },
  { amount: 20, price: 18.5 },
  { amount: 50, price: 45.0 },
]);

function formatPrice(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export default function AiCreditsPurchaseModal({
  isOpen,
  onClose,
  lawyerEmail,
  profileData,
  onProfileRefresh,
}) {
  const [checkout, setCheckout] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    const handleKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  async function openCheckout(item) {
    setCheckout(item);
    onClose?.();
  }

  async function handlePaymentSuccess() {
    await onProfileRefresh?.();
  }

  if (!isOpen && !checkout) return null;

  return (
    <>
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className={styles.backdrop}
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose?.();
              }}
            >
              <section
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby="ai-credits-title"
              >
                <header className={styles.header}>
                  <div>
                    <span>
                      <Brain size={15} /> Extensão Social Jurídico
                    </span>
                    <h2 id="ai-credits-title">Comprar créditos de IA</h2>
                    <p>
                      Créditos usados na extensão do navegador, no módulo
                      &ldquo;Interpretar com Social Jurídico&rdquo;. Eles entram após o
                      consumo da cota grátis mensal do seu plano.
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.closeIcon}
                    onClick={onClose}
                    aria-label="Fechar"
                  >
                    <X size={20} />
                  </button>
                </header>

                <div className={styles.content}>
                  <p className={styles.emailNotice}>
                    O pagamento agora é feito dentro do Social Jurídico e o crédito
                    é liberado automaticamente após a confirmação do Mercado Pago.
                  </p>

                  <div className={styles.packages}>
                    {AI_CREDIT_PACKAGES.map((item) => (
                      <article key={item.amount} className={styles.package}>
                        <strong className={styles.amount}>{item.amount}</strong>
                        <span className={styles.unit}>consultas de IA</span>
                        <strong className={styles.price}>
                          {formatPrice(item.price)}
                        </strong>
                        <button
                          type="button"
                          className={styles.buyLink}
                          onClick={() => void openCheckout(item)}
                        >
                          Comprar
                        </button>
                      </article>
                    ))}
                  </div>

                  <footer className={styles.footer}>
                    <button type="button" onClick={onClose}>
                      Fechar
                    </button>
                  </footer>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}

      <StableTransparentCheckoutModal
        isOpen={Boolean(checkout)}
        onClose={() => setCheckout(null)}
        aiCreditsAmount={checkout?.amount || null}
        displayAmount={checkout?.price || null}
        isPro={false}
        profileData={profileData || { email: lawyerEmail }}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}
