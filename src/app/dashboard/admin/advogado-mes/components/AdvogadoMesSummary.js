import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  HardDrive,
  PauseCircle,
  ShieldCheck,
} from "lucide-react";

import styles from "../AdvogadoMesAdmin.module.css";

const STATUS_META = {
  active: {
    label: "Publicado agora",
    detail: "Disponível para exibição nos logins",
    icon: CheckCircle2,
  },
  scheduled: {
    label: "Publicação agendada",
    detail: "Aguardando a data inicial configurada",
    icon: Clock3,
  },
  inactive: {
    label: "Popup pausado",
    detail: "Desativado manualmente pelo administrador",
    icon: PauseCircle,
  },
  expired: {
    label: "Período encerrado",
    detail: "A data final de publicação já passou",
    icon: CalendarClock,
  },
  missing: {
    label: "Ainda não configurado",
    detail: "Envie uma imagem e salve a primeira versão",
    icon: ShieldCheck,
  },
};

function formatDateTime(value) {
  if (!value) return "Sem registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function SummaryCard({ icon: Icon, value, label, detail }) {
  return (
    <article className={styles.summaryCard}>
      <span className={styles.summaryIcon}>
        <Icon size={19} aria-hidden="true" />
      </span>
      <div className={styles.summaryContent}>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{detail}</small>
      </div>
    </article>
  );
}

export default function AdvogadoMesSummary({ config, auditCount }) {
  const status = STATUS_META[config.publication_status] || STATUS_META.inactive;
  const StatusIcon = status.icon;
  const schedule = config.starts_at || config.ends_at;
  const imageSource = config.image_url
    ? config.storage_path
      ? {
          value: "Storage dedicado",
          detail: "Arquivo validado no bucket admin-banners",
        }
      : {
          value: "URL externa",
          detail: "A imagem não está vinculada ao Storage dedicado",
        }
    : {
        value: "Sem imagem",
        detail: "Aguardando a primeira configuração do destaque",
      };

  return (
    <section className={styles.summaryGrid} aria-label="Resumo do Advogado do Mês">
      <SummaryCard
        icon={StatusIcon}
        value={status.label}
        label="Situação da publicação"
        detail={status.detail}
      />
      <SummaryCard
        icon={HardDrive}
        value={imageSource.value}
        label="Origem da imagem"
        detail={imageSource.detail}
      />
      <SummaryCard
        icon={CalendarClock}
        value={schedule ? "Com agenda" : "Sem limite"}
        label="Janela de publicação"
        detail={
          schedule
            ? `${config.starts_at ? "Início definido" : "Início imediato"} · ${config.ends_at ? "Fim definido" : "Sem encerramento"}`
            : "A publicação depende apenas do estado ativo"
        }
      />
      <SummaryCard
        icon={ShieldCheck}
        value={`${auditCount || 0} evento(s)`}
        label="Auditoria recente"
        detail={`Última atualização: ${formatDateTime(config.updated_at)}`}
      />
    </section>
  );
}
