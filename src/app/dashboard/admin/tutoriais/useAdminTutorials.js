"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { TUTORIAL_ROUTE_REGISTRY } from "@/lib/platformTutorials/tutorialRoutes";
import {
  deleteAdminTutorial,
  listAdminTutorials,
  updateAdminTutorial,
  uploadAdminTutorial,
} from "@/services/tutorialService";

const EMPTY_FORM = {
  title: "",
  description: "",
  audience: "LAWYER",
  routeKey: "LAWYER_DOCUMENTATION",
  version: 1,
  sortOrder: 0,
  autoOpen: true,
  file: null,
};

export function useAdminTutorials() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editing, setEditing] = useState(null);

  const routes = useMemo(
    () => TUTORIAL_ROUTE_REGISTRY.filter((item) =>
      form.audience === "BOTH" ? true : item.audience === form.audience,
    ),
    [form.audience],
  );

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const result = await listAdminTutorials();
      setItems(result.data || []);
      setSummary(result.summary || null);
    } catch (error) {
      if ([401, 403].includes(error.status)) {
        router.replace("/dashboard/cliente");
        return;
      }
      setLoadError(error.message || "Não foi possível carregar os tutoriais.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateField = useCallback((field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "audience") {
        const firstRoute = TUTORIAL_ROUTE_REGISTRY.find((item) =>
          value === "BOTH" ? true : item.audience === value,
        );
        next.routeKey = firstRoute?.key || "";
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  }, []);

  const edit = useCallback((item) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      description: item.description || "",
      audience: item.audience || "LAWYER",
      routeKey: item.route_key || "",
      version: Number(item.version || 1),
      sortOrder: Number(item.sort_order || 0),
      autoOpen: item.auto_open !== false,
      file: null,
    });
  }, []);

  const save = useCallback(async () => {
    if (form.title.trim().length < 3 || !form.routeKey) {
      toast.error("Informe título e rota do tutorial.");
      return;
    }
    if (!editing && !form.file) {
      toast.error("Selecione um vídeo MP4 ou WebM.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateAdminTutorial(editing.id, {
          title: form.title,
          description: form.description,
          audience: form.audience,
          routeKey: form.routeKey,
          version: form.version,
          sortOrder: form.sortOrder,
          autoOpen: form.autoOpen,
          updatedAt: editing.updated_at,
        });
        toast.success("Tutorial atualizado.");
      } else {
        await uploadAdminTutorial(form);
        toast.success("Tutorial enviado como rascunho.");
      }
      reset();
      await load();
    } catch (error) {
      toast.error(error.message || "Não foi possível salvar o tutorial.");
      if (error.payload?.conflict) await load();
    } finally {
      setSaving(false);
    }
  }, [editing, form, load, reset]);

  const togglePublish = useCallback(async (item) => {
    setBusyId(item.id);
    try {
      await updateAdminTutorial(item.id, {
        publish: item.status !== "PUBLISHED",
        updatedAt: item.updated_at,
      });
      toast.success(item.status === "PUBLISHED" ? "Tutorial retirado de publicação." : "Tutorial publicado.");
      await load();
    } catch (error) {
      toast.error(error.message || "Não foi possível alterar a publicação.");
      if (error.payload?.conflict) await load();
    } finally {
      setBusyId("");
    }
  }, [load]);

  const remove = useCallback(async (item) => {
    const reason = window.prompt(`Justificativa para arquivar “${item.title}” (mínimo de 10 caracteres):`);
    if (!reason) return;
    setBusyId(item.id);
    try {
      await deleteAdminTutorial(item.id, reason);
      toast.success("Tutorial arquivado com histórico preservado.");
      if (editing?.id === item.id) reset();
      await load();
    } catch (error) {
      toast.error(error.message || "Não foi possível arquivar o tutorial.");
    } finally {
      setBusyId("");
    }
  }, [editing, load, reset]);

  return {
    items,
    summary,
    loading,
    loadError,
    saving,
    busyId,
    form,
    editing,
    routes,
    load,
    updateField,
    reset,
    edit,
    save,
    togglePublish,
    remove,
  };
}
