"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const DEFAULT_CONFIG = {
  id: null,
  image_url: "",
  storage_path: "",
  link_url: "",
  alt_text: "",
  is_active: false,
  starts_at: "",
  ends_at: "",
  publication_status: "missing",
  created_at: null,
  updated_at: null,
};

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toIsoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeConfig(value) {
  if (!value) return { ...DEFAULT_CONFIG };

  return {
    ...DEFAULT_CONFIG,
    ...value,
    image_url: value.image_url || "",
    storage_path: value.storage_path || "",
    link_url: value.link_url || "",
    alt_text: value.alt_text || "",
    is_active: value.is_active === true,
    starts_at: toDateTimeLocal(value.starts_at),
    ends_at: toDateTimeLocal(value.ends_at),
  };
}

function comparable(config) {
  return JSON.stringify({
    image_url: String(config?.image_url || "").trim(),
    storage_path: String(config?.storage_path || "").trim(),
    link_url: String(config?.link_url || "").trim(),
    alt_text: String(config?.alt_text || "").trim(),
    is_active: config?.is_active === true,
    starts_at: config?.starts_at || "",
    ends_at: config?.ends_at || "",
  });
}

async function readJson(response) {
  return response.json().catch(() => null);
}

export function useAdvogadoMesAdmin() {
  const router = useRouter();
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG });
  const [original, setOriginal] = useState({ ...DEFAULT_CONFIG });
  const [recentAudit, setRecentAudit] = useState([]);
  const [auditAvailable, setAuditAvailable] = useState(true);
  const [governance, setGovernance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadConfig = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/admin/advogado-mes", {
          cache: "no-store",
        });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          if ([401, 403].includes(response.status)) {
            router.replace("/dashboard/cliente");
            return;
          }

          throw new Error(
            data?.message || "Não foi possível carregar o Advogado do Mês.",
          );
        }

        const next = normalizeConfig(data.data);
        setConfig(next);
        setOriginal(next);
        setRecentAudit(data.recentAudit || []);
        setAuditAvailable(data.auditAvailable !== false);
        setGovernance(data.governance || null);
      } catch (error) {
        console.error("[Admin/AdvogadoMes] Falha ao carregar:", error);
        setLoadError(
          error.message || "Não foi possível carregar o Advogado do Mês.",
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const dirty = useMemo(
    () => comparable(config) !== comparable(original),
    [config, original],
  );

  useEffect(() => {
    if (!dirty) return undefined;

    const warnBeforeLeave = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [dirty]);

  const cleanupUnusedUpload = useCallback(async (storagePath) => {
    if (!storagePath?.startsWith("banners/advogado-mes/")) return;

    try {
      await fetch("/api/admin/advogado-mes/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storagePath }),
      });
    } catch (error) {
      console.warn("[Admin/AdvogadoMes] Upload órfão não removido:", error);
    }
  }, []);

  const updateField = useCallback((field, value) => {
    setConfig((current) => ({ ...current, [field]: value }));
  }, []);

  const updateImageUrl = useCallback(
    (value) => {
      const unusedPath =
        config.storage_path && config.storage_path !== original.storage_path
          ? config.storage_path
          : null;

      setConfig((current) => ({
        ...current,
        image_url: value,
        storage_path: "",
      }));

      if (unusedPath) void cleanupUnusedUpload(unusedPath);
    },
    [cleanupUnusedUpload, config.storage_path, original.storage_path],
  );

  const uploadImage = useCallback(
    async (file) => {
      if (!file) return;

      if (!ALLOWED_TYPES.has(file.type)) {
        toast.error("Use uma imagem JPG, PNG, WebP ou GIF.");
        return;
      }

      if (!file.size || file.size > MAX_FILE_SIZE) {
        toast.error("A imagem deve ter no máximo 5 MB.");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/admin/advogado-mes/upload", {
          method: "POST",
          body: formData,
        });
        const data = await readJson(response);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível enviar a imagem.");
        }

        const previousUnsavedPath =
          config.storage_path && config.storage_path !== original.storage_path
            ? config.storage_path
            : null;
        const nextPath = data.data?.storagePath || "";

        setConfig((current) => ({
          ...current,
          image_url: data.data?.publicUrl || "",
          storage_path: nextPath,
          alt_text: current.alt_text || "Destaque Advogado do Mês",
        }));

        if (previousUnsavedPath && previousUnsavedPath !== nextPath) {
          await cleanupUnusedUpload(previousUnsavedPath);
        }

        toast.success("Imagem enviada e validada com segurança.");
      } catch (error) {
        toast.error(error.message || "Não foi possível enviar a imagem.");
      } finally {
        setUploading(false);
      }
    },
    [cleanupUnusedUpload, config.storage_path, original.storage_path],
  );

  const discardChanges = useCallback(async () => {
    const unusedPath =
      config.storage_path && config.storage_path !== original.storage_path
        ? config.storage_path
        : null;

    setConfig({ ...original });
    if (unusedPath) await cleanupUnusedUpload(unusedPath);
    toast.success("Alterações descartadas.");
  }, [cleanupUnusedUpload, config.storage_path, original]);

  const saveConfig = useCallback(async () => {
    if (!auditAvailable) {
      toast.error("Execute a migração de governança antes de salvar alterações.");
      return;
    }

    if (!String(config.image_url || "").trim()) {
      toast.error("Informe ou envie uma imagem para o destaque.");
      return;
    }

    if (!String(config.alt_text || "").trim()) {
      toast.error("Informe o texto alternativo da imagem.");
      return;
    }

    const startsAt = toIsoOrNull(config.starts_at);
    const endsAt = toIsoOrNull(config.ends_at);
    if (startsAt === undefined || endsAt === undefined) {
      toast.error("Informe datas válidas para a agenda de publicação.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/advogado-mes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          starts_at: startsAt,
          ends_at: endsAt,
        }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível salvar a configuração.",
        );
      }

      const next = normalizeConfig(data.data);
      setConfig(next);
      setOriginal(next);
      toast.success(data.message || "Configuração salva.");
      await loadConfig({ silent: true });
    } catch (error) {
      toast.error(error.message || "Não foi possível salvar a configuração.");
    } finally {
      setSaving(false);
    }
  }, [auditAvailable, config, loadConfig]);

  const togglePublication = useCallback(async () => {
    if (!auditAvailable) {
      toast.error("Execute a migração de governança antes de alterar a publicação.");
      return;
    }

    if (!original.id) {
      toast.error("Salve a configuração antes de ativar o popup.");
      return;
    }

    setToggling(true);
    try {
      const response = await fetch("/api/admin/advogado-mes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_active: !original.is_active,
          updated_at: original.updated_at,
        }),
      });
      const data = await readJson(response);

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Não foi possível alterar a publicação.",
        );
      }

      const next = normalizeConfig(data.data);
      setConfig(next);
      setOriginal(next);
      toast.success(data.message || "Publicação alterada.");
      await loadConfig({ silent: true });
    } catch (error) {
      toast.error(error.message || "Não foi possível alterar a publicação.");
    } finally {
      setToggling(false);
    }
  }, [
    auditAvailable,
    loadConfig,
    original.id,
    original.is_active,
    original.updated_at,
  ]);

  return {
    config,
    original,
    recentAudit,
    auditAvailable,
    governance,
    loading,
    loadError,
    saving,
    uploading,
    toggling,
    dirty,
    operationBusy: saving || uploading || toggling,
    updateField,
    updateImageUrl,
    uploadImage,
    discardChanges,
    saveConfig,
    togglePublication,
    loadConfig,
  };
}
