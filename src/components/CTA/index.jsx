import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";

import styles from "./CTA.module.css";

const trustItems = [
  {
    icon: BadgeCheck,
    label: "Publicação gratuita",
  },
  {
    icon: UserRoundCheck,
    label: "Você escolhe com quem conversar",
  },
  {
    icon: ShieldCheck,
    label: "Sem obrigação de contratação",
  },
];

export default function CTA() {
  return (
    <section
      className={styles.section}
      aria-labelledby="final-cta-title"
    >
      <div className={styles.backgroundGlow} aria-hidden="true" />

      <div className={styles.content}>
        <h2 id="final-cta-title" className={styles.title}>
          Dê o primeiro passo para encontrar
          <span className={styles.highlight}> apoio jurídico</span>
        </h2>

        <p className={styles.subtitle}>
          Publique seu caso gratuitamente e permita que advogados cadastrados
          demonstrem interesse em conversar com você.
        </p>

        <div className={styles.actions}>
          <Link
            prefetch={false}
            href="/cadastro"
            className={styles.primaryAction}
          >
            Publicar meu caso gratuitamente
            <ArrowRight size={19} aria-hidden="true" />
          </Link>

          <Link
            prefetch={false}
            href="/sou-advogado"
            className={styles.secondaryAction}
          >
            Conhecer a plataforma para advogados
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>

        <div
          className={styles.trustList}
          aria-label="Informações importantes"
        >
          {trustItems.map((item, index) => {
            const Icon = item.icon;

            return (
              <div key={item.label} className={styles.trustGroup}>
                {index > 0 && (
                  <span
                    className={styles.trustDivider}
                    aria-hidden="true"
                  />
                )}

                <span className={styles.trustItem}>
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}