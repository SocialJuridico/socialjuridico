import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, TicketPercent } from "lucide-react";

import styles from "../CouponsAdmin.module.css";

export default function CouponsHeader({ coupons }) {
  return (
    <header className={styles.header}>
      <div>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <TicketPercent size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Governança comercial e promocional</span>
            <h1>Cupons</h1>
            <p>
              Controle descontos, disponibilidade, limites de utilização,
              sincronização com Stripe e rastreabilidade administrativa.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.headerActions}>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => coupons.loadCoupons()}
          disabled={coupons.saving || Boolean(coupons.busyId)}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Atualizar
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={coupons.openCreate}
          disabled={coupons.saving || Boolean(coupons.busyId)}
        >
          <Plus size={16} aria-hidden="true" />
          Novo cupom
        </button>
      </div>
    </header>
  );
}
