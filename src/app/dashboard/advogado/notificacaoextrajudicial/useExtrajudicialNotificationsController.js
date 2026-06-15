"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { useLawyerSession } from "../LawyerSessionContext";
import { downloadNotificationCertificate } from "./notificationCertificate";

const EMPTY_METRICS = {
  total: 0,
  pending: 0,
  read: 0,
  located: 0,
  errors: 0,
  readRate: 0,
};

const EMPTY_PAGINATION = {
  page: 1,
  pageSize: 12,
  total: 0,
  totalPages: 1,
};

const INITIAL_FORM = {
  mode: "draft",
  clientId: "",
  recipientEmail: "",
  tone: "formal",
  draftText: "",
  caseId: "",
};

function readJson(response) {
  return response.json().catch(() => null);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function validateFile(file) {
  if (!file) return "Selecione o documento que será enviado.";
  const allowedTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
  ]);
  const extension = String(file.name || "")
    .split(".")
    .pop()
    ?.toLowerCase();
  const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png"]);
  if (!allowedTypes.has(file.type) && !allowedExtensions.has(extension)) {
    return "Envie um arquivo PDF, JPG ou PNG.";
  }
  if (file.size > 15 * 1024 * 1024) {
    return "O arquivo deve ter no máximo 15 MB.";
  }
  return "";
}

