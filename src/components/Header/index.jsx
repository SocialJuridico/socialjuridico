import Image from "next/image";
import Link from "next/link";
import { Scale } from "lucide-react";

import Button from "../Button";
import styles from "./Header.module.css";

const navItems = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#diferenciais", label: "Benefícios" },
  { href: "#comunidade", label: "Comunidade" },
  { href: "#duvidas", label: "Dúvidas" },
  { href: "/sou-advogado", label: "Para advogados" },
];

export default function Header() {
  return (
    <header className={styles.headerWrapper}>
      <div className={styles.headerContainer}>
        <Link
          prefetch={false}
          href="/"
          className={styles.logoDesktop}
          aria-label="Ir para a página inicial do Social Jurídico"
        >
          <div className={styles.logoIconBox} aria-hidden="true">
            <Scale size={24} strokeWidth={2.5} />
          </div>

          <span className={styles.logoText}>Social Jurídico</span>
        </Link>

        <Link
          prefetch={false}
          href="/"
          className={styles.logoMobile}
          aria-label="Ir para a página inicial do Social Jurídico"
        >
          <Image
            src="/Logo.png"
            alt="Social Jurídico"
            width={160}
            height={52}
            priority
            className={styles.logoImg}
          />
        </Link>

        <nav className={styles.nav} aria-label="Navegação principal">
          {navItems.map((item) => (
            <Link
              key={item.href}
              prefetch={false}
              href={item.href}
              className={styles.navLink}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link
            prefetch={false}
            href="/login"
            className={styles.loginLink}
          >
            Entrar
          </Link>

          <Link
            prefetch={false}
            href="/cadastro"
            className={styles.signupLink}
          >
            <Button variant="primary" className={styles.signupButton}>
              Publicar meu caso
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}