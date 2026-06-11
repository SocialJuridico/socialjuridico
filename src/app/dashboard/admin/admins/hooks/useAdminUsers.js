"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
};

export function useAdminUsers() {
  const router = useRouter();
  const [admins, setAdmins] = useState([]);
  const [currentAdminId, setCurrentAdminId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busyId, setBusyId] = useState(null);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const response = await fetch("/api/admin/admins", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        toast.error(data?.message || "Acesso restrito à área administrativa.");
        router.replace("/dashboard/cliente");
        return;
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível carregar os administradores.");
      }

      setAdmins(data.data || []);
      setCurrentAdminId(data.currentAdminId || null);
    } catch (error) {
      console.error("[Admin/Administradores] Erro ao carregar:", error);
      setLoadError(error.message || "Erro ao carregar administradores.");
      toast.error(error.message || "Erro ao carregar administradores.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const filteredAdmins = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return admins;

    return admins.filter((admin) => {
      const searchable = `${admin.name || ""} ${admin.email || ""} ${admin.phone || ""}`.toLowerCase();
      return searchable.includes(term);
    });
  }, [admins, search]);

  const summary = useMemo(
    () => ({
      total: admins.length,
      visible: filteredAdmins.length,
      active: admins.filter((admin) => admin.last_sign_in_at).length,
      neverAccessed: admins.filter((admin) => !admin.last_sign_in_at).length,
    }),
    [admins, filteredAdmins.length],
  );

  const openCreate = useCallback(() => {
    setForm({ ...EMPTY_FORM });
    setModal({ type: "create" });
  }, []);

  const openEdit = useCallback((admin) => {
    setForm({
      name: admin.name || "",
      email: admin.email || "",
      phone: admin.phone || "",
    });
    setModal({ type: "edit", admin });
  }, []);

  const saveAdmin = useCallback(
    async (event) => {
      event.preventDefault();
      if (!modal) return;

      const name = form.name.trim();
      const email = form.email.trim().toLowerCase();

      if (!name || !email) {
        toast.error("Nome e e-mail são obrigatórios.");
        return;
      }

      const adminId = modal.admin?.id || "create";
      setBusyId(adminId);

      try {
        const isCreate = modal.type === "create";
        const response = await fetch(
          isCreate
            ? "/api/admin/admins"
            : `/api/admin/admins?id=${modal.admin.id}`,
          {
            method: isCreate ? "POST" : "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              email,
              phone: form.phone.trim(),
            }),
          },
        );
        const data = await response.json().catch(() => null);

        if (!response.ok || !data?.success) {
          throw new Error(data?.message || "Não foi possível salvar o administrador.");
        }

        if (isCreate) {
          setAdmins((current) => [data.data, ...current]);
        } else {
          setAdmins((current) =>
            current.map((admin) =>
              admin.id === data.data.id ? { ...admin, ...data.data } : admin,
            ),
          );
        }

        setModal(null);
        setForm({ ...EMPTY_FORM });
        toast.success(data.message || "Administrador salvo com sucesso.");
      } catch (error) {
        console.error("[Admin/Administradores] Erro ao salvar:", error);
        toast.error(error.message || "Erro ao salvar administrador.");
      } finally {
        setBusyId(null);
      }
    },
    [form, modal],
  );

  const sendPasswordReset = useCallback(async () => {
    const admin = modal?.admin;
    if (!admin) return;

    setBusyId(admin.id);

    try {
      const response = await fetch(`/api/admin/admins?id=${admin.id}`, {
        method: "PATCH",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível enviar o link.");
      }

      setModal(null);
      toast.success(data.message || "Link de redefinição enviado.");
    } catch (error) {
      console.error("[Admin/Administradores] Erro ao enviar redefinição:", error);
      toast.error(error.message || "Erro ao enviar redefinição.");
    } finally {
      setBusyId(null);
    }
  }, [modal]);

  const deleteAdmin = useCallback(async () => {
    const admin = modal?.admin;
    if (!admin) return;

    setBusyId(admin.id);

    try {
      const response = await fetch(`/api/admin/admins?id=${admin.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Não foi possível excluir o administrador.");
      }

      setAdmins((current) => current.filter((item) => item.id !== admin.id));
      setModal(null);
      toast.success(data.message || "Administrador removido.");
    } catch (error) {
      console.error("[Admin/Administradores] Erro ao excluir:", error);
      toast.error(error.message || "Erro ao excluir administrador.");
    } finally {
      setBusyId(null);
    }
  }, [modal]);

  return {
    admins,
    filteredAdmins,
    currentAdminId,
    loading,
    loadError,
    search,
    summary,
    modal,
    form,
    busyId,
    setSearch,
    setModal,
    setForm,
    loadAdmins,
    openCreate,
    openEdit,
    saveAdmin,
    sendPasswordReset,
    deleteAdmin,
  };
}
