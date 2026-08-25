"use client";

import { ArrowRight, Check, Loader2, Sparkles, TicketPercent, X, Zap } from "lucide-react";

import { formatBRL } from "./planCatalog";
import styles from "./LawyerPlansModal.module.css";

function getPeriodLabel(cycle) {
  if (cycle === "AVULSO") return "pagamento único";
  if (cycle === "ANNUAL") return "equivalente por mês";
  return "por mês";
}

function getButtonLabel(plan, selectingPlan) {
  if (selectingPlan === plan.id) return "Preparando checkout";
  if (plan.profilePending) return "Carregando perfil";
  if (!plan.configured) return "Preço indisponível";
  if (plan.isCurrent) return "Plano ativo";
  if (plan.isDowngrade) return "Downgrade via suporte";
  return `Selecionar ${plan.name}`;
}

function displayTotal(total, billingCycle) {
  return billingCycle === "ANNUAL" ? Number(total || 0) / 12 : Number(total || 0);
}

export default function LawyerPlanCard({
  plan,
  billingCycle,
  selectingPlan,
  onSelect,
}) {
  const busy = selectingPlan === plan.id;
  const disabled =
    plan.profilePending ||
    !plan.configured ||
    !plan.selectable ||
    Boolean(selectingPlan);
  const buttonLabel = getButtonLabel(plan, selectingPlan);

  const hasDiscount =
    plan.introEligible ||
    plan.rsDiscount ||
    (plan.couponApplied && plan.pricing.total < plan.pricing.rawTotal);

  return (
    <article
      className={`${styles.planCard} ${
        plan.recommended ? styles.planCardRecommended : ""
      }`}
      aria-busy={plan.profilePending || busy}
    >
      {plan.isCurrent ? (
        <span className={styles.currentBadge}>Plano atual</span>
      ) : plan.recommended ? (
        <span className={styles.recommendedBadge}>Recomendado</span>
      ) : null}

      <div className={styles.planHeader}>
        <h3 className={styles.planName}>{plan.name}</h3>
        <span className={styles.planTag}>{plan.tag}</span>
      </div>

      <div className={styles.priceBlock}>
        <span className={styles.oldPrice}>
          {hasDiscount
            ? `De ${formatBRL(displayTotal(plan.pricing.rawTotal, billingCycle))}`
            : ""}
        </span>
        <div className={styles.priceLine}>
          <span className={styles.price}>{formatBRL(plan.pricing.display)}</span>
          <span className={styles.period}>{getPeriodLabel(billingCycle)}</span>
        </div>
        {billingCycle === "ANNUAL" ? (
          <p className={styles.totalText}>
            Primeira cobrança anual de {formatBRL(plan.pricing.total)}.
          </p>
        ) : (
          <p className={styles.planDescription}>{plan.description}</p>
        )}
      </div>

      {plan.introEligible && (
        <span className={styles.promoNotice}>
          <Sparkles size={13} aria-hidden="true" /> Primeiro mês por {formatBRL(plan.pricing.total)}
          {plan.renewalPricing
            ? ` · depois ${formatBRL(plan.renewalPricing.total)}/mês`
            : ""}
        </span>
      )}

      {plan.couponApplied && (
        <span className={styles.promoNotice}>
          <TicketPercent size={13} aria-hidden="true" /> Cupom aplicado nesta cobrança
          {plan.renewalPricing && plan.recurringCycle
            ? ` · renovação ${formatBRL(plan.renewalPricing.total)}${
                billingCycle === "ANNUAL" ? "/ano" : "/mês"
              }`
            : ""}
        </span>
      )}

      {plan.couponDeferredByPromo && (
        <span className={styles.promoNotice}>
          <TicketPercent size={13} aria-hidden="true" /> A promoção de primeiro mês prevalece; o cupom não será consumido nesta compra
        </span>
      )}

      {plan.rsDiscount && (
        <span className={styles.promoNotice}>
          <Sparkles size={13} aria-hidden="true" /> Desconto OAB/RS de {plan.rsDiscount.rateLabel} aplicado à assinatura
        </span>
      )}

      {plan.rsAppliesOnRenewal && (plan.introEligible || plan.couponApplied) && (
        <span className={styles.promoNotice}>
          <Sparkles size={13} aria-hidden="true" /> Nas próximas cobranças entra o desconto exclusivo OAB/RS
        </span>
      )}

      <div className={styles.jurisBonus}>
        <Zap size={15} aria-hidden="true" />
        Ganhe {plan.juris} Juris após a ativação
      </div>

      <ul className={styles.featureList}>
        {plan.features.map((feature) => (
          <li
            key={feature.text}
            className={`${styles.featureItem} ${
              feature.included ? "" : styles.featureDisabled
            }`}
          >
            {feature.included ? (
              <Check size={15} color="#6ee7b7" aria-hidden="true" />
            ) : (
              <X size={15} aria-hidden="true" />
            )}
            <span>{feature.text}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`${styles.selectButton} ${
          plan.recommended ? styles.selectButtonPro : ""
        }`}
        onClick={() => void onSelect(plan)}
        disabled={disabled}
        title={
          plan.profilePending
            ? "Aguarde o carregamento do perfil."
            : plan.isDowngrade
              ? "A redução de plano deve ser solicitada ao suporte."
              : undefined
        }
      >
        {(busy || plan.profilePending) && (
          <Loader2
            size={16}
            className={styles.spinner}
            aria-hidden="true"
          />
        )}
        {buttonLabel}
        {!busy &&
          !plan.profilePending &&
          plan.configured &&
          plan.selectable && <ArrowRight size={16} aria-hidden="true" />}
      </button>
    </article>
  );
}
