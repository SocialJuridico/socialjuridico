import {
  Archive,
  BadgeCheck,
  Megaphone,
  ShieldOff,
  Star,
} from "lucide-react";

import styles from "../AnunciantesAdmin.module.css";

const CARDS = [
  {
    key: "totalAdvertisers",
    label: "Anunciantes",
    helper: "Contas comerciais cadastradas",
    icon: Megaphone,
    tone: "neutral",
  },
  {
    key: "activeAdvertisers",
    label: "Contas ativas",
    helper: "Com acesso ao portal",
    icon: BadgeCheck,
    tone: "success",
  },
  {
    key: "suspendedAdvertisers",
    label: "Suspensas",
    helper: "Acesso bloqueado sem exclusão",
    icon: ShieldOff,
    tone: "danger",
  },
  {
    key: "activeAds",
    label: "Anúncios ativos",
    helper: "Disponíveis na vitrine",
    icon: Star,
    tone: "gold",
  },
  {
    key: "archivedAds",
    label: "Arquivados",
    helper: "Histórico comercial preservado",
    icon: Archive,
    tone: "muted",
  },
];

export default function AdvertiserStats({ summary }) {
  return (
    <section className={styles.statsGrid} aria-label="Resumo dos anunciantes">
      {CARDS.map((card) => {
        const Icon = card.icon;

        return (
          <article key={card.key} className={styles.statCard}>
            <span className={styles.statIcon} data-tone={card.tone}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <div>
              <span>{card.label}</span>
              <strong>{summary?.[card.key] || 0}</strong>
              <small>{card.helper}</small>
            </div>
          </article>
        );
      })}
    </section>
  );
}
