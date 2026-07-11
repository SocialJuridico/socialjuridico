"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scale } from "lucide-react";

import { getStaffNavGroups } from "./staffNav";
import styles from "../../oraculo/OraculoStudentDashboard.module.css";

function isActive(pathname, href, exact) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function StaffSidebar({ role, homeHref, brandLabel }) {
  const pathname = usePathname() || "";
  const groups = getStaffNavGroups(role);

  return (
    <aside className={styles.sidebar}>
      <Link href={homeHref} className={styles.brand}>
        <span className={styles.brandIcon}>
          <Scale size={22} aria-hidden="true" />
        </span>
        <span>
          <strong>Oráculo</strong>
          <small>{brandLabel}</small>
        </span>
      </Link>

      <nav className={styles.nav} aria-label={`Navegação do ${brandLabel}`}>
        {groups.map((group) => (
          <section key={group.title} className={styles.navGroup}>
            <h2>{group.title}</h2>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href, item.href === homeHref);
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
