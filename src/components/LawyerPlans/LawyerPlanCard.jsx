"use client";

import { ArrowRight, Check, Loader2, Sparkles, X, Zap } from "lucide-react";

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
          {plan.introEligible
            ? `De ${formatBRL(plan.priceInfo.value)}`
            : plan.rsDiscount
              ? `De ${formatBRL(
                  billingCycle === "ANNUAL"
                    ? plan.rsDiscount.originalTotal / 12
                    : plan.rsDiscount.originalTotal,
                )}`
              : plan.previewCoupon && plan.pricing.total < plan.pricing.rawTotal
                ? `De ${formatBRL(
                    billingCycle === "ANNUAL"
                      ? plan.pricing.rawTotal / 12
                      : plan.pricing.rawTotal,
                  )}`
                : ""}
        </span>
        <div className={styles.priceLine}>
          <span className={styles.price}>
            {formatBRL(plan.pricing.display)}
          </span>
          <span className={styles.period}>{getPeriodLabel(billingCycle)}</span>
        </div>
        {billingCycle === "ANNUAL" ? (
          <p className={styles.totalText}>
            Cobrança anual de {formatBRL(plan.pricing.total)} · economia aproximada
            de {plan.annualSavings}%.
          </p>
        ) : (
          <p className={styles.planDescription}>{plan.description}</p>
        )}
      </div>

      {plan.introEligible && (
        <span className={styles.promoNotice}>
          <Sparkles size={13} aria-hidden="true" /> Primeiro mês por {formatBRL(plan.pricing.display)}
        </span>
      )}

      {plan.rsDiscount && (
        <span className={styles.promoNotice}>
          <Sparkles size={13} aria-hidden="true" /> Desconto OAB/RS de {plan.rsDiscount.rateLabel} aplicado
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
