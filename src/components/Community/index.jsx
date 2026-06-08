import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Eye,
  Facebook,
  MessageCircleMore,
  ShieldCheck,
  Users,
} from "lucide-react";

import styles from "./Community.module.css";

const communityStats = [
  {
    icon: CalendarDays,
    value: "7+",
    label: "anos de história",
  },
  {
    icon: Users,
    value: "16 mil+",
    label: "membros na comunidade",
  },
  {
    icon: Eye,
    value: "24 mil+",
    label: "visualizações recentes",
  },
];

const communityBenefits = [
  {
    icon: MessageCircleMore,
    title: "Uma comunidade criada antes da plataforma",
    description:
      "O grupo surgiu para aproximar pessoas com dúvidas jurídicas e profissionais interessados em compartilhar informação.",
  },
  {
    icon: ShieldCheck,
    title: "Uma experiência que inspirou o Social Jurídico",
    description:
      "As necessidades identificadas ao longo dos anos ajudaram a construir uma plataforma mais organizada, segura e acessível.",
  },
];

export default function Community() {
  return (
    <section
      id="comunidade"
      className={styles.section}
      aria-labelledby="community-title"
    >
      <div className={styles.container}>
        <div className={styles.contentColumn}>
          <header className={styles.header}>
            <h2 id="community-title" className={styles.title}>
              O Social Jurídico nasceu de uma comunidade com
              <span className={styles.highlight}> mais de 16 mil membros</span>
            </h2>

            <p className={styles.subtitle}>
              Há mais de sete anos, o grupo “Preciso de um Advogado” reúne
              pessoas em busca de informações jurídicas e profissionais
              interessados em contribuir. A experiência construída nessa
              comunidade inspirou a criação da plataforma Social Jurídico.
            </p>
          </header>

          <div className={styles.statsGrid}>
            {communityStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div key={stat.label} className={styles.statItem}>
                  <div className={styles.statIcon} aria-hidden="true">
                    <Icon size={21} strokeWidth={1.8} />
                  </div>

                  <div className={styles.statContent}>
                    <strong className={styles.statValue}>{stat.value}</strong>

                    <span className={styles.statLabel}>{stat.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className={styles.benefitsList}>
            {communityBenefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article key={benefit.title} className={styles.benefitItem}>
                  <div className={styles.benefitIcon} aria-hidden="true">
                    <Icon size={23} strokeWidth={1.8} />
                  </div>

                  <div className={styles.benefitContent}>
                    <h3 className={styles.benefitTitle}>{benefit.title}</h3>

                    <p className={styles.benefitDescription}>
                      {benefit.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.actions}>
            <Link
              prefetch={false}
              href="/cadastro"
              className={styles.primaryAction}
            >
              Publicar meu caso gratuitamente
              <ArrowRight size={18} aria-hidden="true" />
            </Link>

            <a
              href="https://www.facebook.com/groups/1667675480204134"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.facebookAction}
            >
              <Facebook size={18} aria-hidden="true" />
              Conhecer o grupo
            </a>
          </div>
        </div>

        <div className={styles.visualColumn}>
          <div className={styles.communityCard}>
            <div className={styles.imageWrapper}>
              <Image
                src="/community/preciso-de-um-advogado.webp"
                alt="Capa do grupo Preciso de um Advogado, comunidade oficial do ecossistema Social Jurídico"
                width={1200}
                height={630}
                className={styles.communityImage}
                sizes="(max-width: 900px) 100vw, 520px"
              />

              <div className={styles.imageOverlay} aria-hidden="true" />
            </div>

            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <div className={styles.groupIcon} aria-hidden="true">
                  <Users size={24} strokeWidth={1.8} />
                </div>

                <div className={styles.groupInfo}>
                  <h3 className={styles.groupName}>Preciso de um Advogado</h3>

                  <p className={styles.groupMeta}>
                    Comunidade oficial do ecossistema Social Jurídico
                  </p>
                </div>
              </div>

              <div className={styles.cardFacts}>
                <div className={styles.cardFact}>
                  <strong>16 mil+</strong>
                  <span>membros</span>
                </div>

                <div className={styles.cardFact}>
                  <strong>7+ anos</strong>
                  <span>de comunidade</span>
                </div>

                <div className={styles.cardFact}>
                  <strong>24 mil+</strong>
                  <span>visualizações recentes</span>
                </div>
              </div>

              <ul className={styles.cardList}>
                <li>
                  <ShieldCheck size={17} aria-hidden="true" />
                  Grupo oficial do ecossistema Social Jurídico
                </li>

                <li>
                  <MessageCircleMore size={17} aria-hidden="true" />
                  Troca de informações sobre temas jurídicos
                </li>

                <li>
                  <Users size={17} aria-hidden="true" />
                  Participação de clientes e profissionais
                </li>
              </ul>

              <a
                href="https://www.facebook.com/groups/1667675480204134"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.cardLink}
              >
                Visitar a comunidade no Facebook
                <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
          </div>

          <p className={styles.notice}>
            As publicações da comunidade possuem caráter informativo e não
            substituem consulta jurídica nem garantem contratação ou
            atendimento.
          </p>
        </div>
      </div>
    </section>
  );
}
