import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileSearch,
  ShieldAlert,
  TimerReset,
} from "lucide-react";

import styles from "../DeletionRequests.module.css";

function SummaryCard({ icon: Icon, value, label, detail }) {
  return (
    <article className={styles.summaryCard}>
      <span className={styles.summaryIcon}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className={styles.summaryCopy}>
        <strong>{value || 0}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default function DeletionSummary({ summary }) {
  const review =
    Number(summary?.EM_ANALISE || 0) +
    Number(summary?.AGUARDANDO_USUARIO || 0);
  const approved =
    Number(summary?.APROVADA || 0) + Number(summary?.PROCESSANDO || 0);

  return (
    <section className={styles.summaryGrid} aria-label="Resumo da fila de privacidade">
      <SummaryCard
        icon={Clock3}
        value={summary?.PENDENTE}
        label="Pendentes"
        detail="Aguardando primeira análise"
      />
      <SummaryCard
        icon={FileSearch}
        value={review}
        label="Em tratamento"
        detail="Análise ou contato com o titular"
      />
      <SummaryCard
        icon={ShieldAlert}
        value={approved}
        label="Aprovadas"
        detail="Autorizadas ou em processamento"
      />
      <SummaryCard
        icon={CheckCircle2}
        value={summary?.CONCLUIDA}
        label="Concluídas"
        detail="Atendimento encerrado"
      />
      <SummaryCard
        icon={AlertTriangle}
        value={summary?.FALHA}
        label="Com falha"
        detail="Exigem revisão técnica"
      />
      <SummaryCard
        icon={TimerReset}
        value={summary?.overdue}
        label="Prazo excedido"
        detail="Acima da janela de 48 horas"
      />
    </section>
  );
}
