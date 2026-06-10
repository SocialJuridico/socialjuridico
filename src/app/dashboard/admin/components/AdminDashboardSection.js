import AdminDashboardCard from "./AdminDashboardCard";

import styles from "../AdminDashboard.module.css";

export default function AdminDashboardSection({
  title,
  icon: Icon,
  cards,
}) {
  return (
    <section className={styles.dashboardSection}>
      <header
        className={
          styles.dashboardSectionHeader
        }
      >
        <span
          className={
            styles.dashboardSectionIcon
          }
        >
          <Icon
            size={20}
            aria-hidden="true"
          />
        </span>

        <div>
          <h2>{title}</h2>
          <p>
            Acesse e gerencie os recursos
            desta área.
          </p>
        </div>
      </header>

      <div className={styles.dashboardGrid}>
        {cards.map((card) => (
          <AdminDashboardCard
            key={`${title}-${card.title}`}
            {...card}
          />
        ))}
      </div>
    </section>
  );
}