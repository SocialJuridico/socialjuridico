"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Scale, RotateCcw, Search } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./AdvogadosAdmin.module.css";

export default function AdminAdvogadosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [advogados, setAdvogados] = useState([]);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [modalAction, setModalAction] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/advogados", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Acesso negado");
          router.replace("/dashboard/cliente");
          return;
        }

        setAdvogados(data.data || []);
      } catch (error) {
        console.error("Erro ao carregar advogados:", error);
        toast.error("Erro ao carregar advogados.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const filteredAdvogados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return advogados;
    return advogados.filter((a) => {
      const name = String(a.name || "").toLowerCase();
      const email = String(a.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [advogados, search]);

  const confirmDelete = async (advogado) => {
    setDeletingId(advogado.id);
    try {
      const res = await fetch(`/api/admin/advogados?id=${advogado.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir advogado.");
        return;
      }

      toast.success("Advogado excluído com sucesso.");
      setAdvogados((prev) => prev.filter((a) => a.id !== advogado.id));
    } catch (error) {
      console.error("Erro ao excluir advogado:", error);
      toast.error("Erro ao excluir advogado.");
    } finally {
      setDeletingId(null);
      setModalAction(null);
    }
  };

  const confirmReset = async (advogado) => {
    setResettingId(advogado.id);
    try {
      const res = await fetch(`/api/admin/advogados?id=${advogado.id}`, {
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
    return <div className={styles.loading}>Carregando advogados...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1>
          <Scale size={18} /> Advogados cadastrados
        </h1>
      </header>

      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.tableWrap}>
        {filteredAdvogados.length === 0 ? (
          <p className={styles.empty}>Nenhum advogado encontrado.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>OAB</th>
                <th>Plano</th>
                <th>Cadastro</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdvogados.map((advogado) => (
                <tr key={advogado.id}>
                  <td>{advogado.name || "-"}</td>
                  <td>{advogado.email || "-"}</td>
                  <td>{advogado.phone || "-"}</td>
                  <td>{advogado.oab || "-"}</td>
                  <td>{advogado.is_premium ? "PRO" : "FREE"}</td>
                  <td>
                    {advogado.created_at
                      ? new Date(advogado.created_at).toLocaleDateString(
                          "pt-BR",
                        )
                      : "-"}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() =>
                          setModalAction({ type: "reset", item: advogado })
                        }
                        disabled={resettingId === advogado.id}
                      >
                        <RotateCcw size={14} />
                        {resettingId === advogado.id ? "Resetando..." : "Reset"}
                      </button>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() =>
                          setModalAction({ type: "delete", item: advogado })
                        }
                        disabled={deletingId === advogado.id}
                      >
                        <Trash2 size={14} />
                        {deletingId === advogado.id
                          ? "Excluindo..."
                          : "Excluir"}
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
                ? "Excluir advogado"
                : "Resetar senha"}
            </h3>
            <p>
              {modalAction.type === "delete" ? (
                <>
                  Confirma a exclusão de{" "}
                  <strong>{modalAction.item.name || "advogado"}</strong>? Esta
                  ação é irreversível.
                </>
              ) : (
                <>
                  Confirma resetar a senha de{" "}
                  <strong>{modalAction.item.name || "advogado"}</strong> para
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
