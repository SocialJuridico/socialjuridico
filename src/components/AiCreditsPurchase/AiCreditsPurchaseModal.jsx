"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Brain, X } from "lucide-react";

import styles from "./AiCreditsPurchaseModal.module.css";

// Links estáticos da loja InfinitePay — o pagamento é reconhecido pelo
// webhook via valor + e-mail (mesmo mecanismo já usado para vendas legadas),
// não por checkout dinâmico. Ver src/app/api/webhook/infinitepay/route.js.
const AI_CREDIT_PACKAGES = Object.freeze([
  { amount: 10, price: 10.0, url: "https://loja.infinitepay.io/plataforma-social/trj0553-10-consultas-de-ia" },
  { amount: 20, price: 18.5, url: "https://loja.infinitepay.io/plataforma-social/dos3940-20-consultas-de-ia" },
  { amount: 50, price: 45.0, url: "https://loja.infinitepay.io/plataforma-social/mie1745-50-consultas-de-ia" },
]);

function formatPrice(value) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
}

export default function AiCreditsPurchaseModal({ isOpen, onClose, lawyerEmail }) {
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

  if (!isOpen || typeof document === "undefined") return null;

  // Portal no <body>: o header onde o botão mora cria stacking context próprio
  // (sticky + z-index), que prenderia o backdrop fixed atrás do resto da página.
  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="ai-credits-title">
        <header className={styles.header}>
          <div>
            <span>
              <Brain size={15} /> Extensão Social Jurídico
            </span>
            <h2 id="ai-credits-title">Comprar créditos de IA</h2>
            <p>
              Créditos usados na extensão do navegador, no módulo &ldquo;Interpretar com Social
              Jurídico&rdquo; — não substituem a cota grátis mensal do seu plano, só entram depois dela.
            </p>
          </div>
          <button type="button" className={styles.closeIcon} onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </header>

        <div className={styles.content}>
          {lawyerEmail && (
            <p className={styles.emailNotice}>
              Pague com o e-mail <strong>{lawyerEmail}</strong> pra o crédito cair automaticamente na sua conta.
            </p>
          )}

          <div className={styles.packages}>
            {AI_CREDIT_PACKAGES.map((item) => (
              <article key={item.amount} className={styles.package}>
                <strong className={styles.amount}>{item.amount}</strong>
                <span className={styles.unit}>consultas de IA</span>
                <strong className={styles.price}>{formatPrice(item.price)}</strong>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.buyLink}>
                  Comprar
                </a>
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
  );
}
