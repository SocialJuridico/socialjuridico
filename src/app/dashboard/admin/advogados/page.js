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
  const [editOAB, setEditOAB] = useState("");
  const [editEstado, setEditEstado] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("PRO");
  const [selectedDuration, setSelectedDuration] = useState(30);

  const ESTADOS = [
    "AC",
    "AL",
    "AP",
    "AM",
    "BA",
    "CE",
    "DF",
    "ES",
    "GO",
    "MA",
    "MT",
    "MS",
    "MG",
    "PA",
    "PB",
    "PR",
    "PE",
    "PI",
    "RJ",
    "RN",
    "RS",
    "RO",
    "RR",
    "SC",
    "SP",
    "SE",
    "TO",
  ];

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
      setAdvogados((prev) =>
        prev.map((a) => {
          if (a.id === advogado.id) {
            if (action === "GIVE_PRO" || action === "GIVE_PLAN") {
              const days = Number(value?.days || 30);
              const planType = value?.planType || 'PRO';
              const exp = new Date();
              exp.setDate(exp.getDate() + days);
              return {
                ...a,
                is_premium: true,
                plan_type: planType,
                premium_expires_at: exp.toISOString(),
              };
            }
            if (action === "REMOVE_PRO")
              return { ...a, is_premium: false, plan_type: 'FREE', premium_expires_at: null };
            if (action === "ADD_JURIS")
              return { ...a, balance: (a.balance || 0) + Number(value) };
            if (action === "REMOVE_JURIS")
              return {
                ...a,
                balance: Math.max(0, (a.balance || 0) - Number(value)),
              };
            if (action === "SET_OAB_STATUS")
              return { ...a, oab_verification_status: value };
            if (action === "UPDATE_OAB")
              return { ...a, oab: value.oab, estado: value.estado };
          }
          return a;
        }),
      );
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
                <th>OAB Status</th>
                <th>Expira em</th>
                <th>Último Login</th>
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
                    <span
                      className={
                        advogado.is_premium ? styles.proBadge : styles.freeBadge
                      }
                    >
                      {advogado.plan_type || (advogado.is_premium ? "PRO" : "FREE")}
                    </span>
                  </td>
                  <td>
                    <span
                      className={
                        advogado.oab_verification_status === "VERIFIED"
                          ? styles.verifiedBadge
                          : advogado.oab_verification_status === "ERROR"
                            ? styles.errorBadge
                            : styles.pendingBadge
                      }
                    >
                      {advogado.oab_verification_status === "VERIFIED"
                        ? "Verificado"
                        : advogado.oab_verification_status === "ERROR"
                          ? "Erro"
                          : "Pendente"}
                    </span>
                  </td>
                  <td>
                    {advogado.is_premium && advogado.premium_expires_at
                      ? new Date(
                          advogado.premium_expires_at,
                        ).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    {advogado.last_sign_in_at
                      ? new Date(advogado.last_sign_in_at).toLocaleString("pt-BR")
                      : "-"}
                  </td>
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
                        className={styles.manageBtn}
                        onClick={() => {
                          setModalAction({ type: "manage", item: advogado });
                          setEditOAB(advogado.oab || "");
                          setEditEstado(advogado.estado || "");
                        }}
                        disabled={updatingId === advogado.id}
                      >
                        <RotateCcw size={14} style={{ display: "none" }} />
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
                  <p>
                    Advogado: <strong>{modalAction.item.name}</strong>
                  </p>

                  <div className={styles.manageSection}>
                    <h4>Gestão de Assinatura</h4>
                    <p className={styles.manageDesc}>
                      Conceda acesso START ou PRO por um período determinado.
                    </p>
                    
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <select 
                        className={styles.miniSelect}
                        value={selectedPlan}
                        onChange={(e) => setSelectedPlan(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="START">Plano START</option>
                        <option value="PRO">Plano PRO</option>
                      </select>

                      <select 
                        className={styles.miniSelect}
                        value={selectedDuration}
                        onChange={(e) => setSelectedDuration(Number(e.target.value))}
                        style={{ flex: 1 }}
                      >
                        <option value={7}>7 dias</option>
                        <option value={15}>15 dias</option>
                        <option value={30}>30 dias</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        className={styles.giveProBtn}
                        onClick={() =>
                          confirmUpdate(modalAction.item, "GIVE_PLAN", { planType: selectedPlan, days: selectedDuration })
                        }
                        disabled={updatingId === modalAction.item.id}
                        style={{ flex: 2 }}
                      >
                        Conceder {selectedDuration} dias de {selectedPlan}
                      </button>

                      {modalAction.item.is_premium && (
                        <button
                          className={styles.removeProBtn}
                          onClick={() =>
                            confirmUpdate(modalAction.item, "REMOVE_PRO")
                          }
                          disabled={updatingId === modalAction.item.id}
                          style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.manageSection}>
                    <h4>Saldo de Juris</h4>
                    <p className={styles.manageDesc}>
                      Adicione uma quantia de Juris ao saldo atual (
                      {modalAction.item.balance || 0}).
                    </p>
                    <div className={styles.jurisInputRow}>
                      <input
                        type="number"
                        value={jurisAmount}
                        onChange={(e) => setJurisAmount(e.target.value)}
                        className={styles.numberInput}
                      />
                      <button
                        className={styles.addJurisBtn}
                        onClick={() =>
                          confirmUpdate(
                            modalAction.item,
                            "ADD_JURIS",
                            jurisAmount,
                          )
                        }
                        disabled={updatingId === modalAction.item.id}
                      >
                        Adicionar
                      </button>
                      <button
                        className={styles.removeJurisBtn}
                        onClick={() =>
                          confirmUpdate(
                            modalAction.item,
                            "REMOVE_JURIS",
                            jurisAmount,
                          )
                        }
                        disabled={updatingId === modalAction.item.id}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          padding: "8px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        }}
                      >
                        Remover
                      </button>
                    </div>
                    <div className={styles.manageSection}>
                      <h4>Verificação de OAB</h4>
                      <p className={styles.manageDesc}>
                        Alterar o status de verificação da OAB do advogado.
                      </p>
                      <select
                        className={styles.statusSelect}
                        value={
                          modalAction.item.oab_verification_status || "PENDING"
                        }
                        onChange={(e) =>
                          confirmUpdate(
                            modalAction.item,
                            "SET_OAB_STATUS",
                            e.target.value,
                          )
                        }
                        disabled={updatingId === modalAction.item.id}
                      >
                        <option
                          value="PENDING"
                          style={{ background: "#171a21", color: "#e5e7eb" }}
                        >
                          🕒 Pendente
                        </option>
                        <option
                          value="VERIFIED"
                          style={{ background: "#171a21", color: "#e5e7eb" }}
                        >
                          ✅ Verificado
                        </option>
                        <option
                          value="ERROR"
                          style={{ background: "#171a21", color: "#e5e7eb" }}
                        >
                          ❌ Erro de Verificação
                        </option>
                      </select>
                    </div>

                    <div className={styles.manageSection}>
                      <h4>Dados Profissionais (OAB)</h4>
                      <p className={styles.manageDesc}>
                        Atualizar número da OAB e Estado de registro.
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          marginTop: "10px",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Nº OAB"
                          value={editOAB}
                          onChange={(e) => setEditOAB(e.target.value)}
                          className={styles.numberInput}
                          style={{ width: "120px" }}
                        />
                        <select
                          value={editEstado}
                          onChange={(e) => setEditEstado(e.target.value)}
                          className={styles.miniSelect}
                        >
                          <option value="">UF</option>
                          {ESTADOS.map((uf) => (
                            <option
                              key={uf}
                              value={uf}
                              style={{
                                background: "#171a21",
                                color: "#e5e7eb",
                              }}
                            >
                              {uf}
                            </option>
                          ))}
                        </select>
                        <button
                          className={styles.giveProBtn}
                          onClick={() =>
                            confirmUpdate(modalAction.item, "UPDATE_OAB", {
                              oab: editOAB,
                              estado: editEstado,
                            })
                          }
                          disabled={
                            updatingId === modalAction.item.id ||
                            !editOAB ||
                            !editEstado
                          }
                          style={{ margin: 0, flex: 1 }}
                        >
                          Salvar OAB
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p>
                  {modalAction.type === "delete" ? (
                    <>
                      Confirma a exclusão de{" "}
                      <strong>{modalAction.item.name || "advogado"}</strong>?
                      Esta ação é irreversível.
                    </>
                  ) : (
                    <>
                      Confirma resetar a senha de{" "}
                      <strong>{modalAction.item.name || "advogado"}</strong>{" "}
                      para
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
