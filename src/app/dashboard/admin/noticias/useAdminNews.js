"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

async function readJson(response) {
  return response.json().catch(() => null);
}

export function useAdminNews() {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadArticles = useCallback(async () => {
    setLoadError("");
    try {
      const response = await fetch("/api/admin/news?pageSize=100", {
        cache: "no-store",
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        if ([401, 403].includes(response.status)) {
          router.replace("/dashboard/cliente");
          return;
        }
        throw new Error(data?.message || "Não foi possível carregar as matérias.");
      }

      setArticles(data.items || data.articles || []);
    } catch (error) {
      console.error("[Admin/Noticias] Falha ao carregar:", error);
      setLoadError(error.message || "Não foi possível carregar as matérias.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadArticles();
  }, [loadArticles]);

  const openImageModal = useCallback((article) => {
    setModal({
      article,
      cover_image_url: article.cover_image_url || "",
      cover_image_alt: article.cover_image_alt || article.title || "",
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
  }, []);

  const updateModalField = useCallback((field, value) => {
    setModal((current) => (current ? { ...current, [field]: value } : current));
  }, []);

  const uploadImage = useCallback(async (file) => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/news/upload", {
        method: "POST",
        body: formData,
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível enviar a imagem.");
      }

      setModal((current) =>
        current
          ? { ...current, cover_image_url: data.publicUrl || data.data?.publicUrl }
          : current,
      );
      toast.success("Imagem enviada. Clique em salvar para aplicar.");
    } catch (error) {
      toast.error(error.message || "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
    }
  }, []);

  const saveImage = useCallback(async () => {
    if (!modal?.article) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/news/${modal.article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cover_image_url: modal.cover_image_url || null,
          cover_image_alt: modal.cover_image_alt || null,
        }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível salvar a imagem.");
      }

      toast.success("Imagem da matéria atualizada.");
      setModal(null);
      await loadArticles();
    } catch (error) {
      toast.error(error.message || "Não foi possível salvar a imagem.");
    } finally {
      setSaving(false);
    }
  }, [loadArticles, modal]);

  const removeImage = useCallback(() => {
    setModal((current) => (current ? { ...current, cover_image_url: "" } : current));
  }, []);

  return {
    articles,
    loading,
    loadError,
    search,
    modal,
    uploading,
    saving,
    setSearch,
    openImageModal,
    closeModal,
    updateModalField,
    uploadImage,
    saveImage,
    removeImage,
    loadArticles,
  };
}