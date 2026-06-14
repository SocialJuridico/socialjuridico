"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  createAgendaItem,
  deleteAgendaItem,
  listAgendaItems,
  updateAgendaItem,
} from "@/services/agendaService";

const EMPTY_FORM = Object.freeze({
  title: "",
  description: "",
  date: "",
  endDate: "",
  type: "PRAZO",
  urgency: "MEDIUM",
  status: "PENDING",
  clientId: "",
  lawyerId: "",
});

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function useLawyerAgenda() {
  const [items, setItems] = useState([]);
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    today: 0,
    nextSevenDays: 0,
    overdue: 0,
    critical: 0,
  });
  const [members, setMembers] = useState([]);
  const [clients, setClients] = useState([]);
  const [governance, setGovernance] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 1 });
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    type: "",
    urgency: "",
    memberId: "",
    page: 1,
    pageSize: 20,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [completingId, setCompletingId] = useState("");

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await listAgendaItems(filters);
      setItems(data.data || []);
      setMetrics(data.metrics || {});
      setMembers(data.members || []);
      setClients(data.clients || []);
      setGovernance(data.governance || null);
      setPagination(data.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 1 });
    } catch (requestError) {
      console.error("[Agenda] Falha ao carregar:", requestError);
      if (requestError.status === 401) {
        window.location.href = `/login?redirectTo=${encodeURIComponent("/dashboard/advogado/agenda")}`;
        return;
      }
      setError(requestError.message || "Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), filters.q ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, filters.q]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleSync = params.get("google_sync");
    if (!googleSync) return;
    if (googleSync === "success") toast.success("Google Calendar conectado com segurança.");
    else toast.error("Não foi possível conectar o Google Calendar.");
    params.delete("google_sync");
    const query = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, []);

  const updateFilter = useCallback((field, value) => {
    setFilters((current) => ({ ...current, [field]: value, page: field === "page" ? value : 1 }));
  }, []);

  const openNew = useCallback(() => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setEditingItem(null);
    setFieldErrors({});
    setForm({
      ...EMPTY_FORM,
      date: toLocalDateTime(start),
      endDate: toLocalDateTime(end),
      lawyerId: governance?.canManageOffice
        ? ""
        : governance?.currentLawyerId || members[0]?.id || "",
    });
    setModalOpen(true);
  }, [governance, members]);

  const openEdit = useCallback((item) => {
    setEditingItem(item);
    setFieldErrors({});
    setForm({
      title: item.title || "",
      description: item.description || "",
      date: toLocalDateTime(item.date),
      endDate: toLocalDateTime(item.endDate),
      type: item.type || "OUTRO",
      urgency: item.urgency || "MEDIUM",
      status: item.status || "PENDING",
      clientId: item.clientId || "",
      lawyerId: item.lawyerId || "",
    });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    if (submitting) return;
    setModalOpen(false);
    setEditingItem(null);
    setFieldErrors({});
  }, [submitting]);

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }, []);

  const submit = useCallback(async (event) => {
    event.preventDefault();
    const date = toIsoDate(form.date);
    const endDate = toIsoDate(form.endDate);
    const localErrors = {};
    if (form.title.trim().length < 3) localErrors.title = "Informe um título com pelo menos 3 caracteres.";
    if (!date) localErrors.date = "Informe a data e hora de início.";
    if (!endDate) localErrors.endDate = "Informe a data e hora de término.";
    if (date && endDate && new Date(endDate) <= new Date(date)) {
      localErrors.endDate = "O término deve ocorrer após o início.";
    }
    if (governance?.canManageOffice && !form.lawyerId) {
      localErrors.lawyerId = "Selecione o responsável.";
    }
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    const payload = {
      title: form.title,
      description: form.description,
      date,
      endDate,
      type: form.type,
      urgency: form.urgency,
      status: form.status,
      clientId: form.clientId || null,
      lawyerId: form.lawyerId || null,
      ...(editingItem ? { updatedAt: editingItem.updatedAt } : {}),
    };

    try {
      const result = editingItem
        ? await updateAgendaItem(editingItem.id, payload)
        : await createAgendaItem(payload);
      toast.success(editingItem ? "Compromisso atualizado." : "Compromisso criado com rastreabilidade.");
      if (result.googleSync?.synced) toast.success("Evento sincronizado com o Google Calendar.");
      setModalOpen(false);
      setEditingItem(null);
      await load({ silent: true });
    } catch (requestError) {
      console.error("[Agenda] Falha ao salvar:", requestError);
      setFieldErrors(requestError.payload?.errors || { form: requestError.message });
      toast.error(requestError.message || "Não foi possível salvar o compromisso.");
      if (requestError.payload?.quotaExceeded) setGovernance((current) => current ? {
        ...current,
        quota: { ...current.quota, remaining: 0 },
      } : current);
    } finally {
      setSubmitting(false);
    }
  }, [editingItem, form, governance, load]);

  const complete = useCallback(async (item) => {
    setCompletingId(item.id);
    try {
      await updateAgendaItem(item.id, {
        status: item.status === "COMPLETED" ? "PENDING" : "COMPLETED",
        updatedAt: item.updatedAt,
      });
      toast.success(item.status === "COMPLETED" ? "Compromisso reaberto." : "Compromisso concluído.");
      await load({ silent: true });
    } catch (requestError) {
      toast.error(requestError.message || "Não foi possível atualizar o status.");
    } finally {
      setCompletingId("");
    }
  }, [load]);

  const remove = useCallback(async (item) => {
    if (!window.confirm(`Excluir “${item.title}”? A exclusão será registrada na auditoria.`)) return;
    setDeletingId(item.id);
    try {
      await deleteAgendaItem(item.id);
      toast.success("Compromisso removido com trilha de auditoria preservada.");
      await load({ silent: true });
    } catch (requestError) {
      toast.error(requestError.message || "Não foi possível excluir o compromisso.");
    } finally {
      setDeletingId("");
    }
  }, [load]);

  const connectGoogle = useCallback(() => {
    window.location.href = `/api/auth/google?redirectTo=${encodeURIComponent("/dashboard/advogado/agenda")}`;
  }, []);

  const hasActiveFilters = useMemo(
    () => Boolean(filters.q || filters.status || filters.type || filters.urgency || filters.memberId),
    [filters],
  );

  const clearFilters = useCallback(() => {
    setFilters((current) => ({ ...current, q: "", status: "", type: "", urgency: "", memberId: "", page: 1 }));
  }, []);

  return {
    items,
    metrics,
    members,
    clients,
    governance,
    pagination,
    filters,
    loading,
    refreshing,
    error,
    modalOpen,
    editingItem,
    form,
    fieldErrors,
    submitting,
    deletingId,
    completingId,
    hasActiveFilters,
    load,
    updateFilter,
    clearFilters,
    openNew,
    openEdit,
    closeModal,
    updateField,
    submit,
    complete,
    remove,
    connectGoogle,
  };
}
