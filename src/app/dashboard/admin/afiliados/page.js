"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  Users, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Coins, 
  TrendingUp,
  ShieldCheck,
  ExternalLink,
  Search
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./Afiliados.module.css";

export default function AdminAfiliadosPage() {
  const [indicacoes, setIndicacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchIndicacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/indicacoes");
      const data = await res.json();
      if (data.success) {
        setIndicacoes(data.data);
      } else {
        toast.error(data.message || "Erro ao carregar indicações");
      }
    } catch (e) {
      console.error("Erro fetchIndicacoes:", e);
      toast.error("Erro de conexão com o servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIndicacoes();
  }, [fetchIndicacoes]);

  const handleCredit = async (indicacao) => {
    const valor = prompt(`Quanto deseja creditar para ${indicacao.indicador?.name || 'este advogado'}? 50% do PRO (R$ 69,90) é ~35 Juris.`, "35");
    
    if (valor && !isNaN(valor)) {
      const confirmed = confirm(`Confirmar crédito de ${valor} Juris para o advogado indicador?`);
      if (!confirmed) return;

      try {
        const res = await fetch("/api/admin/indicacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            indicacao_id: indicacao.id,
            indicador_id: indicacao.indicador_id,
            valor: Number(valor)
          })
        });

        const data = await res.json();
        if (data.success) {
          toast.success("Crédito realizado com sucesso!");
          fetchIndicacoes(); // Recarrega a lista
        } else {
          toast.error(data.message || "Erro ao realizar crédito");
        }
      } catch (e) {
        toast.error("Erro ao processar crédito");
      }
    }
  };

  const filtered = indicacoes.filter(i => 
    i.nome_indicado?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.email_indicado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.indicador?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <Link href="/dashboard/admin" className={styles.backBtn}>
            <ArrowLeft size={16} /> Voltar ao Painel
          </Link>
          <h1>Gestão de Afiliados - Indique e Ganhe</h1>
          <p style={{ marginTop: 5, color: '#9ca3af', fontSize: '0.9rem' }}>
            Acompanhe indicações e credite comissões de 50% em Juris.
          </p>
        </div>
        <div style={{ position: 'relative' }}>
           <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..." 
              className={styles.searchInput} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: '#1a1d23',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '10px 15px 10px 40px',
                borderRadius: '10px',
                width: '300px'
              }}
           />
           <Search size={16} style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
        </div>
      </header>

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>
            <Loader2 className={styles.spin} /> Carregando indicações...
            <style jsx>{`
              @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              .spin { animation: spin 1s linear infinite; }
            `}</style>
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Quem Indicou (Dashboard)</th>
                <th>Quem foi Indicado (Lead)</th>
                <th>Status do Plano</th>
                <th>Comissão</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ind) => (
                <tr key={ind.id}>
                  <td style={{ opacity: 0.7 }}>
                    {new Date(ind.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <div className={styles.indicatorInfo}>
                      <span className={styles.indicatorName}>{ind.indicador?.name || 'Advogado do Dashboard'}</span>
                      <span className={styles.indicatorEmail}>{ind.indicador?.email}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.indicatorInfo}>
                      <span className={styles.indicatorName}>{ind.nome_indicado}</span>
                      <span className={styles.indicatorEmail}>{ind.email_indicado}</span>
                    </div>
                  </td>
                  <td>
                    {ind.is_pro ? (
                      <span className={`${styles.badge} ${styles.badgePro}`}>
                         PLANO PRO ATIVO ✅
                      </span>
                    ) : (
                      <span className={`${styles.badge} ${styles.badgeWait}`}>
                         PLANO BÁSICO
                      </span>
                    )}
                  </td>
                  <td>
                    {ind.status === 'COMISSIONADO' ? (
                      <div className={styles.statusPaid}>
                        <CheckCircle2 size={14} inline style={{ marginBottom: -2 }} /> {ind.valor_comissao} Juris
                      </div>
                    ) : (
                      <div className={styles.statusPending}>Pendente</div>
                    )}
                  </td>
                  <td>
                    {ind.status !== 'COMISSIONADO' && (
                      <button 
                        className={styles.creditBtn}
                        onClick={() => handleCredit(ind)}
                        disabled={!ind.is_pro}
                        title={!ind.is_pro ? "O indicado ainda não possui plano PRO" : "Clique para creditar Juris ao indicador"}
                      >
                         <Coins size={14} /> Creditar 50%
                      </button>
                    )}
                    {ind.status === 'COMISSIONADO' && (
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Pago</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '50px', opacity: 0.5 }}>
                    Nenhuma indicação encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
