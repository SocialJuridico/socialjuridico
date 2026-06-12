"use client";

import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";

import CouponModal from "./components/CouponModal";
import CouponsAudit from "./components/CouponsAudit";
import CouponsHeader from "./components/CouponsHeader";
import CouponsInventory from "./components/CouponsInventory";
import CouponsSummary from "./components/CouponsSummary";
import { useAdminCoupons } from "./useAdminCoupons";
import styles from "./CouponsAdmin.module.css";

export default function AdminCouponsPage() {
  const coupons = useAdminCoupons();

  if (coupons.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.spinner} aria-hidden="true" />
        <h1>Carregando gestão de cupons</h1>
        <p>Validando campanhas, consumo, reservas e sincronização financeira.</p>
      </main>
    );
  }

  if (coupons.loadError && coupons.coupons.length === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar o módulo</h1>
        <p>{coupons.loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => coupons.loadCoupons()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <CouponsHeader coupons={coupons} />

      {coupons.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Os dados podem estar desatualizados</strong>
            <p>{coupons.loadError}</p>
          </div>
          <button type="button" onClick={() => coupons.loadCoupons()}>
            Atualizar
          </button>
        </div>
      )}

      {!coupons.auditAvailable && (
        <div className={styles.migrationBanner} role="status">
          <ShieldCheck size={18} aria-hidden="true" />
          <div>
            <strong>Governança dos cupons ainda não habilitada</strong>
            <p>
              Execute as migrações de cupons antes de criar, editar ou arquivar
              campanhas promocionais.
            </p>
          </div>
        </div>
      )}

      <CouponsSummary summary={coupons.summary} />
      <CouponsInventory coupons={coupons} />
      <CouponsAudit
        items={coupons.recentAudit}
        available={coupons.auditAvailable}
      />
      <CouponModal coupons={coupons} />
    </main>
  );
}
