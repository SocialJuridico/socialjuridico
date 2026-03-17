"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, FileText, Search } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./CasosAdmin.module.css";

export default function AdminCasosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [casos, setCasos] = useState([]);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [casoToDelete, setCasoToDelete] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/casos", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Falha ao carregar casos");
          if (res.status === 401 || res.status === 403) {
            router.replace("/dashboard/cliente");
          }
          return;
        }

        setCasos(data.data || []);
      } catch (error) {
        console.error("Erro ao carregar casos:", error);
        toast.error("Erro ao carregar casos.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const filteredCasos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return casos;

    return casos.filter((c) => {
      const titulo = String(c.titulo || "").toLowerCase();
      const area = String(c.area || "").toLowerCase();
      const clienteName = String(c.cliente_name || "").toLowerCase();
      const clienteEmail = String(c.cliente_email || "").toLowerCase();
      return (
        titulo.includes(term) ||
        area.includes(term) ||
        clienteName.includes(term) ||
        clienteEmail.includes(term)
      );
    });
  }, [casos, search]);

  const confirmDelete = async (caso) => {
    setDeletingId(caso.id);
    try {
      const res = await fetch(`/api/admin/casos?id=${caso.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir caso.");
        return;
      }

      toast.success("Caso excluído com sucesso.");
      setCasos((prev) => prev.filter((c) => c.id !== caso.id));
    } catch (error) {
      console.error("Erro ao excluir caso:", error);
      toast.error("Erro ao excluir caso.");
    } finally {
      setDeletingId(null);
      setCasoToDelete(null);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando casos...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1>
          <FileText size={18} /> Casos cadastrados
        </h1>
      </header>

      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Buscar por título, área, nome ou email do cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.tableWrap}>
        {filteredCasos.length === 0 ? (
          <p className={styles.empty}>Nenhum caso encontrado.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Título</th>
                <th>Área</th>
                <th>Status</th>
                <th>Cliente</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCasos.map((caso) => (
                <tr key={caso.id}>
                  <td>{caso.titulo || "-"}</td>
                  <td>{caso.area || "-"}</td>
                  <td>{caso.status || "-"}</td>
                  <td>
                    <div className={styles.clientCell}>
                      <span>{caso.cliente_name || "-"}</span>
                      <small>{caso.cliente_email || "-"}</small>
                    </div>
                  </td>
                  <td>
                    {caso.created_at
                      ? new Date(caso.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => setCasoToDelete(caso)}
                      disabled={deletingId === caso.id}
                    >
                      <Trash2 size={14} />
                      {deletingId === caso.id ? "Excluindo..." : "Excluir"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {casoToDelete && (
        <div
          className={styles.modalOverlay}
          onClick={() => setCasoToDelete(null)}
        >
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Excluir caso</h3>
            <p>
              Confirma a exclusão do caso{" "}
              <strong>{casoToDelete.titulo || "sem título"}</strong>? Esta ação
              é irreversível.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setCasoToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => confirmDelete(casoToDelete)}
                disabled={deletingId === casoToDelete.id}
              >
                {deletingId === casoToDelete.id
                  ? "Excluindo..."
                  : "Confirmar exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
