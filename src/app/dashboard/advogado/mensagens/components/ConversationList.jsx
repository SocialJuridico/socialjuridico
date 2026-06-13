"use client";

import {
  BriefcaseBusiness,
  Clock3,
  MessageCircle,
  Search,
  UserRound,
} from "lucide-react";

import styles from "../Mensagens.module.css";

const FILTERS = [
  { value: "ALL", label: "Todas" },
  { value: "UNREAD", label: "Não lidas" },
  { value: "NEGOTIATING", label: "Negociações" },
  { value: "CASE", label: "Casos" },
];

function initials(value) {
  return (
    String(value || "Cliente")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CL"
  );
}

function formatRelativeDate(value) {
  if (!value) return "Sem mensagens";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

export default function ConversationList({ controller }) {
  return (
    <aside className={styles.conversationPanel} aria-label="Lista de conversas">
      <div className={styles.conversationPanelHeader}>
        <div>
          <span className={styles.panelEyebrow}>Caixa de entrada</span>
          <h2>Conversas</h2>
        </div>
        <span className={styles.totalBadge}>{controller.inbox.summary.total}</span>
      </div>

      <label className={styles.searchBox}>
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={controller.search}
          onChange={(event) => controller.setSearch(event.target.value)}
          placeholder="Buscar cliente, caso ou área"
          maxLength={120}
        />
      </label>

      <div className={styles.filterTabs} role="tablist" aria-label="Filtrar conversas">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={controller.filter === item.value ? styles.filterActive : ""}
            onClick={() => controller.setFilter(item.value)}
            role="tab"
            aria-selected={controller.filter === item.value}
          >
            {item.label}
            {item.value === "UNREAD" && controller.inbox.summary.unread > 0 && (
              <span>{controller.inbox.summary.unread}</span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.conversationScroll}>
        {controller.filteredConversations.length === 0 ? (
          <div className={styles.emptyConversationList}>
            <MessageCircle size={34} aria-hidden="true" />
            <strong>
              {controller.inbox.conversations.length
                ? "Nenhuma conversa corresponde aos filtros"
                : "Nenhuma conversa disponível"}
            </strong>
            <p>
              {controller.inbox.conversations.length
                ? "Altere a busca ou selecione outro filtro."
                : "Negociações aceitas e casos contratados aparecerão aqui."}
            </p>
          </div>
        ) : (
          controller.filteredConversations.map((conversation) => {
            const active = controller.selectedId === conversation.id;
            const latestDate =
              conversation.lastMessage?.createdAt || conversation.startedAt;

            return (
              <button
                key={conversation.id}
                type="button"
                className={`${styles.conversationItem} ${
                  active ? styles.conversationItemActive : ""
                }`}
                onClick={() => controller.chooseConversation(conversation)}
                aria-current={active ? "true" : undefined}
              >
                <span className={styles.clientAvatar}>
                  {conversation.client?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conversation.client.avatar}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    initials(conversation.client?.name)
                  )}
                </span>

                <span className={styles.conversationBody}>
                  <span className={styles.conversationTopLine}>
                    <strong>{conversation.client?.name || "Cliente"}</strong>
                    <time>{formatRelativeDate(latestDate)}</time>
                  </span>

                  <span className={styles.caseLine}>
                    {conversation.mode === "NEGOTIATION" ? (
                      <Clock3 size={12} aria-hidden="true" />
                    ) : (
                      <BriefcaseBusiness size={12} aria-hidden="true" />
                    )}
                    {conversation.case?.title || "Caso"}
                  </span>

                  <span className={styles.previewLine}>
                    {conversation.lastMessage?.direction === "OUT" && (
                      <em>Você: </em>
                    )}
                    {conversation.lastMessage?.preview ||
                      (conversation.mode === "NEGOTIATION"
                        ? "Inicie a negociação com o cliente."
                        : "Envie a primeira mensagem deste caso.")}
                  </span>
                </span>

                {conversation.unreadCount > 0 && (
                  <span className={styles.unreadCount}>
                    {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className={styles.panelPrivacyNote}>
        <UserRound size={13} aria-hidden="true" />
        Dados de contato privados não são exibidos nesta central.
      </div>
    </aside>
  );
}
