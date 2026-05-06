"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Users, RotateCcw, Search } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./ClientesAdmin.module.css";

export default function AdminClientesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [search, setSearch] = useState("");
  const [inactivityFilter, setInactivityFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [modalAction, setModalAction] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/clientes", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Acesso negado");
          router.replace("/dashboard/cliente");
          return;
        }

        setClientes(data.data || []);
      } catch (error) {
        console.error("Erro ao carregar clientes:", error);
        toast.error("Erro ao carregar clientes.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const filteredClientes = useMemo(() => {
    let result = clientes;

    if (inactivityFilter !== "ALL") {
      const now = new Date();
      result = result.filter((c) => {
        const lastLogin = new Date(c.last_sign_in_at || c.created_at);
        const diffDays = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));

        if (inactivityFilter === "7DAYS") return diffDays >= 7;
        if (inactivityFilter === "15DAYS") return diffDays >= 15;
        if (inactivityFilter === "30DAYS") return diffDays >= 30;

        return true;
      });
    }

    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((c) => {
        const name = String(c.name || "").toLowerCase();
        const email = String(c.email || "").toLowerCase();
        return name.includes(term) || email.includes(term);
      });
    }

    return result;
  }, [clientes, search, inactivityFilter]);

  const confirmDelete = async (cliente) => {
    setDeletingId(cliente.id);
    try {
      const res = await fetch(`/api/admin/clientes?id=${cliente.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir cliente.");
        return;
      }

      toast.success("Cliente excluído com sucesso.");
      setClientes((prev) => prev.filter((c) => c.id !== cliente.id));
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast.error("Erro ao excluir cliente.");
    } finally {
      setDeletingId(null);
      setModalAction(null);
    }
  };

  const confirmReset = async (cliente) => {
    setResettingId(cliente.id);
    try {
      const res = await fetch(`/api/admin/clientes?id=${cliente.id}`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao resetar senha.");
        return;
      }

      toast.success("Senha resetada para: socialjuridico1!");
    } catch (error) {
      console.error("Erro ao resetar senha:", error);
      toast.error("Erro ao resetar senha.");
    } finally {
      setResettingId(null);
      setModalAction(null);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando clientes...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1>
          <Users size={18} /> Clientes cadastrados
        </h1>
      </header>

      <div className={styles.searchWrap} style={{ display: 'flex', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className={styles.searchInput}
          style={{ paddingLeft: '1rem', width: 'auto', flex: 'none', appearance: 'auto', background: '#1e293b' }}
          value={inactivityFilter}
          onChange={(e) => setInactivityFilter(e.target.value)}
        >
          <option value="ALL">Todos os clientes</option>
          <option value="7DAYS">Inativos há +7 dias</option>
          <option value="15DAYS">Inativos há +15 dias</option>
          <option value="30DAYS">Inativos há +30 dias</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        {filteredClientes.length === 0 ? (
          <p className={styles.empty}>Nenhum cliente encontrado.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Último Login</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>{cliente.name || "-"}</td>
                  <td>{cliente.email || "-"}</td>
                  <td>{cliente.phone || "-"}</td>
                  <td>
                    {cliente.last_sign_in_at
                      ? new Date(cliente.last_sign_in_at).toLocaleString("pt-BR")
                      : cliente.created_at
                        ? new Date(cliente.created_at).toLocaleString("pt-BR")
                        : "-"}
                  </td>
                  <td>
                    {cliente.created_at
                      ? new Date(cliente.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() =>
                          setModalAction({ type: "reset", item: cliente })
                        }
                        disabled={resettingId === cliente.id}
                      >
                        <RotateCcw size={14} />
                        {resettingId === cliente.id ? "Resetando..." : "Reset"}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() =>
                          setModalAction({ type: "delete", item: cliente })
                        }
                        disabled={deletingId === cliente.id}
                      >
                        <Trash2 size={14} />
                        {deletingId === cliente.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalAction && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalAction(null)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>
              {modalAction.type === "delete"
                ? "Excluir cliente"
                : "Resetar senha"}
            </h3>
            <p>
              {modalAction.type === "delete" ? (
                <>
                  Confirma a exclusão de{" "}
                  <strong>{modalAction.item.name || "cliente"}</strong>? Esta
                  ação é irreversível.
                </>
              ) : (
                <>
                  Confirma resetar a senha de{" "}
                  <strong>{modalAction.item.name || "cliente"}</strong> para
                  <strong> socialjuridico1!</strong>?
                </>
              )}
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModalAction(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() =>
                  modalAction.type === "delete"
                    ? confirmDelete(modalAction.item)
                    : confirmReset(modalAction.item)
                }
                disabled={
                  deletingId === modalAction.item.id ||
                  resettingId === modalAction.item.id
                }
              >
                {modalAction.type === "delete"
                  ? deletingId === modalAction.item.id
                    ? "Excluindo..."
                    : "Confirmar exclusão"
                  : resettingId === modalAction.item.id
                    ? "Resetando..."
                    : "Confirmar reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
