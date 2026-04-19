"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, FileText, Search, Mail } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./CasosAdmin.module.css";

const TABS = [
  { id: "TUDO", label: "Cadastrados" },
  { id: "ABERTO", label: "Abertos" },
  { id: "PENDENTE", label: "Interesse Pendente" },
  { id: "REJEITADO", label: "Interesse Rejeitado" },
  { id: "NEGOCIANDO", label: "Em Negociação" },
  { id: "CANCELADO", label: "Cancelados" },
  { id: "CONTRATADO", label: "Advogado Contratado" },
];

export default function AdminCasosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [casos, setCasos] = useState([]);
  const [activeTab, setActiveTab] = useState("TUDO");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [isNotifying, setIsNotifying] = useState({});
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
    let list = casos;

    if (activeTab === "CANCELADO") {
      list = list.filter((c) => ["CANCELADO", "FECHADO"].includes(c.status));
    } else if (activeTab === "CONTRATADO") {
      list = list.filter((c) => c.status === "CONTRATADO" || (c.interests || []).some((i) => i.status === "HIRED"));
    } else if (activeTab === "NEGOCIANDO") {
      list = list.filter((c) => c.status === "NEGOCIANDO" || (c.interests || []).some((i) => i.status === "NEGOTIATING"));
    } else if (activeTab === "PENDENTE") {
      list = list.filter((c) => c.status === "ABERTO" && (c.interests || []).some((i) => i.status === "PENDING"));
    } else if (activeTab === "REJEITADO") {
      list = list.filter((c) => 
        c.status === "ABERTO" && 
        !(c.interests || []).some((i) => i.status === "PENDING") && 
        (c.interests || []).some((i) => ["DECLINED", "LOST_VACANCY", "CANCELED"].includes(i.status))
      );
    } else if (activeTab === "ABERTO") {
      list = list.filter((c) => 
        c.status === "ABERTO" && 
        !(c.interests || []).some((i) => i.status === "PENDING") &&
        !(c.interests || []).some((i) => ["DECLINED", "LOST_VACANCY", "CANCELED"].includes(i.status))
      );
    }

    const term = search.trim().toLowerCase();
    if (!term) return list;

    return list.filter((c) => {
      const titulo = String(c.titulo || "").toLowerCase();
      const area = String(c.area || "").toLowerCase();
      const clienteName = String(c.cliente_name || "").toLowerCase();
      const clienteEmail = String(c.cliente_email || "").toLowerCase();
      const advogadoName = String(c.advogado_name || "").toLowerCase();
      const advogadoEmail = String(c.advogado_email || "").toLowerCase();
      return (
        titulo.includes(term) ||
        area.includes(term) ||
        clienteName.includes(term) ||
        clienteEmail.includes(term) ||
        advogadoName.includes(term) ||
        advogadoEmail.includes(term)
      );
    });
  }, [casos, search, activeTab]);

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

  const handleNotifyClient = async (caso) => {
    setIsNotifying((prev) => ({ ...prev, [caso.id]: true }));
    try {
      const res = await fetch("/api/admin/casos/notify-client-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ casoId: caso.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Erro ao notificar cliente.");
      } else {
        toast.success("Email enviado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao notificar cliente:", error);
      toast.error("Erro interno ao enviar notificação.");
    } finally {
      setIsNotifying((prev) => ({ ...prev, [caso.id]: false }));
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

      <div className={styles.tabsContainer}>
        {TABS.map((tab) => {
          let count = 0;
          if (tab.id === "TUDO") count = casos.length;
          else if (tab.id === "CANCELADO") count = casos.filter((c) => ["CANCELADO", "FECHADO"].includes(c.status)).length;
          else if (tab.id === "CONTRATADO") count = casos.filter((c) => c.status === "CONTRATADO" || (c.interests || []).some((i) => i.status === "HIRED")).length;
          else if (tab.id === "NEGOCIANDO") count = casos.filter((c) => c.status === "NEGOCIANDO" || (c.interests || []).some((i) => i.status === "NEGOTIATING")).length;
          else if (tab.id === "PENDENTE") count = casos.filter((c) => c.status === "ABERTO" && (c.interests || []).some((i) => i.status === "PENDING")).length;
          else if (tab.id === "REJEITADO") count = casos.filter((c) => c.status === "ABERTO" && !(c.interests || []).some((i) => i.status === "PENDING") && (c.interests || []).some((i) => ["DECLINED", "LOST_VACANCY", "CANCELED"].includes(i.status))).length;
          else if (tab.id === "ABERTO") count = casos.filter((c) => c.status === "ABERTO" && !(c.interests || []).some((i) => i.status === "PENDING") && !(c.interests || []).some((i) => ["DECLINED", "LOST_VACANCY", "CANCELED"].includes(i.status))).length;

          return (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.activeTab : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} <span className={styles.tabBadge}>{count}</span>
            </button>
          );
        })}
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
                <th>Advogado</th>
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
                    <div className={styles.clientCell}>
                      {(() => {
                        const interests = caso.interests || [];
                        if (interests.length === 0) {
                          return <span style={{ color: 'var(--color-silver-dark)', fontSize: '0.8rem' }}>Sem interações</span>;
                        }

                        const inReview = interests.filter(i => i.status === 'PENDING');
                        const negotiating = interests.filter(i => i.status === 'NEGOTIATING');
                        const hired = interests.filter(i => i.status === 'HIRED');
                        const rejected = interests.filter(i => ['DECLINED', 'LOST_VACANCY', 'CANCELED'].includes(i.status));

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', minWidth: '200px' }}>
                            {hired.length > 0 && (
                              <div>
                                <strong style={{ color: '#10b981', display: 'block', marginBottom: '2px' }}>Contratado:</strong>
                                {hired.map(h => (
                                  <div key={h.id}>✓ {h.lawyer_name}</div>
                                ))}
                              </div>
                            )}
                            
                            {negotiating.length > 0 && (
                              <div>
                                <strong style={{ color: '#3b82f6', display: 'block', marginBottom: '2px' }}>Negociando:</strong>
                                {negotiating.map(n => (
                                  <div key={n.id}>💬 {n.lawyer_name}</div>
                                ))}
                              </div>
                            )}

                            {inReview.length > 0 && caso.status !== 'CONTRATADO' && (
                              <div>
                                <strong style={{ color: 'var(--color-gold)', display: 'block', marginBottom: '2px' }}>Interessados:</strong>
                                {inReview.map(r => (
                                  <div key={r.id}>✋ {r.lawyer_name}</div>
                                ))}
                              </div>
                            )}

                            {rejected.length > 0 && caso.status === 'CONTRATADO' && (
                              <div style={{ opacity: 0.6 }}>
                                <strong style={{ color: '#ef4444', display: 'block', marginBottom: '2px' }}>Dispensados:</strong>
                                {rejected.map(r => (
                                  <div key={r.id}>✖ {r.lawyer_name}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </td>
                  <td>
                    {caso.created_at
                      ? new Date(caso.created_at).toLocaleDateString("pt-BR")
                      : "-"}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={styles.deleteBtn}
                        onClick={() => setCasoToDelete(caso)}
                        disabled={deletingId === caso.id}
                        title="Excluir Caso"
                      >
                        <Trash2 size={14} />
                      </button>

                      {(caso.interests || []).some((i) => i.status === "PENDING") && (
                        <button
                          type="button"
                          className={styles.notifyBtn}
                          onClick={() => handleNotifyClient(caso)}
                          disabled={isNotifying[caso.id]}
                          title="Avisar cliente por email"
                        >
                          <Mail size={14} />
                          {isNotifying[caso.id] ? "..." : "Avisar"}
                        </button>
                      )}
                    </div>
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
