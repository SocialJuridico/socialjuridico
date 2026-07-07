"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Facebook,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";

import styles from "./Footer.module.css";

const platformLinks = [
  {
    href: "/cadastro",
    label: "Publicar um caso",
  },
  {
    href: "/sou-advogado",
    label: "Para advogados",
  },
  {
    href: "/#como-funciona",
    label: "Como funciona",
  },
  {
    href: "/seguranca",
    label: "Segurança",
  },
];

const institutionalLinks = [
  {
    href: "/sobre",
    label: "Sobre o Social Jurídico",
  },
  {
    href: "/#comunidade",
    label: "Nossa comunidade",
  },
  {
    href: "/contato",
    label: "Contato",
  },
];

const legalLinks = [
  {
    href: "/termos",
    label: "Termos de uso",
  },
  {
    href: "/privacidade",
    label: "Política de privacidade",
  },
  {
    href: "/exclusao-de-dados",
    label: "Exclusão de dados",
  },
];

export default function Footer() {
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();

  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/assinatura/app") ||
    pathname === "/assinatura/entrar" ||
    pathname === "/assinatura/cadastro" ||
    pathname?.startsWith("/oraculoacademico")
  ) {
    return null;
  }

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brandColumn}>
          <Link
            prefetch={false}
            href="/"
            className={styles.logoWrapper}
            aria-label="Ir para a página inicial do Social Jurídico"
          >
            <span className={styles.logoIcon} aria-hidden="true">
              <Scale size={26} strokeWidth={2.2} />
            </span>

            <span className={styles.logoText}>
              Social
              <span className={styles.goldText}> Jurídico</span>
            </span>
          </Link>

          <p className={styles.brandDescription}>
            Uma plataforma digital criada para facilitar o contato entre
            pessoas que precisam de apoio jurídico e advogados cadastrados.
          </p>

          <div className={styles.socialLinks}>
            <a
              href="https://www.facebook.com/groups/1667675480204134"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
              aria-label="Visitar a comunidade Preciso de um Advogado no Facebook"
            >
              <Facebook size={18} aria-hidden="true" />
            </a>

            <Link
              prefetch={false}
              href="/contato"
              className={styles.socialLink}
              aria-label="Entrar em contato com o Social Jurídico"
            >
              <Mail size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <nav
          className={styles.linkColumn}
          aria-labelledby="footer-platform-title"
        >
          <h2
            id="footer-platform-title"
            className={styles.columnTitle}
          >
            Plataforma
          </h2>

          <ul className={styles.linkList}>
            {platformLinks.map((item) => (
              <li key={item.href}>
                <Link
                  prefetch={false}
                  href={item.href}
                  className={styles.navLink}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav
          className={styles.linkColumn}
          aria-labelledby="footer-institutional-title"
        >
          <h2
            id="footer-institutional-title"
            className={styles.columnTitle}
          >
            Institucional
          </h2>

          <ul className={styles.linkList}>
            {institutionalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  prefetch={false}
                  href={item.href}
                  className={styles.navLink}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav
          className={styles.linkColumn}
          aria-labelledby="footer-legal-title"
        >
          <h2
            id="footer-legal-title"
            className={styles.columnTitle}
          >
            Legal
          </h2>

          <ul className={styles.linkList}>
            {legalLinks.map((item) => (
              <li key={item.href}>
                <Link
                  prefetch={false}
                  href={item.href}
                  className={styles.navLink}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className={styles.legalNotice}>
        <ShieldCheck size={18} aria-hidden="true" />

        <p>
          O Social Jurídico é uma plataforma de tecnologia e não presta
          serviços advocatícios. A contratação e a relação profissional são
          estabelecidas diretamente entre cliente e advogado.
        </p>
      </div>

      <div className={styles.bottomRow}>
        <p>
          © {currentYear} Social Jurídico. Todos os direitos reservados.
        </p>

        <div className={styles.bottomLinks}>
          <Link prefetch={false} href="/privacidade">
            Privacidade
          </Link>

          <span aria-hidden="true">•</span>

          <Link prefetch={false} href="/termos">
            Termos
          </Link>
        </div>
      </div>
    </footer>
  );
}
