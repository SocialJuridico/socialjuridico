"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { MESSAGE_FILTERS } from "../config/messageFilters";

async function readJson(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }

  return payload;
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(value) {
  const date = parseDate(value);
  if (!date) return "sem-data";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateLabel(value) {
  const date = parseDate(value);
  if (!date) return "Data não informada";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function useAdminMessages() {
  const router = useRouter();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState(MESSAGE_FILTERS.ALL);
  const [conversationToDelete, setConversationToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/mensagens", {
        cache: "no-store",
      });
      const payload = await readJson(response);
      setConversations(payload.data || []);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Erro ao carregar mensagens.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const summary = useMemo(() => {
    return conversations.reduce(
      (accumulator, conversation) => ({
        conversations: accumulator.conversations + 1,
        messages: accumulator.messages + Number(conversation.totalMessages || 0),
        chats: accumulator.chats + Number(conversation.chatMessages || 0),
        broadcasts:
          accumulator.broadcasts + Number(conversation.broadcastMessages || 0),
      }),
      { conversations: 0, messages: 0, chats: 0, broadcasts: 0 },
    );
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return conversations.filter((conversation) => {
      if (
        activeFilter === MESSAGE_FILTERS.CHAT &&
        Number(conversation.chatMessages || 0) === 0
      ) {
        return false;
      }

      if (
        activeFilter === MESSAGE_FILTERS.BROADCAST &&
        Number(conversation.broadcastMessages || 0) === 0
      ) {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        conversation.lawyer?.name,
        conversation.lawyer?.email,
        conversation.lawyer?.oab,
        conversation.lastTitle,
        conversation.lastMessage,
      ].some((value) =>
        String(value || "").toLowerCase().includes(normalizedSearch),
      );
    });
  }, [activeFilter, conversations, searchTerm]);

  const groupedConversations = useMemo(() => {
    const groups = new Map();

    for (const conversation of filteredConversations) {
      const parsedDate = parseDate(conversation.lastDate);
      const key = getDateKey(conversation.lastDate);
      const current = groups.get(key) || {
        key,
        label: getDateLabel(conversation.lastDate),
        timestamp: parsedDate?.getTime() || 0,
        items: [],
      };

      current.items.push(conversation);
      groups.set(key, current);
    }

    return Array.from(groups.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((group) => ({
        ...group,
        items: group.items.sort(
          (a, b) =>
            (parseDate(b.lastDate)?.getTime() || 0) -
            (parseDate(a.lastDate)?.getTime() || 0),
        ),
      }));
  }, [filteredConversations]);

  const openConversation = useCallback((conversation) => {
    if (!conversation?.userId) return;
    router.push(`/chat/admin/${conversation.userId}`);
  }, [router]);

  const requestDelete = useCallback((conversation) => {
    setConversationToDelete(conversation);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return;
    setConversationToDelete(null);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    const partnerId = conversationToDelete?.userId;
    if (!partnerId) return;

    setDeleting(true);
    const toastId = toast.loading("Removendo conversa...");

    try {
      const response = await fetch(
        `/api/admin/mensagens?partnerId=${encodeURIComponent(partnerId)}`,
        { method: "DELETE" },
      );
      const payload = await readJson(response);
      setConversations((current) =>
        current.filter((conversation) => conversation.userId !== partnerId),
      );
      setConversationToDelete(null);
      toast.success(payload.message || "Conversa removida.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover conversa.",
        { id: toastId },
      );
    } finally {
      setDeleting(false);
    }
  }, [conversationToDelete]);

  return {
    conversations,
    filteredConversations,
    groupedConversations,
    loading,
    loadError,
    searchTerm,
    activeFilter,
    summary,
    conversationToDelete,
    deleting,
    setSearchTerm,
    setActiveFilter,
    loadConversations,
    openConversation,
    requestDelete,
    closeDeleteDialog,
    confirmDelete,
  };
}
