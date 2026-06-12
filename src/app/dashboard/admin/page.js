"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  LogOut,
  RefreshCw,
  Shield,
} from "lucide-react";

import AdminDashboardSection from "./components/AdminDashboardSection";
import { createAdminSections } from "./config/adminSections";
import { useAdminDashboard } from "./hooks/useAdminDashboard";
import styles from "./AdminDashboard.module.css";

export default function AdminDashboardPage() {
  const {
    admin,
    stats,
    loading,
    loadError,
    reload,
    logout,
  } = useAdminDashboard();

  const sections = useMemo(
    () => createAdminSections(stats),
    [stats],
  );

  if (loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingIcon}>
          <Shield size={32} aria-hidden="true" />
        </span>
        <h1>Carregando painel administrativo</h1>
        <p>Validando sua sessão e preparando as métricas.</p>
      </main>
    );
  }

  if (!admin) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingIcon}>
          <AlertTriangle size={32} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar o painel</h1>
        <p>{loadError || "Atualize a página e tente novamente."}</p>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={reload}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandIcon}>
            <Shield size={20} aria-hidden="true" />
          </span>
          <span>
            <strong>Social Jurídico</strong>
            <small>Administração</small>
          </span>
        </Link>

        <div className={styles.adminProfile}>
          <span className={styles.adminAvatar} aria-hidden="true">
            {(admin.name || admin.email || "A")
              .slice(0, 1)
              .toUpperCase()}
          </span>
          <div>
            <strong>{admin.name || "Administrador"}</strong>
            <span>{admin.email}</span>
          </div>
        </div>

        <nav className={styles.sidebarNav} aria-label="Navegação administrativa">
          <a href="#users">Usuários</a>
          <a href="#communication">Comunicação</a>
          <a href="#operations">Operacional</a>
          <a href="#reports">Relatórios</a>
          <a href="#system">Sistema</a>
        </nav>

        <button
          type="button"
          className={styles.logoutButton}
          onClick={logout}
        >
          <LogOut size={17} aria-hidden="true" />
          Encerrar sessão
        </button>
      </aside>

      <main className={styles.main}>
        <header className={styles.hero}>
          <div>
            <span className={styles.eyebrow}>Central de controle</span>
            <h1>Dashboard Administrativo</h1>
            <p>
              Acompanhe os principais números e acesse as áreas operacionais
              do Social Jurídico.
            </p>
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={reload}
          >
            <RefreshCw size={17} aria-hidden="true" />
            Atualizar dados
          </button>
        </header>

        {loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={19} aria-hidden="true" />
            <div>
              <strong>Dados temporariamente indisponíveis</strong>
              <p>{loadError}</p>
            </div>
            <button type="button" onClick={reload}>
              Tentar novamente
            </button>
          </div>
        )}

        <div className={styles.sections}>
          {sections.map((section) => (
            <div key={section.id} id={section.id}>
              <AdminDashboardSection {...section} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
