import Link from "next/link";

import styles from "./SecurityStandards.module.css";

const standards = [
  {
    key: "soc2",
    label: "SOC",
    displayLabel: "SOC 2",
    caption: "Readiness",
    href: "/seguranca",
    type: "shield",
  },
  {
    key: "lgpd",
    label: "LGPD",
    caption: "Privacidade",
    href: "/privacidade",
    type: "circle",
  },
  {
    key: "iso27001",
    label: "ISO",
    number: "27001",
    caption: "SGSI readiness",
    href: "/seguranca",
    type: "globe",
  },
  {
    key: "iso27701",
    label: "ISO",
    number: "27701",
    caption: "PIMS readiness",
    href: "/privacidade",
    type: "globe",
  },
];

function ShieldBadge({ label }) {
  return (
    <svg viewBox="0 0 120 120" className={styles.badgeSvg} aria-hidden="true">
      <path
        d="M60 10 104 25v34c0 27-18 44-44 58C34 103 16 86 16 59V25L60 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <text x="60" y="58" textAnchor="middle" className={styles.badgeText}>
        {label}
      </text>
      <text x="60" y="82" textAnchor="middle" className={styles.badgeNumber}>
        2
      </text>
    </svg>
  );
}

function CircleBadge({ label }) {
  return (
    <svg viewBox="0 0 120 120" className={styles.badgeSvg} aria-hidden="true">
      <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" strokeWidth="4" />
      <path d="M37 36a32 32 0 0 1 46 0" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M83 84a32 32 0 0 1-46 0" fill="none" stroke="currentColor" strokeWidth="3" />
      <text x="60" y="68" textAnchor="middle" className={styles.badgeText}>
        {label}
      </text>
    </svg>
  );
}

function GlobeBadge({ label, number }) {
  return (
    <svg viewBox="0 0 120 120" className={styles.badgeSvg} aria-hidden="true">
      <circle cx="60" cy="60" r="45" fill="none" stroke="currentColor" strokeWidth="3.4" />
      <ellipse cx="60" cy="60" rx="22" ry="45" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M25 43h70" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M25 77h70" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M32 31c18 11 38 11 56 0" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <path d="M32 89c18-11 38-11 56 0" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <rect x="28" y="45" width="64" height="31" rx="6" className={styles.isoPlate} />
      <text x="60" y="61" textAnchor="middle" className={styles.isoText}>
        {label}
      </text>
      <text x="60" y="73" textAnchor="middle" className={styles.isoNumber}>
        {number}
      </text>
    </svg>
  );
}

function BadgeIcon({ item }) {
  if (item.type === "shield") return <ShieldBadge label={item.label} />;
  if (item.type === "circle") return <CircleBadge label={item.label} />;
  return <GlobeBadge label={item.label} number={item.number} />;
}

export default function SecurityStandards() {
  return (
    <section className={styles.section} aria-labelledby="security-standards-title">
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Governanca, seguranca e privacidade</span>
          <h2 id="security-standards-title" className={styles.title}>
            Padroes globais para operar tecnologia juridica com IA.
          </h2>
          <p className={styles.subtitle}>
            O Social Juridico adota controles tecnicos, juridicos e organizacionais
            alinhados a referencias reconhecidas de seguranca, privacidade e
            governanca de dados.
          </p>
        </header>

        <div className={styles.badges} aria-label="Padroes adotados pelo Social Juridico">
          {standards.map((item) => (
            <Link key={item.key} href={item.href} className={styles.badgeCard}>
              <BadgeIcon item={item} />
              <span className={styles.badgeLabel}>
                {item.displayLabel || (item.number ? `${item.label} ${item.number}` : item.label)}
              </span>
              <span className={styles.badgeCaption}>{item.caption}</span>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>

        <p className={styles.disclaimer}>
          Os emblemas indicam alinhamento, programa interno de readiness e evidencias
          de governanca. Certificacoes e relatorios formais dependem de auditoria
          externa independente.
        </p>
      </div>
    </section>
  );
}
