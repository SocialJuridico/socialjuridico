"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, Plus, Pencil, Trash2, Search } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./AdminsAdmin.module.css";

const CREATE_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "socialjuridico1!",
};

const EDIT_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

export default function AdminAdminsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [modal, setModal] = useState(null);

  const loadAdmins = useCallback(async () => {
    const res = await fetch("/api/admin/admins", { cache: "no-store" });
    const data = await res.json();

    if (!res.ok || !data.success) {
      toast.error(data.message || "Falha ao carregar administradores");
      if (res.status === 401 || res.status === 403)
        router.replace("/dashboard/cliente");
      return;
    }

    setAdmins(data.data || []);
  }, [router]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadAdmins();
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar administradores");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [loadAdmins]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return admins;
    return admins.filter((a) => {
      const name = String(a.name || "").toLowerCase();
      const email = String(a.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [admins, search]);

  const openCreate = () => setModal({ type: "create", form: CREATE_FORM });
  const openEdit = (admin) =>
    setModal({
      type: "edit",
      id: admin.id,
      form: {
        ...EDIT_FORM,
        name: admin.name || "",
        email: admin.email || "",
        phone: admin.phone || "",
      },
    });

  const submitModal = async () => {
    if (!modal) return;
    const form = modal.form;
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Nome e email são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const method = modal.type === "create" ? "POST" : "PUT";
      const url =
        modal.type === "create"
          ? "/api/admin/admins"
          : `/api/admin/admins?id=${modal.id}`;

      const body = {
        name: form.name,
        email: form.email,
        phone: form.phone,
      };
      if (modal.type === "create")
        body.password = form.password || "socialjuridico1!";
      if (modal.type === "edit" && form.password?.trim())
        body.password = form.password.trim();

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao salvar administrador");
        return;
      }

      toast.success(
        modal.type === "create"
          ? "Administrador criado"
          : "Administrador atualizado",
      );
      setModal(null);
      await loadAdmins();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar administrador");
    } finally {
      setSaving(false);
    }
  };

  const deleteAdmin = async (admin) => {
    setDeletingId(admin.id);
    try {
      const res = await fetch(`/api/admin/admins?id=${admin.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir administrador");
        return;
      }
      toast.success("Administrador removido");
      setModal(null);
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir administrador");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading)
    return <div className={styles.loading}>Carregando administradores...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1>
          <Shield size={18} /> Administradores
        </h1>
      </header>

      <div className={styles.topBar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar administrador por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className={styles.addBtn} type="button" onClick={openCreate}>
          <Plus size={14} /> Novo admin
        </button>
      </div>

      <div className={styles.tableWrap}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>Nenhum administrador encontrado.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name || "-"}</td>
                  <td>{admin.email || "-"}</td>
                  <td>{admin.phone || "-"}</td>
                  <td>
                    {admin.created_at
                      ? new Date(admin.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => openEdit(admin)}
                      >
                        <Pencil size={14} /> Editar
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() =>
                          setModal({ type: "delete", item: admin })
                        }
                        disabled={deletingId === admin.id}
                      >
                        <Trash2 size={14} />
                        {deletingId === admin.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (modal.type === "create" || modal.type === "edit") && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {modal.type === "create"
                ? "Novo administrador"
                : "Editar administrador"}
            </h3>
            <div className={styles.formGroup}>
              <label>Nome</label>
              <input
                value={modal.form.name}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, name: e.target.value },
                  }))
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                value={modal.form.email}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, email: e.target.value },
                  }))
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input
                value={modal.form.phone}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, phone: e.target.value },
                  }))
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                {modal.type === "create"
                  ? "Senha inicial"
                  : "Nova senha (opcional)"}
              </label>
              <input
                value={modal.form.password}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, password: e.target.value },
                  }))
                }
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={submitModal}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && modal.type === "delete" && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Excluir administrador</h3>
            <p>
              Confirma excluir <strong>{modal.item.name || "admin"}</strong>?
              Esta ação é irreversível.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => deleteAdmin(modal.item)}
                disabled={deletingId === modal.item.id}
              >
                {deletingId === modal.item.id ? "Excluindo..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
