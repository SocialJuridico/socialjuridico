"use client";

import {
  Check,
  Loader2,
  LockKeyhole,
  Sparkles,
  TicketPercent,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import LawyerPlanCard from "./LawyerPlanCard";
import { formatBRL } from "./planCatalog";
import styles from "./LawyerPlansModal.module.css";
import { useLawyerPlans } from "./useLawyerPlans";

export default function LawyerPlansModal({
  isOpen,
  profileData,
  onClose,
  onSelectPlan,
}) {
  const closeRef = useRef(null);
  const controller = useLawyerPlans({
    isOpen,
    profileData,
    onSelectPlan,
    onClose,
  });

  const bestAnnualSaving = useMemo(
    () =>
      Math.max(
        0,
        ...controller.planCards.map((plan) => plan.annualSavings || 0),
      ),
    [controller.planCards],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleEscape = (event) => {
      if (event.key === "Escape" && !controller.selectingPlan) onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
      previouslyFocused?.focus?.();
    };
  }, [controller.selectingPlan, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !controller.selectingPlan) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lawyer-plans-title"
      >
        <header className={styles.header}>
          <div className={styles.heading}>
            <span className={styles.eyebrow}>
              <Sparkles size={14} aria-hidden="true" />
              Planos profissionais
            </span>
            <h2 id="lawyer-plans-title">Escolha o plano ideal para sua atuação</h2>
            <p>
              Compare os recursos, selecione a forma de cobrança e avance para o
              checkout protegido. Os valores finais são confirmados pelo servidor.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={Boolean(controller.selectingPlan)}
            aria-label="Fechar planos"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel}>Forma de contratação</span>
              <div
                className={styles.cycleTabs}
                role="tablist"
                aria-label="Ciclo de cobrança"
              >
                {controller.billingCycles.map((cycle) => (
                  <button
                    key={cycle.id}
                    type="button"
                    role="tab"
                    aria-selected={controller.billingCycle === cycle.id}
                    className={`${styles.cycleButton} ${
                      controller.billingCycle === cycle.id
                        ? styles.cycleButtonActive
                        : ""
                    }`}
                    onClick={() => controller.setBillingCycle(cycle.id)}
                  >
                    {cycle.label}
                    {cycle.id === "ANNUAL" && bestAnnualSaving > 0 && (
                      <span className={styles.savingsBadge}>
                        até {bestAnnualSaving}% menos
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.controlGroup}>
              <label
                className={styles.controlLabel}
                htmlFor="lawyer-plan-coupon"
              >
                Cupom de desconto
              </label>
              {controller.coupon ? (
                <div className={styles.couponStatus}>
                  <span>
                    <Check size={14} aria-hidden="true" /> {controller.coupon.code}
                    {controller.coupon.percent_off
                      ? ` · ${controller.coupon.percent_off}% OFF`
                      : controller.coupon.amount_off
                        ? ` · ${formatBRL(controller.coupon.amount_off / 100)} OFF`
                        : ""}
                  </span>
                  <button
                    type="button"
                    className={styles.clearCouponButton}
                    onClick={controller.clearCoupon}
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <div className={styles.couponRow}>
                  <input
                    id="lawyer-plan-coupon"
                    className={styles.couponInput}
                    value={controller.couponCode}
                    onChange={(event) =>
                      controller.setCouponCode(
                        event.target.value
                          .replace(/[^a-z0-9_-]/gi, "")
                          .toUpperCase()
                          .slice(0, 60),
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void controller.applyCoupon();
                      }
                    }}
                    placeholder="DIGITE O CÓDIGO"
                    autoComplete="off"
                    maxLength={60}
                  />
                  <button
                    type="button"
                    className={styles.couponButton}
                    onClick={() => void controller.applyCoupon()}
                    disabled={
                      controller.validatingCoupon ||
                      !controller.couponCode.trim()
                    }
                  >
                    {controller.validatingCoupon ? (
                      <Loader2
                        size={15}
                        className={styles.spinner}
                        aria-hidden="true"
                      />
                    ) : (
                      <TicketPercent size={15} aria-hidden="true" />
                    )}
                    Validar
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.planGrid}>
            {controller.planCards.map((plan) => (
              <LawyerPlanCard
                key={plan.id}
                plan={plan}
                billingCycle={controller.billingCycle}
                selectingPlan={controller.selectingPlan}
                onSelect={controller.selectPlan}
              />
            ))}
          </div>

          <p className={styles.securityNote}>
            <LockKeyhole size={13} aria-hidden="true" /> Pagamento processado em
            ambiente seguro. Cupons e preços são revalidados no servidor.
          </p>
        </div>
      </section>
    </div>
  );
}
