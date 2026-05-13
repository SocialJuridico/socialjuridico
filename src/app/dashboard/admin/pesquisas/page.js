"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Download, ChevronDown, ChevronUp, CheckCircle, Scale } from "lucide-react";
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

  // Refs for capturing specific cards
  const cardRefs = useRef({});

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
