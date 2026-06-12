"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import ConversationsList from "./components/ConversationsList";
import DeleteConversationDialog from "./components/DeleteConversationDialog";
import MessagesHeader from "./components/MessagesHeader";
import MessagesSummary from "./components/MessagesSummary";
import MessagesToolbar from "./components/MessagesToolbar";
import { useAdminMessages } from "./hooks/useAdminMessages";
import styles from "./MensagensAdmin.module.css";

export default function AdminMensagensPage() {
  const state = useAdminMessages();

  if (state.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.loadingSpinner} aria-hidden="true" />
        <h1>Carregando mensagens</h1>
        <p>Preparando as conversas administrativas.</p>
      </main>
    );
  }

  if (state.loadError && state.conversations.length === 0) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.errorIcon}>
          <AlertTriangle size={28} aria-hidden="true" />
        </span>
        <h1>Não foi possível carregar as mensagens</h1>
        <p>{state.loadError}</p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={state.loadConversations}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Tentar novamente
        </button>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.pageShell}>
        <MessagesHeader
          total={state.summary.conversations}
          loading={state.loading}
          onReload={state.loadConversations}
        />

        {state.loadError && (
          <div className={styles.warningBanner} role="alert">
            <AlertTriangle size={18} aria-hidden="true" />
            <div>
              <strong>Não foi possível atualizar os dados</strong>
              <p>{state.loadError}</p>
            </div>
            <button type="button" onClick={state.loadConversations}>
              Atualizar
            </button>
          </div>
        )}

        <MessagesSummary summary={state.summary} />

        <MessagesToolbar
          searchTerm={state.searchTerm}
          activeFilter={state.activeFilter}
          visibleCount={state.filteredConversations.length}
          onSearchChange={state.setSearchTerm}
          onFilterChange={state.setActiveFilter}
        />

        <ConversationsList
          groups={state.groupedConversations}
          onOpen={state.openConversation}
          onDelete={state.requestDelete}
        />
      </div>

      <DeleteConversationDialog
        conversation={state.conversationToDelete}
        deleting={state.deleting}
        onClose={state.closeDeleteDialog}
        onConfirm={state.confirmDelete}
      />
    </main>
  );
}
