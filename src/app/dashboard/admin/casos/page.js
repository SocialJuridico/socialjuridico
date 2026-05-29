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
  { id: "FUNNEL", label: "Funil de E-mails" },
];

function getCaseTab(c) {
  if (["CANCELADO", "FECHADO"].includes(c.status)) return "CANCELADO";
  if (c.status === "CONTRATADO" || (c.interests || []).some((i) => i.status === "HIRED")) return "CONTRATADO";
  if (c.status === "NEGOCIANDO" || (c.interests || []).some((i) => i.status === "NEGOTIATING")) return "NEGOCIANDO";
  if ((c.interests || []).some((i) => i.status === "PENDING")) return "PENDENTE";
  if ((c.interests || []).some((i) => ["DECLINED", "LOST_VACANCY", "CANCELED"].includes(i.status))) return "REJEITADO";
  return "ABERTO"; // Fallback catch-all ensure it never vanishes
}

export default function AdminCasosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [casos, setCasos] = useState([]);
  const [activeTab, setActiveTab] = useState("TUDO");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [isNotifying, setIsNotifying] = useState({});
  const [casoToDelete, setCasoToDelete] = useState(null);

  // States para o Funil de Conversão
  const [funnelData, setFunnelData] = useState([]);
  const [loadingFunnel, setLoadingFunnel] = useState(false);

  useEffect(() => {
    // Definir tab inicial se fornecida via URL query param (?tab=FUNNEL)
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }

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

    const loadFunnel = async () => {
      setLoadingFunnel(true);
      try {
        const res = await fetch("/api/admin/funnel", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && data.success) {
          setFunnelData(data.data || []);
        }
      } catch (err) {
        console.error("Erro ao carregar funil:", err);
      } finally {
        setLoadingFunnel(false);
      }
    };

    load();
    loadFunnel();
  }, [router]);

  const filteredCasos = useMemo(() => {
    let list = casos;

    if (activeTab !== "TUDO") {
      list = list.filter((c) => getCaseTab(c) === activeTab);
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

  const formatFunnelStep = (label, timestamp) => {
    const isCompleted = !!timestamp;
    return (
      <div key={label} style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        opacity: isCompleted ? 1 : 0.45,
        minWidth: '72px',
        padding: '6px 4px',
        borderRadius: '8px',
        backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
        border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
      }}>
        <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: isCompleted ? '#10b981' : '#a1a1aa', fontWeight: 'bold' }}>{label}</span>
        <span style={{ fontSize: '1rem', marginTop: '4px' }}>{isCompleted ? '✓' : '—'}</span>
        {timestamp && (
          <small style={{ fontSize: '0.55rem', color: 'rgba(255, 255, 255, 0.5)', marginTop: '2px', whiteSpace: 'nowrap' }}>
            {new Date(timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
          </small>
        )}
      </div>
    );
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
          else if (tab.id === "FUNNEL") count = funnelData.length;
          else count = casos.filter((c) => getCaseTab(c) === tab.id).length;

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
        {activeTab === "FUNNEL" ? (
          loadingFunnel ? (
            <p className={styles.empty}>Carregando dados do funil...</p>
          ) : funnelData.length === 0 ? (
            <p className={styles.empty}>Nenhum registro de e-mail enviado no funil.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Caso</th>
                  <th>Cliente</th>
                  <th>Marcos (Interessados)</th>
                  <th>Data de Envio</th>
                  <th>Funil de Conversão (Status)</th>
                </tr>
              </thead>
              <tbody>
                {funnelData.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '600' }}>{item.caso_titulo}</td>
                    <td>
                      <div className={styles.clientCell}>
                        <span>{item.cliente_name}</span>
                        <small>{item.cliente_email}</small>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        color: 'var(--color-gold)',
                        border: '1px solid rgba(212, 175, 55, 0.25)'
                      }}>
                        ⚖️ {item.interested_count} {item.interested_count === 1 ? 'interessado' : 'interessados'}
                      </span>
                    </td>
                    <td>
                      {item.sent_at
                        ? new Date(item.sent_at).toLocaleString("pt-BR", { dateStyle: 'short', timeStyle: 'short' })
                        : "-"}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', padding: '6px 0' }}>
                        {formatFunnelStep("Disparado", item.sent_at)}
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 'bold' }}>→</span>
                        {formatFunnelStep("Aberto", item.opened_at)}
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 'bold' }}>→</span>
                        {formatFunnelStep("Clicado", item.clicked_at)}
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 'bold' }}>→</span>
                        {formatFunnelStep("Logou", item.logged_in_at)}
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 'bold' }}>→</span>
                        {formatFunnelStep("Visualizou", item.viewed_interests_at)}
                        <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 'bold' }}>→</span>
                        {formatFunnelStep("Respondeu", item.responded_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : filteredCasos.length === 0 ? (
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
