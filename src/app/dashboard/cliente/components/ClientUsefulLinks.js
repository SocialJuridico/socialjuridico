import { ExternalLink, Globe, ShieldCheck } from "lucide-react";

import { USEFUL_LINKS } from "../clientDashboardConfig";
import styles from "../ClientDashboard.module.css";

export default function ClientUsefulLinks() {
  return (
    <div className={styles.pageStack}>
      <section className={styles.pageIntroCard}>
        <div>
          <span className={styles.eyebrow}>Serviços públicos e consultas</span>
          <h2>Links úteis</h2>
          <p>
            Acesse portais oficiais e ferramentas externas relevantes para
            acompanhamento jurídico e documental.
          </p>
        </div>
        <ShieldCheck size={22} aria-hidden="true" />
      </section>

      <section className={styles.usefulLinksGrid}>
        {USEFUL_LINKS.map((item) => (
          <a
            key={item.title}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.usefulLinkCard}
          >
            <span className={styles.usefulLinkIcon}>
              <Globe size={19} aria-hidden="true" />
            </span>
            <span className={styles.usefulLinkCopy}>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </span>
            <ExternalLink size={16} aria-hidden="true" />
          </a>
        ))}
      </section>
    </div>
  );
}
