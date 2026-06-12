"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  BROADCAST_AUDIENCES,
  BROADCAST_AUDIENCE_OPTIONS,
  BROADCAST_LIMITS,
  getAudienceOption,
  getAudienceRecipientType,
  isCollectiveAudience,
} from "../config/broadcastOptions";

const INITIAL_FORM = {
  audience: BROADCAST_AUDIENCES.ALL_USERS,
  recipientId: "",
  title: "",
  message: "",
};

const EMPTY_COUNTS = {
  clients: 0,
  lawyers: 0,
  admins: 0,
  total: 0,
};

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }
  return payload;
}

export function useAdminBroadcasts() {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recipientsByType, setRecipientsByType] = useState({});
  const [loadingRecipientType, setLoadingRecipientType] = useState("");

  const recipientType = getAudienceRecipientType(form.audience);
  const audienceOption = getAudienceOption(form.audience);
  const recipients = recipientType ? recipientsByType[recipientType] || [] : [];

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/comunicados", {
        cache: "no-store",
      });
      const payload = await readJson(response);
      setCounts(payload.data?.counts || EMPTY_COUNTS);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Erro ao carregar comunicados.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const loadRecipients = useCallback(async (type) => {
    if (!type || recipientsByType[type]) return;

    setLoadingRecipientType(type);
    try {
      const response = await fetch(
        `/api/admin/communication/recipients?type=${encodeURIComponent(type)}`,
        { cache: "no-store" },
      );
      const payload = await readJson(response);
      setRecipientsByType((current) => ({
        ...current,
        [type]: payload.data || [],
      }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao carregar destinatários.",
      );
    } finally {
      setLoadingRecipientType("");
    }
  }, [recipientsByType]);

  useEffect(() => {
    if (recipientType) loadRecipients(recipientType);
  }, [loadRecipients, recipientType]);

  const estimatedRecipients = useMemo(() => {
    switch (form.audience) {
      case BROADCAST_AUDIENCES.ALL_USERS:
        return counts.total;
      case BROADCAST_AUDIENCES.ALL_LAWYERS:
        return counts.lawyers;
      case BROADCAST_AUDIENCES.ALL_CLIENTS:
        return counts.clients;
      case BROADCAST_AUDIENCES.SINGLE_LAWYER:
      case BROADCAST_AUDIENCES.SINGLE_CLIENT:
        return form.recipientId ? 1 : 0;
      default:
        return 0;
    }
  }, [counts, form.audience, form.recipientId]);

  const canSubmit = useMemo(() => {
    if (!form.title.trim() || !form.message.trim()) return false;
    if (recipientType && !form.recipientId) return false;
    return estimatedRecipients > 0;
  }, [estimatedRecipients, form, recipientType]);

  const updateForm = useCallback((field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "audience" ? { recipientId: "" } : null),
    }));
  }, []);

  const sendBroadcast = useCallback(async () => {
    if (!canSubmit) {
      toast.error(
        recipientType && !form.recipientId
          ? "Selecione um destinatário."
          : "Preencha título e mensagem.",
      );
      return;
    }

    setSending(true);
    const toastId = toast.loading("Enviando comunicado...");

    try {
      const response = await fetch("/api/admin/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await readJson(response);
      setForm((current) => ({
        ...INITIAL_FORM,
        audience: current.audience,
      }));
      setConfirmOpen(false);
      toast.success(payload.message || "Comunicado enviado.", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar comunicado.",
        { id: toastId },
      );
    } finally {
      setSending(false);
    }
  }, [canSubmit, form, recipientType]);

  const requestSubmit = useCallback(() => {
    if (!canSubmit) {
      toast.error(
        recipientType && !form.recipientId
          ? "Selecione um destinatário."
          : "Preencha título e mensagem.",
      );
      return;
    }

    if (isCollectiveAudience(form.audience)) {
      setConfirmOpen(true);
      return;
    }

    sendBroadcast();
  }, [canSubmit, form, recipientType, sendBroadcast]);

  return {
    counts,
    form,
    loading,
    loadError,
    sending,
    confirmOpen,
    audienceOptions: BROADCAST_AUDIENCE_OPTIONS,
    audienceOption,
    limits: BROADCAST_LIMITS,
    recipientType,
    recipients,
    loadingRecipients: loadingRecipientType === recipientType,
    estimatedRecipients,
    canSubmit,
    setConfirmOpen,
    updateForm,
    loadOverview,
    requestSubmit,
    sendBroadcast,
  };
}
