"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import DeleteNotificationDialog from "./components/DeleteNotificationDialog";
import NotificationsHeader from "./components/NotificationsHeader";
import NotificationsList from "./components/NotificationsList";
import NotificationsSummary from "./components/NotificationsSummary";
import NotificationsToolbar from "./components/NotificationsToolbar";
import { useAdminNotifications } from "./hooks/useAdminNotifications";
import styles from "./Notificacoes.module.css";

export default function AdminNotificacoesPage() {
  const state = useAdminNotifications();

  if (state.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando notificações</h1>
        <p>Preparando mensagens e alertas administrativos.</p>
      </main>
    );
  }

  if (state.loadError && state.notifications.length === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar as notificações</h1>
        <p>{state.loadError}</p>
        <button type="button" className={styles.secondaryButton} onClick={state.loadNotifications}>
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageShell}>
        <NotificationsHeader
          total={state.summary.total}
          unread={state.summary.unread}
          loading={state.loading}
          markingAllRead={state.markingAllRead}
          onReload={state.loadNotifications}
          onMarkAllRead={state.markAllAsRead}
          onDeleteAll={state.requestDeleteAll}
        />

        {state.loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Não foi possível atualizar os dados</strong>
              <p>{state.loadError}</p>
            </div>
            <button type="button" onClick={state.loadNotifications}>Atualizar</button>
          </div>
        )}

        <NotificationsSummary summary={state.summary} />
        <NotificationsToolbar
          searchTerm={state.searchTerm}
          activeFilter={state.activeFilter}
          visibleCount={state.filteredNotifications.length}
          onSearchChange={state.setSearchTerm}
          onFilterChange={state.setActiveFilter}
        />
        <NotificationsList
          notifications={state.filteredNotifications}
          onOpen={state.openNotification}
          onDelete={state.requestDelete}
        />
      </div>

      <DeleteNotificationDialog
        notification={state.notificationToDelete}
        deleteAll={state.deleteAllRequested}
        deleting={state.deleting}
        onClose={state.closeDeleteDialog}
        onConfirm={state.confirmDelete}
      />
    </main>
  );
}
