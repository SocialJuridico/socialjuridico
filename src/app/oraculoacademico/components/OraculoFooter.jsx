import Link from "next/link";
import { GraduationCap } from "lucide-react";

import styles from "./OraculoFooter.module.css";

const brandLinks = [
  { href: "/oraculoacademico/como-funciona", label: "Como Funciona" },
  { href: "/oraculoacademico/pratica-juridica", label: "Prática Jurídica Supervisionada" },
  { href: "/oraculoacademico/impacto", label: "Impacto Acadêmico" },
];

const participantLinks = [
  { href: "/oraculoacademico/estudantes", label: "Estudantes" },
  { href: "/oraculoacademico/supervisores", label: "Supervisores" },
  { href: "/oraculoacademico/instituicoes", label: "Instituições de Ensino" },
];

const institutionalLinks = [
  { href: "/oraculoacademico/seguranca-auditoria", label: "Segurança e Auditoria" },
  { href: "/oraculoacademico/regras", label: "Regras do Programa" },
  { href: "/oraculoacademico/faq", label: "FAQ" },
  { href: "/oraculoacademico/termos", label: "Termos de Uso" },
  { href: "/oraculoacademico/privacidade", label: "Política de Privacidade" },
];

export default function OraculoFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div className={styles.column}>
          <Link href="/oraculoacademico" className={styles.brand}>
            <span className={styles.logoIcon} aria-hidden="true">
              <GraduationCap size={20} />
            </span>
            ORÁCULO ACADÊMICO
          </Link>

          <ul className={styles.linkList}>
            {brandLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>Participantes</span>
          <ul className={styles.linkList}>
            {participantLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.column}>
          <span className={styles.columnTitle}>Institucional</span>
          <ul className={styles.linkList}>
            {institutionalLinks.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.bottomBar}>
        <span>
          © {currentYear} Oráculo Acadêmico — um produto do ecossistema
          Social Jurídico.
        </span>
      </div>
    </footer>
  );
}