export function useExtrajudicialNotifications() {
  const router = useRouter();
  const session = useLawyerSession();
  const { openPlansModal } = session;

  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [clients, setClients] = useState([]);
  const [plan, setPlan] = useState({ type: "FREE", included: false });
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [filters, setFilters] = useState({ search: "", status: "all" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [file, setFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const fileInputRef = useRef(null);
  const [certificateId, setCertificateId] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearch(filters.search.trim()),
      350,
    );
    return () => window.clearTimeout(timer);
  }, [filters.search]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const load = useCallback(
    async (targetPage = 1) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(pagination.pageSize || 12),
        status: filters.status,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      try {
        const response = await fetch(
          `/api/advogado/notificacaoextrajudicial?${params}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await readJson(response);

        if (response.status === 401) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/notificacaoextrajudicial")}`,
          );
          return;
        }
        if (response.status === 403 && data?.upgradeRequired) {
          openPlansModal();
        }
        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message ||
              "Não foi possível carregar as notificações extrajudiciais.",
          );
        }

        setItems(data.data || []);
        setMetrics(data.metrics || EMPTY_METRICS);
        setClients(data.clients || []);
        setPlan(data.plan || { type: "FREE", included: false });
        setPagination(data.pagination || EMPTY_PAGINATION);
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        console.error("[NotificacaoExtrajudicial] Falha ao carregar:", loadError);
        setError(
          loadError.message ||
            "Não foi possível carregar as notificações extrajudiciais.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, [debouncedSearch, filters.status, openPlansModal, pagination.pageSize, router],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setFile(null);
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const openModal = useCallback(() => {
    resetForm();
    setModalOpen(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setModalOpen(false);
    resetForm();
  }, [resetForm, submitting]);

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: "" }));
  }, []);

  const selectMode = useCallback((mode) => {
    setForm((current) => ({ ...current, mode }));
    setFieldErrors((current) => ({
      ...current,
      draftText: "",
      file: "",
    }));
  }, []);

  const selectClient = useCallback(
    (clientId) => {
      const client = clients.find((item) => item.id === clientId);
      setForm((current) => ({
        ...current,
        clientId,
        recipientEmail: client?.email || current.recipientEmail,
      }));
      setFieldErrors((current) => ({
        ...current,
        clientId: "",
        recipientEmail: "",
      }));
    },
    [clients],
  );

  const selectFile = useCallback((selectedFile) => {
    const nextFile = selectedFile || null;
    setFile(nextFile);
    setFieldErrors((current) => ({
      ...current,
      file: nextFile ? validateFile(nextFile) : "",
    }));
  }, []);

  const generateDraftWithAi = useCallback(async () => {
    const content = form.draftText.trim();
    if (generatingDraft || submitting) return;
    if (content.length < 40) {
      setFieldErrors((current) => ({
        ...current,
        draftText:
          "Descreva os fatos, o pedido e o prazo com pelo menos 40 caracteres para a IA gerar a minuta.",
      }));
      return;
    }

    setGeneratingDraft(true);
    setFieldErrors((current) => ({ ...current, draftText: "" }));
    try {
      const selectedClient = clients.find((client) => client.id === form.clientId);
      const response = await fetch("/api/advogado/notificacaoextrajudicial/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: form.tone,
          content,
          clientName: selectedClient?.name || "",
        }),
      });
      const data = await readJson(response);
      if (response.status === 401) {
        router.replace(
          `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/notificacaoextrajudicial")}`,
        );
        return;
      }
      if (response.status === 403 && data?.upgradeRequired) {
        openPlansModal();
      }
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível gerar a minuta com IA.");
      }

      setForm((current) => ({
        ...current,
        mode: "draft",
        draftText: data.draftText || current.draftText,
      }));
      toast.success("Minuta gerada com IA. Revise antes de enviar.");
    } catch (generateError) {
      toast.error(
        generateError.message || "Não foi possível gerar a minuta com IA.",
      );
    } finally {
      setGeneratingDraft(false);
    }
  }, [
    clients,
    form.clientId,
    form.draftText,
    form.tone,
    generatingDraft,
    openPlansModal,
    router,
    submitting,
  ]);

  const validate = useCallback(() => {
    const errors = {};
    if (!isValidEmail(form.recipientEmail)) {
      errors.recipientEmail = "Informe um e-mail válido para o destinatário.";
    }
    if (form.mode === "draft" && form.draftText.trim().length < 80) {
      errors.draftText =
        "A minuta precisa ter ao menos 80 caracteres para gerar o documento.";
    }
    if (form.mode === "upload") {
      const fileError = validateFile(file);
      if (fileError) errors.file = fileError;
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [file, form.draftText, form.mode, form.recipientEmail]);

  const submit = useCallback(
    async (event) => {
      event?.preventDefault();
      if (submitting || !validate()) return;

      setSubmitting(true);
      const body = new FormData();
      body.append("destinatario_email", form.recipientEmail.trim());
      body.append("tone", form.tone);
      body.append("client_id", form.clientId);
      body.append("case_id", form.caseId);
      if (form.mode === "draft") {
        body.append("draft_text", form.draftText.trim());
      } else if (file) {
        body.append("file", file);
      }

      try {
        const response = await fetch(
          "/api/advogado/notificacaoextrajudicial/enviar",
          {
            method: "POST",
            body,
          },
        );
        const data = await readJson(response);
        if (response.status === 401) {
          router.replace(
            `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/notificacaoextrajudicial")}`,
          );
          return;
        }
        if (response.status === 403 && data?.upgradeRequired) {
          openPlansModal();
        }
        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Não foi possível enviar a notificação.",
          );
        }

        toast.success(data.message || "Notificação enviada com sucesso.");
        setModalOpen(false);
        resetForm();
        await load(1);
      } catch (submitError) {
        toast.error(
          submitError.message || "Não foi possível enviar a notificação.",
        );
      } finally {
        setSubmitting(false);
      }
    }, [
      file,
      form,
      load,
      openPlansModal,
      resetForm,
      router,
      submitting,
      validate,
    ],
  );

  const copyText = useCallback(async (value, successMessage) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage || "Copiado.");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  }, []);

  const copyTrackingLink = useCallback(
    (notification) => {
      if (!notification?.trackingUrl) return;
      const absoluteUrl = `${window.location.origin}${notification.trackingUrl}`;
      return copyText(absoluteUrl, "Link rastreável copiado.");
    },
    [copyText],
  );

  const openTrackingPage = useCallback((notification) => {
    if (!notification?.id) return;
    window.open(
      `/dashboard/advogado/notificacaoextrajudicial/preview/${notification.id}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, []);

  const openDocument = useCallback((notification) => {
    if (!notification?.documentUrl) return;
    window.open(notification.documentUrl, "_blank", "noopener,noreferrer");
  }, []);

  const downloadCertificate = useCallback(
    async (notification) => {
      if (!notification?.id || certificateId) return;
      setCertificateId(notification.id);
      try {
        await downloadNotificationCertificate(notification);
        toast.success("Certificado de rastreabilidade gerado.");
      } catch (certificateError) {
        toast.error(
          certificateError.message ||
            "Não foi possível gerar o certificado de rastreabilidade.",
        );
      } finally {
        setCertificateId("");
      }
    },
    [certificateId],
  );

  const currentRange = useMemo(() => {
    if (!pagination.total) return "0 notificações";
    const start = (pagination.page - 1) * pagination.pageSize + 1;
    const end = Math.min(
      pagination.total,
      pagination.page * pagination.pageSize,
    );
    return `${start}–${end} de ${pagination.total}`;
  }, [pagination]);

  return {
    ...session,
    items,
    metrics,
    clients,
    plan,
    pagination,
    filters,
    setFilters,
    loading,
    error,
    load,
    reload: () => load(pagination.page),
    currentRange,
    modalOpen,
    openModal,
    closeModal,
    form,
    updateField,
    selectMode,
    selectClient,
    file,
    selectFile,
    fileInputRef,
    fieldErrors,
    submitting,
    generatingDraft,
    generateDraftWithAi,
    submit,
    copyText,
    copyTrackingLink,
    openTrackingPage,
    openDocument,
    certificateId,
    downloadCertificate,
  };
}
