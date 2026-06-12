"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  NOTIFICATION_FILTERS,
  getNotificationPartnerId,
  isChatNotification,
} from "../config/notificationTypes";

async function readJson(response) {
  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }

  return payload;
}

export function useAdminNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState(NOTIFICATION_FILTERS.ALL);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [deleteAllRequested, setDeleteAllRequested] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/notificacoes", {
        cache: "no-store",
      });
      const payload = await readJson(response);
      setNotifications(payload.data || []);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Erro ao carregar notificações.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const summary = useMemo(() => {
    const unread = notifications.filter((notification) => !notification.lida).length;
    const chat = notifications.filter(isChatNotification).length;

    return {
      total: notifications.length,
      unread,
      read: notifications.length - unread,
      chat,
    };
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return notifications.filter((notification) => {
      if (
        activeFilter === NOTIFICATION_FILTERS.UNREAD &&
        notification.lida
      ) {
        return false;
      }

      if (
        activeFilter === NOTIFICATION_FILTERS.CHAT &&
        !isChatNotification(notification)
      ) {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        notification.titulo,
        notification.mensagem,
        notification.tipo,
      ].some((value) =>
        String(value || "").toLowerCase().includes(normalizedSearch),
      );
    });
  }, [activeFilter, notifications, searchTerm]);

  const markAsRead = useCallback(async (notificationId) => {
    const notification = notifications.find((item) => item.id === notificationId);
    if (!notification || notification.lida) return;

    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, lida: true } : item,
      ),
    );

    try {
      const response = await fetch("/api/admin/notificacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notificationId }),
      });
      await readJson(response);
    } catch (error) {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, lida: false } : item,
        ),
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível marcar a notificação como lida.",
      );
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    if (!summary.unread) return;

    setMarkingAllRead(true);
    const previous = notifications;
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, lida: true })),
    );

    try {
      const response = await fetch("/api/admin/notificacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const payload = await readJson(response);
      toast.success(payload.message || "Notificações marcadas como lidas.");
    } catch (error) {
      setNotifications(previous);
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar as notificações.",
      );
    } finally {
      setMarkingAllRead(false);
    }
  }, [notifications, summary.unread]);

  const openNotification = useCallback(async (notification) => {
    await markAsRead(notification.id);

    if (!isChatNotification(notification)) return;

    const partnerId = getNotificationPartnerId(notification);

    if (!partnerId) {
      toast.error("Não foi possível identificar o participante da conversa.");
      return;
    }

    router.push(`/chat/admin/${partnerId}`);
  }, [markAsRead, router]);

  const requestDelete = useCallback((notification) => {
    setDeleteAllRequested(false);
    setNotificationToDelete(notification);
  }, []);

  const requestDeleteAll = useCallback(() => {
    if (!notifications.length) return;
    setNotificationToDelete(null);
    setDeleteAllRequested(true);
  }, [notifications.length]);

  const closeDeleteDialog = useCallback(() => {
    if (deleting) return;
    setNotificationToDelete(null);
    setDeleteAllRequested(false);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    const targetId = deleteAllRequested
      ? "all"
      : notificationToDelete?.id;

    if (!targetId) return;

    setDeleting(true);
    const toastId = toast.loading(
      deleteAllRequested
        ? "Limpando notificações..."
        : "Removendo notificação...",
    );

    try {
      const response = await fetch(
        `/api/admin/notificacoes?id=${encodeURIComponent(targetId)}`,
        { method: "DELETE" },
      );
      const payload = await readJson(response);

      setNotifications((current) =>
        deleteAllRequested
          ? []
          : current.filter((item) => item.id !== targetId),
      );
      setNotificationToDelete(null);
      setDeleteAllRequested(false);
      toast.success(payload.message || "Notificação removida.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao remover notificação.",
        { id: toastId },
      );
    } finally {
      setDeleting(false);
    }
  }, [deleteAllRequested, notificationToDelete]);

  return {
    notifications,
    filteredNotifications,
    loading,
    loadError,
    searchTerm,
    activeFilter,
    summary,
    notificationToDelete,
    deleteAllRequested,
    deleting,
    markingAllRead,
    setSearchTerm,
    setActiveFilter,
    loadNotifications,
    markAllAsRead,
    openNotification,
    requestDelete,
    requestDeleteAll,
    closeDeleteDialog,
    confirmDelete,
  };
}
