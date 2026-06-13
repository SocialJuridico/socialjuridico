"use client";

import Link from "next/link";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  LogOut,
  Scale,
} from "lucide-react";

import { CLIENT_TABS, CLIENT_TAB_META } from "../clientDashboardConfig";
import styles from "../ClientDashboard.module.css";

export default function ClientShell({ controller, children }) {
  const currentTab = CLIENT_TAB_META[controller.activeTab] || CLIENT_TAB_META.painel;
  const initials = String(controller.profile?.name || "Cliente")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`${styles.dashboard} ${
        controller.sidebarCollapsed ? styles.dashboardCollapsed : ""
      }`}
    >
      <aside className={styles.sidebar} aria-label="Navegação do cliente">
        <div className={styles.sidebarTop}>
          <Link href="/" className={styles.brand} aria-label="Social Jurídico">
            <span className={styles.brandIcon}>
              <Scale size={20} aria-hidden="true" />
            </span>
            {!controller.sidebarCollapsed && (
              <span className={styles.brandText}>Social Jurídico</span>
            )}
          </Link>

          <button
            type="button"
            className={styles.collapseButton}
            onClick={() =>
              controller.setSidebarCollapsed(!controller.sidebarCollapsed)
            }
            aria-label={
              controller.sidebarCollapsed
                ? "Expandir menu lateral"
                : "Recolher menu lateral"
            }
          >
            {controller.sidebarCollapsed ? (
              <ChevronRight size={17} aria-hidden="true" />
            ) : (
              <ChevronLeft size={17} aria-hidden="true" />
            )}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {CLIENT_TABS.map((item) => {
            const Icon = item.icon;
            const active = controller.activeTab === item.id;
            const notificationCount =
              item.id === "notificacoes"
                ? controller.summary.unreadNotifications
                : 0;

            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navButton} ${
                  active ? styles.navButtonActive : ""
                }`}
                onClick={() => controller.setActiveTab(item.id)}
                title={item.label}
                aria-current={active ? "page" : undefined}
              >
                <span className={styles.navIconWrap}>
                  <Icon size={19} aria-hidden="true" />
                  {notificationCount > 0 && (
                    <span className={styles.navBadge}>
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                </span>
                {!controller.sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.navButton}
            onClick={controller.restartTour}
            title="Reiniciar apresentação"
          >
            <HelpCircle size={19} aria-hidden="true" />
            {!controller.sidebarCollapsed && <span>Ajuda e apresentação</span>}
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${styles.logoutButton}`}
            onClick={controller.logout}
            title="Sair da conta"
          >
            <LogOut size={19} aria-hidden="true" />
            {!controller.sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>Área do cliente</span>
            <h1>{currentTab.label}</h1>
            <p>
              Olá, {controller.profile?.name?.split(" ")[0] || "Cliente"}. Acompanhe
              suas solicitações jurídicas em um só lugar.
            </p>
          </div>

          <div className={styles.topbarActions}>
            <button
              type="button"
              className={styles.notificationButton}
              onClick={() => controller.setActiveTab("notificacoes")}
              aria-label="Abrir notificações"
            >
              <Bell size={18} aria-hidden="true" />
              {controller.summary.unreadNotifications > 0 && (
                <span>
                  {controller.summary.unreadNotifications > 99
                    ? "99+"
                    : controller.summary.unreadNotifications}
                </span>
              )}
            </button>
            <button
              type="button"
              className={styles.profileTrigger}
              onClick={() => controller.setActiveTab("perfil")}
              aria-label="Abrir perfil"
            >
              <span>{initials || "CL"}</span>
            </button>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      <nav className={styles.mobileNav} aria-label="Navegação móvel">
        {CLIENT_TABS.filter((item) =>
          ["painel", "novo", "meus-casos", "conversas", "perfil"].includes(
            item.id,
          ),
        ).map((item) => {
          const Icon = item.icon;
          const active = controller.activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={active ? styles.mobileNavActive : ""}
              onClick={() => controller.setActiveTab(item.id)}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
