"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Star, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Scale,
  Sparkles,
  Brain,
  Award,
  Users,
  Copy
} from "lucide-react";
import * as htmlToImage from "html-to-image";
import toast from "react-hot-toast";
import styles from "./Pesquisas.module.css";

const ADV_QUESTIONS = [
  { key: "q1_velocidade", label: "Velocidade/Estabilidade" },
  { key: "q2_marketplace", label: "Marketplace de Casos" },
  { key: "q3_ia_redator", label: "Redator IA" },
  { key: "q4_ia_personalidade", label: "Personalidade IA" },
  { key: "q5_seguranca", label: "Segurança de Dados" },
  { key: "q6_prazos", label: "Controle de Prazos" },
  { key: "q7_crm", label: "CRM de Clientes" },
  { key: "q8_smartdocs", label: "Organização de Docs" },
  { key: "q9_suporte", label: "Suporte da Plataforma" },
  { key: "q10_roi", label: "Retorno sobre Investimento" },
];

const CLI_QUESTIONS = [
  { key: "q1_cadastro", label: "Facilidade de Cadastro" },
  { key: "q2_clareza", label: "Clareza das Informações" },
  { key: "q3_velocidade", label: "Velocidade de Resposta" },
  { key: "q4_confianca", label: "Confiança nos Profissionais" },
  { key: "q5_qualidade", label: "Qualidade do Atendimento" },
  { key: "q6_chat", label: "Uso do Chat Integrado" },
  { key: "q7_transparencia", label: "Transparência de Custos" },
  { key: "q8_seguranca", label: "Segurança de Dados" },
  { key: "q9_pwa", label: "Acesso via Celular" },
  { key: "q10_recomendacao", label: "Recomendaria a um amigo?" },
];

