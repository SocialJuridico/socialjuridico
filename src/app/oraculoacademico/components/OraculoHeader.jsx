import Link from "next/link";
import { GraduationCap } from "lucide-react";

import styles from "./OraculoHeader.module.css";

const navItems = [
  { href: "/oraculoacademico", label: "Home" },
  { href: "/oraculoacademico/como-funciona", label: "Como Funciona" },
  { href: "/oraculoacademico/estudantes", label: "Para Estudantes" },
  { href: "/oraculoacademico/supervisores", label: "Para Supervisores" },
  { href: "/oraculoacademico/instituicoes", label: "Instituições" },
  { href: "/oraculoacademico/impacto", label: "Impacto Acadêmico" },
];

export default function OraculoHeader() {
  return (
    <header className={styles.headerWrapper}>
      <div className={styles.headerContainer}>
        <Link
          href="/oraculoacademico"
          className={styles.logo}
          aria-label="Ir para a página inicial do Oráculo Acadêmico"
        >
          <div className={styles.logoIconBox} aria-hidden="true">
            <GraduationCap size={22} strokeWidth={2.5} />
          </div>
          <span className={styles.logoText}>Oráculo Acadêmico</span>
        </Link>

        <nav className={styles.nav} aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href="/oraculoacademico/login" className={styles.loginLink}>
            Entrar
          </Link>

          <Link href="/oraculoacademico/cadastro" className={styles.ctaButton}>
            Quero Participar
          </Link>
        </div>
      </div>
    </header>
  );
}
