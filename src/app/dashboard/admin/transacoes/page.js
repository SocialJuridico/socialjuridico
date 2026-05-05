"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CreditCard, 
  FileDown, 
  Search, 
  Filter, 
  Calendar,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  RotateCcw
} from "lucide-react";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import styles from "./TransacoesAdmin.module.css";

export default function AdminTransacoesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [transacoes, setTransacoes] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/transacoes", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Falha ao carregar transações");
          router.replace("/dashboard/admin");
          return;
        }

        setTransacoes(data.data || []);
      } catch (error) {
        console.error("Erro ao carregar transações:", error);
        toast.error("Erro ao carregar transações.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const filteredTransacoes = useMemo(() => {
    let result = transacoes;
    
    // Filtro de Busca
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(t => 
        t.advogado?.name?.toLowerCase().includes(term) ||
        t.advogado?.email?.toLowerCase().includes(term) ||
        t.stripe_session_id?.toLowerCase().includes(term)
      );
    }

    // Filtro de Tipo
    if (filterType !== "ALL") {
      result = result.filter(t => t.tipo === filterType);
    }

    return result;
  }, [transacoes, search, filterType]);

  const stats = useMemo(() => {
    const total = filteredTransacoes.reduce((acc, t) => acc + Number(t.valor || 0), 0);
    const juris = filteredTransacoes.filter(t => t.tipo === "JURIS_PURCHASE").length;
    const pro = filteredTransacoes.filter(t => t.tipo === "PRO_SUBSCRIPTION" && t.juris_amount !== 7).length;
    const start = filteredTransacoes.filter(t => t.tipo === "PRO_SUBSCRIPTION" && t.juris_amount === 7).length;
    return { total, juris, pro, start };
  }, [filteredTransacoes]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Título do PDF
    doc.setFontSize(20);
    doc.setTextColor(212, 175, 55); // Ouro
    doc.text("Relatório Financeiro - SocialJurídico", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);
    doc.text(`Total de Transações: ${filteredTransacoes.length}`, 14, 33);
    doc.text(`Valor Total: R$ ${stats.total.toFixed(2)}`, 14, 38);

    const tableData = filteredTransacoes.map(t => [
      new Date(t.created_at).toLocaleDateString("pt-BR"),
      t.advogado?.name || "N/A",
      t.tipo === "JURIS_PURCHASE" ? "Compra de Juris" : "Assinatura PRO",
      `R$ ${Number(t.valor).toFixed(2)}`,
      t.cupom?.codigo || "-",
      t.status === "succeeded" ? "Sucesso" : "Pendente"
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["Data", "Advogado", "Tipo", "Valor", "Cupom", "Status"]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [11, 11, 14], textColor: [212, 175, 55] },
      alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    doc.save(`relatorio-financeiro-${new Date().getTime()}.pdf`);
    toast.success("Relatório gerado com sucesso!");
  };

  const handleSyncTransactions = async () => {
    const loadingToast = toast.loading("Sincronizando com Stripe...");
    try {
      const res = await fetch("/api/admin/transacoes/sync", { method: "POST" });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`Sincronização concluída! ${data.imported} novas vendas importadas.`, { id: loadingToast });
        // Recarregar lista
        const reloadRes = await fetch("/api/admin/transacoes", { cache: "no-store" });
        const reloadData = await reloadRes.json();
        if (reloadData.success) setTransacoes(reloadData.data);
      } else {
        toast.error(data.message || "Falha na sincronização", { id: loadingToast });
      }
    } catch (error) {
      toast.error("Erro ao sincronizar histórico", { id: loadingToast });
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando financeiro...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao dashboard
        </Link>
        <div className={styles.headerTitle}>
          <h1><CreditCard size={24} /> Gestão de Pagamentos</h1>
          <div className={styles.headerActions}>
            <button className={styles.syncBtn} onClick={handleSyncTransactions} title="Importar vendas passadas do Stripe">
              <RotateCcw size={16} /> Sincronizar Histórico
            </button>
            <button className={styles.exportBtn} onClick={handleExportPDF}>
              <FileDown size={18} /> Exportar Relatório PDF
            </button>
          </div>
        </div>
      </header>

      {/* Cards de Resumo */}
      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--color-gold)' }}>
            <TrendingUp size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Faturamento Total</span>
            <strong className={styles.statValue}>R$ {stats.total.toFixed(2)}</strong>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <ShoppingCart size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Vendas de Juris</span>
            <strong className={styles.statValue}>{stats.juris}</strong>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
            <DollarSign size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Planos START</span>
            <strong className={styles.statValue}>{stats.start}</strong>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
            <DollarSign size={20} />
          </div>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Planos PRO</span>
            <strong className={styles.statValue}>{stats.pro}</strong>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <div className={styles.filterSection}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar por nome, email ou ID da transação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.filterOptions}>
          <div className={styles.selectWrap}>
            <Filter size={16} className={styles.selectIcon} />
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={styles.selectInput}>
              <option value="ALL">Todos os Tipos</option>
              <option value="JURIS_PURCHASE">Compras de Juris</option>
              <option value="PRO_SUBSCRIPTION">Planos PRO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th><Calendar size={14} /> Data</th>
              <th>Advogado</th>
              <th>Tipo de Produto</th>
              <th>Valor Bruto</th>
              <th>Cupom</th>
              <th>Status</th>
              <th>ID Stripe</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransacoes.length > 0 ? (
              filteredTransacoes.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div className={styles.dateCell}>
                      <strong>{new Date(t.created_at).toLocaleDateString("pt-BR")}</strong>
                      <span>{new Date(t.created_at).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.lawyerCell}>
                      <strong>{t.advogado?.name || "N/A"}</strong>
                      <span>{t.advogado?.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={t.tipo === "JURIS_PURCHASE" ? styles.typeJuris : (t.juris_amount === 7 ? styles.typeStart : styles.typePro)}>
                      {t.tipo === "JURIS_PURCHASE" ? "PACOTE DE JURIS" : (t.juris_amount === 7 ? "PLANO MENSAL START" : "PLANO MENSAL PRO")}
                    </span>
                    {Number(t.juris_amount) > 0 && <div className={styles.jurisBonus}>+{t.juris_amount} Juris</div>}
                  </td>
                  <td>
                    <strong className={styles.amountValue}>
                      {Number(t.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </strong>
                  </td>
                  <td>
                    {t.cupom?.codigo ? (
                      <span className={styles.couponBadge}>
                        {t.cupom.codigo}
                      </span>
                    ) : "-"}
                  </td>
                  <td>
                    <span className={styles.statusSucceeded}>CONCLUÍDO</span>
                  </td>
                  <td>
                    <code className={styles.stripeId}>{t.stripe_session_id?.substring(0, 12)}...</code>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className={styles.emptyTable}>Nenhuma transação encontrada para os filtros aplicados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
