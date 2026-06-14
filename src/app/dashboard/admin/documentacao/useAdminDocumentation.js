"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import {
  deleteAdminDocumentation,
  listAdminDocumentation,
  processAdminDocumentation,
  publishAdminDocumentation,
  updateAdminDocumentation,
  uploadAdminDocumentation,
} from "@/services/documentationService";

export function useAdminDocumentation() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(null);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );

  const syncForm = useCallback((item) => {
    if (!item) {
      setForm(null);
      return;
    }
    setForm({
      title: item.title || "",
      subtitle: item.subtitle || "",
      summary: item.summary || "",
      contentType: item.content_type || "ARTICLE",
      targetAudience: item.target_audience || "LAWYER",
      sortOrder: Number(item.sort_order || 0),
    });
  }, []);

  useEffect(() => {
    syncForm(selected);
  }, [selected, syncForm]);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const result = await listAdminDocumentation();
      const nextItems = result.data || [];
      setItems(nextItems);
      setSummary(result.summary || null);
      setSelectedId((current) =>
        current && nextItems.some((item) => item.id === current)
          ? current
          : nextItems[0]?.id || "",
      );
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        router.replace("/dashboard/cliente");
        return;
      }
      setLoadError(error.message || "Não foi possível carregar a documentação.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const select = useCallback((item) => {
    setSelectedId(item.id);
  }, []);

  const updateField = useCallback((field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  }, []);

  const upload = useCallback(async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadAdminDocumentation(file);
      toast.success("PDF enviado. Iniciando análise da IA...");
      const processed = await processAdminDocumentation(uploaded.data);
      toast.success(processed.message || "PDF estruturado pela IA.");
      setSelectedId(processed.data.id);
      await load();
    } catch (error) {
      toast.error(error.message || "Não foi possível processar o PDF.");
      await load();
    } finally {
      setUploading(false);
    }
  }, [load]);

  const process = useCallback(async (item) => {
    setBusyId(item.id);
    try {
      const result = await processAdminDocumentation(item);
      toast.success(result.message || "PDF processado.");
      await load();
    } catch (error) {
      toast.error(error.message || "Não foi possível processar o PDF.");
      await load();
    } finally {
      setBusyId("");
    }
  }, [load]);

  const save = useCallback(async () => {
    if (!selected || !form) return;
    setBusyId(selected.id);
    try {
      const result = await updateAdminDocumentation(selected.id, {
        ...form,
        updatedAt: selected.updated_at,
      });
      toast.success(result.message || "Documentação atualizada.");
      await load();
    } catch (error) {
      toast.error(error.message || "Não foi possível salvar.");
      if (error.payload?.conflict) await load();
    } finally {
      setBusyId("");
    }
  }, [form, load, selected]);

  const togglePublish = useCallback(async (item) => {
    setBusyId(item.id);
    try {
      const result = await publishAdminDocumentation(item, item.status !== "PUBLISHED");
      toast.success(result.message || "Publicação alterada.");
      await load();
    } catch (error) {
      toast.error(error.message || "Não foi possível alterar a publicação.");
      if (error.payload?.conflict) await load();
    } finally {
      setBusyId("");
    }
  }, [load]);

  const remove = useCallback(async (item) => {
    const reason = window.prompt(
      `Justificativa para arquivar “${item.title}” (mínimo de 10 caracteres):`,
    );
    if (!reason) return;
    setBusyId(item.id);
    try {
      await deleteAdminDocumentation(item.id, reason);
      toast.success("Documentação arquivada com histórico preservado.");
      await load();
    } catch (error) {
      toast.error(error.message || "Não foi possível arquivar.");
    } finally {
      setBusyId("");
    }
  }, [load]);

  return {
    items,
    summary,
    selected,
    form,
    loading,
    loadError,
    busyId,
    uploading,
    load,
    select,
    updateField,
    upload,
    process,
    save,
    togglePublish,
    remove,
  };
}
