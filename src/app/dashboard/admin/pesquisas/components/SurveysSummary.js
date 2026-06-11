import { Award, CheckCircle, Scale, Users } from "lucide-react";
import SurveyStars from "./SurveyStars";
import styles from "../Pesquisas.module.css";

function SummaryCard({ label, value, icon: Icon, stars, subtext }) {
  return (
    <article className={styles.summaryCard}>
      <span className={styles.summaryIcon}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className={styles.summaryContent}>
        <strong>{value}</strong>
        <span>{label}</span>
        {stars !== undefined && <SurveyStars value={stars} size={13} />}
        {subtext && <small>{subtext}</small>}
      </span>
    </article>
  );
}

export default function SurveysSummary({ stats }) {
  return (
    <section className={styles.summaryGrid} aria-label="Resumo das pesquisas">
      <SummaryCard
        label="Média geral"
        value={stats.overallAverage.toFixed(1)}
        icon={Award}
        stars={stats.overallAverage}
        subtext="Consolidada"
      />
      <SummaryCard
        label="Média dos advogados"
        value={stats.lawyerAverage.toFixed(1)}
        icon={Scale}
        stars={stats.lawyerAverage}
        subtext={`${stats.lawyerCount} feedbacks`}
      />
      <SummaryCard
        label="Média dos clientes"
        value={stats.clientAverage.toFixed(1)}
        icon={CheckCircle}
        stars={stats.clientAverage}
        subtext={`${stats.clientCount} feedbacks`}
      />
      <SummaryCard
        label="Total de avaliações"
        value={stats.total}
        icon={Users}
        subtext="Registros recebidos"
      />
    </section>
  );
}