export default function AdminPesquisasPage() {
  const [data, setData] = useState({ advogados: [], clientes: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("advogados");
  const [expandedId, setExpandedId] = useState(null);
  
  // AI summary states
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Refs for capturing specific cards
  const cardRefs = useRef({});

  // Dynamic statistics calculation
  const stats = useMemo(() => {
    const advCount = data.advogados.length;
    const cliCount = data.clientes.length;
    const totalCount = advCount + cliCount;

    let advSum = 0;
    data.advogados.forEach(item => {
      const sum = ADV_QUESTIONS.reduce((acc, q) => acc + (item[q.key] || 0), 0);
      advSum += sum / 10;
    });
    const advAvg = advCount > 0 ? (advSum / advCount) : 0;

    let cliSum = 0;
    data.clientes.forEach(item => {
      const sum = CLI_QUESTIONS.reduce((acc, q) => acc + (item[q.key] || 0), 0);
      cliSum += sum / 10;
    });
    const cliAvg = cliCount > 0 ? (cliSum / cliCount) : 0;

    const overallAvg = totalCount > 0 ? ((advSum + cliSum) / totalCount) : 0;

    return {
      advCount,
      cliCount,
      totalCount,
      advAvg: advAvg.toFixed(1),
      cliAvg: cliAvg.toFixed(1),
      overallAvg: overallAvg.toFixed(1),
    };
  }, [data]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/admin/pesquisas");
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          toast.error("Erro ao buscar pesquisas");
        }
      } catch (err) {
        toast.error("Erro na conexão");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleGenerateSummary = async () => {
    setGeneratingAi(true);
    const loadToast = toast.loading("Analisando avaliações com IA...");
    try {
      const res = await fetch("/api/admin/pesquisas/summary", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setAiSummary(json.data);
        toast.success("Resumo inteligente gerado com sucesso!", { id: loadToast });
      } else {
        toast.error(json.message || "Erro ao analisar feedbacks", { id: loadToast });
      }
    } catch (err) {
      toast.error("Erro ao comunicar com o servidor", { id: loadToast });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleDownload = async (id, userName) => {
    const node = cardRefs.current[id];
    if (!node) return;

    try {
      const dataUrl = await htmlToImage.toPng(node, { 
        quality: 1, 
        pixelRatio: 2, // High resolution
        backgroundColor: '#0d0f14', // Match background to avoid transparency issues
        style: { transform: 'scale(1)', margin: '0' } // Prevent scaling issues
      });
      const link = document.createElement("a");
      link.download = `Avaliacao_SocialJuridico_${userName.replace(/\s+/g, "_")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem gerada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar a imagem.");
    }
  };

  const renderStars = (nota) => {
    return [1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={16}
        fill={s <= nota ? "#d4af37" : "transparent"}
        color={s <= nota ? "#d4af37" : "rgba(255,255,255,0.2)"}
      />
    ));
  };

  const renderList = () => {
    const list = activeTab === "advogados" ? data.advogados : data.clientes;
    const questionsDef = activeTab === "advogados" ? ADV_QUESTIONS : CLI_QUESTIONS;

    if (list.length === 0) {
      return <div className={styles.emptyState}>Nenhuma avaliação registrada nesta categoria.</div>;
    }

    return (
      <div className={styles.grid}>
        {list.map((item) => {
          const userObj = activeTab === "advogados" ? item.advogados : item.clientes;
          const userName = userObj?.name || "Usuário Anônimo";
          const userEmail = userObj?.email || "—";
          
          // Calculate average
          const sum = questionsDef.reduce((acc, q) => acc + (item[q.key] || 0), 0);
          const avg = (sum / 10).toFixed(1);

          return (
            <div key={item.id} className={styles.cardWrapper}>
              {/* This is the card we capture as an image */}
              <div 
                className={`${styles.card} ${styles.cardCapture}`} 
                ref={(el) => (cardRefs.current[item.id] = el)}
              >
                <div className={styles.date}>
                  {new Date(item.created_at).toLocaleDateString("pt-BR")}
                </div>
                
                <div className={styles.userInfo}>
                  <h3 className={styles.userName}>
                    {activeTab === "advogados" ? <Scale size={18} /> : <CheckCircle size={18} />}
                    {userName}
                  </h3>
                  <p className={styles.userEmail}>{userEmail}</p>
                </div>

                <div className={styles.averageScore}>
                  <span className={styles.scoreText}>Nota Média: {avg}</span>
                  <div className={styles.stars}>{renderStars(Math.round(avg))}</div>
                </div>

                {item.feedback && (
                  <div className={styles.feedbackQuote}>
                    "{item.feedback}"
                  </div>
                )}

                {/* Expandable detailed answers */}
                {expandedId === item.id && (
                  <div className={styles.detailsList}>
                    <div style={{ paddingBottom: 10, color: '#fff', fontWeight: 'bold' }}>Detalhamento das Notas:</div>
                    {questionsDef.map(q => (
                      <div key={q.key} className={styles.detailItem}>
                        <span>{q.label}</span>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {renderStars(item[q.key])}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outside the capture area, we place buttons so they don't appear in the PNG */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className={styles.detailsBtn} 
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  style={{ flex: 1, justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)', padding: '10px', borderRadius: '8px' }}
                >
                  {expandedId === item.id ? (
                    <><ChevronUp size={16} /> Ocultar Notas</>
                  ) : (
                    <><ChevronDown size={16} /> Ver Notas Detalhadas</>
                  )}
                </button>
                <button 
                  className={styles.downloadBtn} 
                  onClick={() => handleDownload(item.id, userName)}
                  style={{ flex: 1 }}
                >
                  <Download size={16} /> Salvar PNG
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao Painel Administrativo
        </Link>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Star size={26} fill="var(--color-gold)" color="var(--color-gold)" />
            Pesquisas de Satisfação (Plataforma)
          </h1>
          <p className={styles.subtitle}>
            Acompanhe o feedback de advogados e clientes sobre o SocialJurídico v3.0
          </p>
        </div>
      </header>

      {/* Grid de Estatísticas Gerais */}
      {!loading && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Nota Geral da Plataforma</span>
            <div className={styles.statValue}>
              <Award size={24} color="var(--color-gold)" fill="var(--color-gold)" />
              {stats.overallAvg} <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>/ 5.0</span>
            </div>
            <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
              {renderStars(Math.round(parseFloat(stats.overallAvg)))}
            </div>
            <span className={styles.statSubtext}>Média consolidada de todos os usuários</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Média (Advogados)</span>
            <div className={styles.statValue}>
              <Scale size={24} color="var(--color-gold)" />
              {stats.advAvg} <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>/ 5.0</span>
            </div>
            <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
              {renderStars(Math.round(parseFloat(stats.advAvg)))}
            </div>
            <span className={styles.statSubtext}>Baseado em {stats.advCount} feedbacks</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Média (Clientes)</span>
            <div className={styles.statValue}>
              <CheckCircle size={24} color="var(--color-gold)" />
              {stats.cliAvg} <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', fontWeight: 'normal' }}>/ 5.0</span>
            </div>
            <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
              {renderStars(Math.round(parseFloat(stats.cliAvg)))}
            </div>
            <span className={styles.statSubtext}>Baseado em {stats.cliCount} feedbacks</span>
          </div>

          <div className={styles.statCard}>
            <span className={styles.statLabel}>Total de Avaliações</span>
            <div className={styles.statValue}>
              <Users size={24} color="#a0a0a0" />
              {stats.totalCount}
            </div>
            <span className={styles.statSubtext} style={{ marginTop: '14px' }}>Feedbacks recebidos no v3.0</span>
          </div>
        </div>
      )}

      {/* Copilot de Marketing com Inteligência Artificial */}
      {!loading && (
        <div className={styles.aiSummaryCard}>
          <div className={styles.aiHeader}>
            <div className={styles.aiTitle}>
              <Brain size={20} color="#8b5cf6" />
              <span>Copilot de Marketing IA</span>
              <span style={{ fontSize: '10px', background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>Novo</span>
            </div>
            <button 
              className={styles.aiButton} 
              onClick={handleGenerateSummary}
              disabled={generatingAi}
            >
              <Sparkles size={14} />
              {generatingAi ? "Analisando com IA..." : "Gerar Resumo para Marketing"}
            </button>
          </div>

          {aiSummary ? (
            <div className={styles.aiContent}>
              <p className={styles.aiText}>
                {aiSummary.summary}
              </p>

              <div className={styles.aiGrid}>
                {/* 3 Principais Diferenciais */}
                <div>
                  <h4 className={styles.aiSectionTitle}>
                    <Award size={14} /> 3 Diferenciais Chave
                  </h4>
                  <div className={styles.strengthsList}>
                    {aiSummary.strengths?.map((str, idx) => (
                      <div key={idx} className={styles.strengthItem}>
                        <span className={styles.strengthBadge}>Destaque</span>
                        <span>{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prova Social Curada */}
                <div>
                  <h4 className={styles.aiSectionTitle}>
                    <Users size={14} /> Prova Social / Depoimentos
                  </h4>
                  <div className={styles.quotesList}>
                    {aiSummary.quotes?.map((quote, idx) => (
                      <div key={idx} className={styles.quoteCard}>
                        <p>{quote}</p>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(quote);
                            toast.success("Copiado para a área de transferência!");
                          }}
                          style={{ position: 'absolute', top: '8px', right: '8px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                          title="Copiar Depoimento"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ideias de Copy para Marketing */}
                <div>
                  <h4 className={styles.aiSectionTitle}>
                    <Sparkles size={14} /> Ganchos de Copy / Slogans
                  </h4>
                  <div className={styles.hooksList}>
                    {aiSummary.marketingHooks?.map((hook, idx) => (
                      <div key={idx} className={styles.hookCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className={styles.hookTag}>Ideia {idx + 1}</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(hook);
                              toast.success("Copiado para a área de transferência!");
                            }}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
                            title="Copiar Slogan"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                        <p className={styles.hookText}>{hook}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              Clique no botão acima para consolidar todos os feedbacks com inteligência artificial e gerar ganchos publicitários.
            </div>
          )}
        </div>
      )}

      <div className={styles.tabs}>
        <button 
          className={`${styles.tabBtn} ${activeTab === "advogados" ? styles.active : ""}`}
          onClick={() => setActiveTab("advogados")}
        >
          Advogados ({data.advogados.length})
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === "clientes" ? styles.active : ""}`}
          onClick={() => setActiveTab("clientes")}
        >
          Clientes ({data.clientes.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "rgba(255,255,255,0.5)" }}>
          Carregando pesquisas...
        </div>
      ) : (
        renderList()
      )}
    </div>
  );
}
