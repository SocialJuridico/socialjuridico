"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale } from "lucide-react";

import { ORACULO_NAV_GROUPS } from "./oraculoNav";
import styles from "./OraculoStudentDashboard.module.css";

function isActive(pathname, href) {
  if (href === "/dashboard/oraculo") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function OraculoSidebar() {
  const pathname = usePathname() || "";

  return (
    <aside className={styles.sidebar}>
      <Link href="/dashboard/oraculo" className={styles.brand}>
        <span className={styles.brandIcon}>
          <Scale size={22} aria-hidden="true" />
        </span>
        <span>
          <strong>Oráculo</strong>
          <small>Acadêmico</small>
        </span>
      </Link>

      <nav className={styles.nav} aria-label="Navegação do estudante">
        {ORACULO_NAV_GROUPS.map((group) => (
          <section key={group.title} className={styles.navGroup}>
            <h2>{group.title}</h2>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={16} aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </section>
        ))}
      </nav>
    </aside>
  );
}
