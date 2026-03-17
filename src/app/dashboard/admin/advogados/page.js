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
  const [updatingId, setUpdatingId] = useState(null);
  const [modalAction, setModalAction] = useState(null);
  const [jurisAmount, setJurisAmount] = useState(10);

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

  const confirmUpdate = async (advogado, action, value = null) => {
    setUpdatingId(advogado.id);
    try {
      const res = await fetch("/api/admin/advogados", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lawyerId: advogado.id,
          action,
          value,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao atualizar advogado.");
        return;
      }

      toast.success(data.message);
      
      // Atualizar lista local
      setAdvogados(prev => prev.map(a => {
        if (a.id === advogado.id) {
          if (action === "GIVE_PRO") {
            const exp = new Date();
            exp.setDate(exp.getDate() + 30);
            return { ...a, is_premium: true, premium_expires_at: exp.toISOString() };
          }
          if (action === "REMOVE_PRO") return { ...a, is_premium: false, premium_expires_at: null };
          if (action === "ADD_JURIS") return { ...a, balance: (a.balance || 0) + Number(value) };
        }
        return a;
      }));
    } catch (error) {
      console.error("Erro ao atualizar advogado:", error);
      toast.error("Erro ao atualizar advogado.");
    } finally {
      setUpdatingId(null);
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
                <th>Juris</th>
                <th>Plano</th>
                <th>Expira em</th>
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
                  <td>
                    <span className={styles.jurisBadge}>
                      {advogado.balance || 0}
                    </span>
                  </td>
                  <td>
                    <span className={advogado.is_premium ? styles.proBadge : styles.freeBadge}>
                      {advogado.is_premium ? "PRO" : "FREE"}
                    </span>
                  </td>
                  <td>
                    {advogado.is_premium && advogado.premium_expires_at
                      ? new Date(advogado.premium_expires_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    {advogado.created_at
                      ? new Date(advogado.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.manageBtn}
                        onClick={() =>
                          setModalAction({ type: "manage", item: advogado })
                        }
                        disabled={updatingId === advogado.id}
                      >
                        <RotateCcw size={14} style={{ display: 'none' }} />
                        Gerenciar
                      </button>
                      <button
                        type="button"
                        className={styles.resetBtn}
                        onClick={() =>
                          setModalAction({ type: "reset", item: advogado })
                        }
                        disabled={resettingId === advogado.id}
                      >
                        <RotateCcw size={14} />
                        Reset
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
                        Excluir
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
                : modalAction.type === "reset"
                ? "Resetar senha"
                : "Gerenciar Advogado"}
            </h3>
            
            <div className={styles.modalContent}>
              {modalAction.type === "manage" ? (
                <div className={styles.manageOptions}>
                  <p>Advogado: <strong>{modalAction.item.name}</strong></p>
                  
                  <div className={styles.manageSection}>
                    <h4>Plano PRO</h4>
                    <p className={styles.manageDesc}>Concede status PRO e validade por 30 dias.</p>
                    {modalAction.item.is_premium ? (
                      <button 
                        className={styles.removeProBtn}
                        onClick={() => confirmUpdate(modalAction.item, "REMOVE_PRO")}
                        disabled={updatingId === modalAction.item.id}
                      >
                        Remover PRO
                      </button>
                    ) : (
                      <button 
                        className={styles.giveProBtn}
                        onClick={() => confirmUpdate(modalAction.item, "GIVE_PRO")}
                        disabled={updatingId === modalAction.item.id}
                      >
                        Conceder 30 dias de PRO
                      </button>
                    )}
                  </div>

                  <div className={styles.manageSection}>
                    <h4>Saldo de Juris</h4>
                    <p className={styles.manageDesc}>Adicione uma quantia de Juris ao saldo atual ({modalAction.item.balance || 0}).</p>
                    <div className={styles.jurisInputRow}>
                      <input 
                        type="number" 
                        value={jurisAmount} 
                        onChange={(e) => setJurisAmount(e.target.value)}
                        className={styles.numberInput}
                      />
                      <button 
                        className={styles.addJurisBtn}
                        onClick={() => confirmUpdate(modalAction.item, "ADD_JURIS", jurisAmount)}
                        disabled={updatingId === modalAction.item.id}
                      >
                        Adicionar Juris
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
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
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModalAction(null)}
              >
                {modalAction.type === "manage" ? "Fechar" : "Cancelar"}
              </button>
              
              {modalAction.type !== "manage" && (
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
