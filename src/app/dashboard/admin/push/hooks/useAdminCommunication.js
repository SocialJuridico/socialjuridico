"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  COMMUNICATION_CHANNELS,
  EMAIL_LIMITS,
  EMAIL_TARGET_OPTIONS,
  PUSH_LIMITS,
  PUSH_TARGET_OPTIONS,
  getRecipientType,
} from "../config/communicationOptions";

const INITIAL_PUSH = {
  targetMode: "TODOS",
  targetId: "",
  title: "",
  message: "",
};

const INITIAL_EMAIL = {
  targetMode: "EMAIL_TODOS_ADVOGADOS",
  targetId: "",
  title: "",
  message: "",
};

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Não foi possível concluir a operação.");
  }
  return payload;
}

export function useAdminCommunication() {
  const [activeChannel, setActiveChannel] = useState(COMMUNICATION_CHANNELS.PUSH);
  const [pushForm, setPushForm] = useState(INITIAL_PUSH);
  const [emailForm, setEmailForm] = useState(INITIAL_EMAIL);
  const [sendingPush, setSendingPush] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [recipientsByType, setRecipientsByType] = useState({});
  const [loadingRecipientType, setLoadingRecipientType] = useState("");

  const activeForm = activeChannel === COMMUNICATION_CHANNELS.PUSH
    ? pushForm
    : emailForm;
  const activeOptions = activeChannel === COMMUNICATION_CHANNELS.PUSH
    ? PUSH_TARGET_OPTIONS
    : EMAIL_TARGET_OPTIONS;
  const activeLimits = activeChannel === COMMUNICATION_CHANNELS.PUSH
    ? PUSH_LIMITS
    : EMAIL_LIMITS;
  const activeRecipientType = getRecipientType(activeChannel, activeForm.targetMode);
  const activeRecipients = activeRecipientType
    ? recipientsByType[activeRecipientType] || []
    : [];

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
      toast.error(error instanceof Error ? error.message : "Erro ao carregar destinatários.");
    } finally {
      setLoadingRecipientType("");
    }
  }, [recipientsByType]);

  useEffect(() => {
    if (activeRecipientType) loadRecipients(activeRecipientType);
  }, [activeRecipientType, loadRecipients]);

  const updateActiveForm = useCallback((field, value) => {
    const setter = activeChannel === COMMUNICATION_CHANNELS.PUSH
      ? setPushForm
      : setEmailForm;

    setter((current) => ({
      ...current,
      [field]: value,
      ...(field === "targetMode" ? { targetId: "" } : null),
    }));
  }, [activeChannel]);

  const canSubmit = useMemo(() => {
    if (!activeForm.title.trim() || !activeForm.message.trim()) return false;
    if (activeRecipientType && !activeForm.targetId) return false;
    return true;
  }, [activeForm, activeRecipientType]);

  const submit = useCallback(async () => {
    if (!canSubmit) {
      toast.error(
        activeRecipientType && !activeForm.targetId
          ? "Selecione um destinatário específico."
          : "Preencha o título e a mensagem.",
      );
      return;
    }

    const isPush = activeChannel === COMMUNICATION_CHANNELS.PUSH;
    const setSending = isPush ? setSendingPush : setSendingEmail;
    const endpoint = isPush ? "/api/admin/push" : "/api/admin/email";
    const toastId = toast.loading(
      isPush ? "Enviando notificação push..." : "Enviando e-mails...",
    );

    setSending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeForm),
      });
      const payload = await readJson(response);

      if (isPush) {
        setPushForm((current) => ({ ...INITIAL_PUSH, targetMode: current.targetMode }));
      } else {
        setEmailForm((current) => ({ ...INITIAL_EMAIL, targetMode: current.targetMode }));
      }

      toast.success(payload.message || "Comunicação enviada com sucesso.", {
        id: toastId,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao enviar comunicação.",
        { id: toastId },
      );
    } finally {
      setSending(false);
    }
  }, [activeChannel, activeForm, activeRecipientType, canSubmit]);

  return {
    activeChannel,
    activeForm,
    activeOptions,
    activeLimits,
    activeRecipientType,
    activeRecipients,
    loadingRecipients: loadingRecipientType === activeRecipientType,
    sending: activeChannel === COMMUNICATION_CHANNELS.PUSH
      ? sendingPush
      : sendingEmail,
    canSubmit,
    setActiveChannel,
    updateActiveForm,
    submit,
  };
}
