"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CirclePlus,
  HelpCircle,
  Home,
  Info,
  UsersRound,
} from "lucide-react";

import styles from "./MobileNav.module.css";

const navItems = [
  {
    href: "#inicio",
    sectionId: "inicio",
    label: "Início",
    icon: Home,
  },
  {
    href: "#como-funciona",
    sectionId: "como-funciona",
    label: "Como funciona",
    shortLabel: "Como funciona",
    icon: Info,
  },
  {
    href: "/cadastro",
    label: "Publicar",
    icon: CirclePlus,
    primary: true,
  },
  {
    href: "#comunidade",
    sectionId: "comunidade",
    label: "Comunidade",
    icon: UsersRound,
  },
  {
    href: "#duvidas",
    sectionId: "duvidas",
    label: "Dúvidas",
    icon: HelpCircle,
  },
];

export default function MobileNav() {
  const [activeSection, setActiveSection] = useState("inicio");

  useEffect(() => {
    const sectionIds = navItems
      .map((item) => item.sectionId)
      .filter(Boolean);

    function updateActiveSection() {
      const referencePosition = window.scrollY + window.innerHeight * 0.32;

      if (window.scrollY < 80) {
        setActiveSection("inicio");
        return;
      }

      let currentSection = "inicio";

      for (const sectionId of sectionIds) {
        const section = document.getElementById(sectionId);

        if (!section) {
          continue;
        }

        const sectionTop = section.offsetTop;
        const sectionBottom = sectionTop + section.offsetHeight;

        if (
          referencePosition >= sectionTop &&
          referencePosition < sectionBottom
        ) {
          currentSection = sectionId;
          break;
        }

        if (referencePosition >= sectionTop) {
          currentSection = sectionId;
        }
      }

      setActiveSection(currentSection);
    }

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection, {
      passive: true,
    });

    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  function handleSectionClick(sectionId) {
    if (sectionId) {
      setActiveSection(sectionId);
    }
  }

  return (
    <nav
      className={styles.mobileNav}
      aria-label="Navegação móvel"
    >
      <div className={styles.navContainer}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.sectionId === activeSection;

          if (item.primary) {
            return (
              <Link
                key={item.href}
                prefetch={false}
                href={item.href}
                className={styles.primaryItem}
                aria-label="Publicar meu caso gratuitamente"
              >
                <span className={styles.primaryIcon}>
                  <Icon size={27} strokeWidth={2} aria-hidden="true" />
                </span>

                <span className={styles.primaryLabel}>{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => handleSectionClick(item.sectionId)}
              className={`${styles.navItem} ${
                isActive ? styles.active : ""
              }`}
              aria-current={isActive ? "location" : undefined}
            >
              <span className={styles.iconWrapper}>
                <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
              </span>

              <span className={styles.navLabel}>
                {item.shortLabel || item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}