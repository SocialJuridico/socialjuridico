"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "",
  image_url: "",
  storage_path: "",
  link_url: "",
  alt_text: "",
  position: "left",
  display_mode: "new",
  target_banner_id: "",
  is_active: true,
  starts_at: "",
  ends_at: "",
};

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export function useAdminBanners() {
  const router = useRouter();
  const [banners, setBanners] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recentAudit, setRecentAudit] = useState([]);
  const [auditAvailable, setAuditAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadBanners = useCallback(async () => {
    setLoadError("");

    try {
      const response = await fetch("/api/admin/banners", { cache: "no-store" });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        if ([401, 403].includes(response.status)) {
          router.replace("/dashboard/cliente");
          return;
        }

        throw new Error(data?.message || "Não foi possível carregar os banners.");
      }

      setBanners(data.data || []);
      setSummary(data.summary || null);
      setRecentAudit(data.recentAudit || []);
      setAuditAvailable(data.auditAvailable !== false);
    } catch (error) {
      console.error("[Admin/Banners] Falha ao carregar:", error);
      setLoadError(error.message || "Não foi possível carregar os banners.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return banners.filter((banner) => {
      if (positionFilter !== "all" && banner.position !== positionFilter) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        banner.publication_status !== statusFilter
      ) {
        return false;
      }

      if (!term) return true;

      return [banner.name, banner.link_url, banner.alt_text]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(term));
    });
  }, [banners, positionFilter, search, statusFilter]);

  const openCreate = useCallback(() => {
    setModal({
      type: "create",
      form: { ...EMPTY_FORM },
      originalStoragePath: null,
    });
  }, []);

  const openEdit = useCallback((banner) => {
    setModal({
      type: "edit",
      id: banner.id,
      item: banner,
      originalStoragePath: banner.storage_path || null,
      form: {
        name: banner.name || "",
        image_url: banner.image_url || "",
        storage_path: banner.storage_path || "",
        link_url: banner.link_url || "",
        alt_text: banner.alt_text || banner.name || "",
        position: banner.position || "left",
        display_mode: "keep",
        target_banner_id: "",
        is_active: banner.is_active !== false,
        starts_at: toDateTimeLocal(banner.starts_at),
        ends_at: toDateTimeLocal(banner.ends_at),
      },
    });
  }, []);

  const openDelete = useCallback((banner) => {
    setModal({ type: "delete", item: banner, reason: "" });
  }, []);

  const updateModalForm = useCallback((field, value) => {
    setModal((current) => {
      if (!current?.form) return current;

      const form = { ...current.form, [field]: value };
      if (field === "position") {
        form.target_banner_id = "";
        if (current.type === "edit") form.display_mode = "new";
      }
      if (field === "image_url" && value !== current.form.image_url) {
        form.storage_path = "";
      }

      return { ...current, form };
    });
  }, []);

  const cleanupUnusedUpload = useCallback(async (storagePath) => {
    if (!storagePath) return;

    try {
      await fetch("/api/admin/banners/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });
    } catch (error) {
      console.warn("[Admin/Banners] Upload órfão não removido:", error);
    }
  }, []);

  const closeModal = useCallback(async () => {
    const current = modal;
    setModal(null);

    if (
      current?.form?.storage_path &&
      current.form.storage_path !== current.originalStoragePath
    ) {
      await cleanupUnusedUpload(current.form.storage_path);
    }
  }, [cleanupUnusedUpload, modal]);

  const uploadImage = useCallback(
    async (file) => {
      if (!file || !modal?.form) return;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/admin/banners/upload", {
          method: "POST",
          body: formData,
        });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível enviar a imagem.");
        }

        const previousUnsavedPath =
          modal.form.storage_path &&
          modal.form.storage_path !== modal.originalStoragePath
            ? modal.form.storage_path
            : null;

        setModal((current) => ({
          ...current,
          form: {
            ...current.form,
            image_url: data.data?.publicUrl || data.publicUrl,
            storage_path: data.data?.storagePath || data.storagePath,
          },
        }));

        if (previousUnsavedPath) {
          await cleanupUnusedUpload(previousUnsavedPath);
        }

        toast.success("Imagem enviada com segurança.");
      } catch (error) {
        toast.error(error.message || "Não foi possível enviar a imagem.");
      } finally {
        setUploading(false);
      }
    },
    [cleanupUnusedUpload, modal],
  );

  const saveBanner = useCallback(async () => {
    if (!modal?.form) return;

    setSaving(true);
    try {
      const method = modal.type === "create" ? "POST" : "PUT";
      const endpoint =
        modal.type === "create"
          ? "/api/admin/banners"
          : `/api/admin/banners?id=${modal.id}`;
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modal.form),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível salvar o banner.");
      }

      toast.success(data.message || "Banner salvo.");
      setModal(null);
      await loadBanners();
    } catch (error) {
      toast.error(error.message || "Não foi possível salvar o banner.");
    } finally {
      setSaving(false);
    }
  }, [loadBanners, modal]);

  const toggleBanner = useCallback(
    async (banner) => {
      setBusyId(banner.id);
      try {
        const response = await fetch(`/api/admin/banners?id=${banner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: !banner.is_active }),
        });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Não foi possível alterar a publicação.",
          );
        }

        toast.success(data.message || "Publicação alterada.");
        await loadBanners();
      } catch (error) {
        toast.error(error.message || "Não foi possível alterar a publicação.");
      } finally {
        setBusyId(null);
      }
    },
    [loadBanners],
  );

  const deleteBanner = useCallback(async () => {
    if (modal?.type !== "delete") return;

    const reason = String(modal.reason || "").trim();
    if (reason.length < 10) {
      toast.error("Informe uma justificativa com pelo menos 10 caracteres.");
      return;
    }

    const banner = modal.item;
    setBusyId(banner.id);

    try {
      const response = await fetch(`/api/admin/banners?id=${banner.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível excluir o banner.");
      }

      toast.success(data.message || "Banner excluído.");
      setModal(null);
      await loadBanners();
    } catch (error) {
      toast.error(error.message || "Não foi possível excluir o banner.");
    } finally {
      setBusyId(null);
    }
  }, [loadBanners, modal]);

  return {
    banners,
    filtered,
    summary,
    recentAudit,
    auditAvailable,
    loading,
    loadError,
    search,
    positionFilter,
    statusFilter,
    modal,
    saving,
    uploading,
    busyId,
    setSearch,
    setPositionFilter,
    setStatusFilter,
    setModal,
    openCreate,
    openEdit,
    openDelete,
    updateModalForm,
    closeModal,
    uploadImage,
    saveBanner,
    toggleBanner,
    deleteBanner,
    loadBanners,
  };
}
