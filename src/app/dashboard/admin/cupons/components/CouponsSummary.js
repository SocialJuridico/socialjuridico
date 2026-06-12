import {
  CheckCircle2,
  Clock3,
  PauseCircle,
  ShoppingCart,
  TimerReset,
  Users,
} from "lucide-react";

import styles from "../CouponsAdmin.module.css";

function SummaryCard({ icon: Icon, value, label, detail }) {
  return (
    <article className={styles.summaryCard}>
      <span className={styles.summaryIcon}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className={styles.summaryContent}>
        <strong>{value ?? 0}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default function CouponsSummary({ summary }) {
  const unavailable =
    Number(summary?.inactive || 0) +
    Number(summary?.expired || 0) +
    Number(summary?.exhausted || 0);

  return (
    <section className={styles.summaryGrid} aria-label="Resumo dos cupons">
      <SummaryCard
        icon={CheckCircle2}
        value={summary?.active}
        label="Cupons ativos"
        detail="Disponíveis para novas reservas"
      />
      <SummaryCard
        icon={Clock3}
        value={summary?.scheduled}
        label="Agendados"
        detail="Aguardando data inicial"
      />
      <SummaryCard
        icon={PauseCircle}
        value={unavailable}
        label="Indisponíveis"
        detail="Pausados, expirados ou esgotados"
      />
      <SummaryCard
        icon={ShoppingCart}
        value={summary?.totalUses}
        label="Usos confirmados"
        detail="Pagamentos concluídos com cupom"
      />
      <SummaryCard
        icon={TimerReset}
        value={summary?.activeReservations}
        label="Reservas em andamento"
        detail="Checkouts aguardando conclusão"
      />
      <SummaryCard
        icon={Users}
        value={summary?.total}
        label="Inventário total"
        detail={`${summary?.archived || 0} arquivado(s)`}
      />
    </section>
  );
}
