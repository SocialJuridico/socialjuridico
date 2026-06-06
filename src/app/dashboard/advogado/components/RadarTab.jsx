"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  MapPin,
  Calendar,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Eye,
  Megaphone,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";

export default function RadarTab({ setShowProModal, profileData, loadProfileData }) {
  const [oportunidades, setOportunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  
  // Filtros & Paginação
  const [search, setSearch] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [categoria, setCategoria] = useState("");
  const [fonte, setFonte] = useState("");
  const [urgencia, setUrgencia] = useState("");
  const [scoreMin, setScoreMin] = useState("0");
  
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Modal de Reporte
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  const fetchOportunidades = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "9", // 9 por página fica excelente em grid de 3x3
      });

      if (categoria) params.append("categoria", categoria);
      if (estado) params.append("estado", estado);
      if (cidade) params.append("cidade", cidade);
      if (fonte) params.append("fonte", fonte);
      if (urgencia) params.append("urgencia", urgencia);
      if (scoreMin !== "0") params.append("score_min", scoreMin);

      const res = await fetch(`/api/radar?${params.toString()}`);
      const json = await res.json();
      
      if (json.success) {
        setOportunidades(json.data || []);
        setPagination(json.pagination || { total: 0, pages: 1, limit: 9 });
        setIsDemo(!!json.is_demo);
      } else {
        toast.error(json.message || "Erro ao carregar oportunidades públicas.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao carregar Radar Jurídico.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOportunidades();
  }, [page, categoria, estado, urgencia, scoreMin]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOportunidades();
  };

  const handleClearFilters = () => {
    setSearch("");
    setCidade("");
    setEstado("");
    setCategoria("");
    setFonte("");
    setUrgencia("");
    setScoreMin("0");
    setPage(1);
  };

  const handleOpenOriginal = async (op) => {
    const toastId = toast.loading("Carregando link do caso...");
    try {
      const res = await fetch("/api/radar/clique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ radar_oportunidade_id: op.id }),
      });
      const json = await res.json();
      
      if (!res.ok || !json.success) {
        toast.error(json.message || "Erro ao obter acesso ao caso.", { id: toastId });
        return;
      }
      
      toast.dismiss(toastId);
      // Atualizar o saldo de Juris exibido na tela principal do advogado
      if (loadProfileData) {
        loadProfileData();
      }
      
      // Abrir publicação original em aba segura
      window.open(op.url_original, "_blank", "noopener,noreferrer,nofollow");
    } catch (err) {
      console.error("Erro ao registrar clique:", err);
      toast.error("Erro de conexão ao acessar o link.", { id: toastId });
    }
  };

  const handleReportClick = (opId) => {
    setReportingId(opId);
    setReportReason("");
    setShowReportModal(true);
  };

  const handleSendReport = async () => {
    if (!reportReason.trim()) {
      toast.error("Por favor, descreva o motivo do reporte.");
      return;
    }
    setSubmittingReport(true);
    try {
      const res = await fetch("/api/radar/reportar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          radar_oportunidade_id: reportingId,
          motivo: reportReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Oportunidade reportada! Nossa equipe revisará em breve.");
        setShowReportModal(false);
        // Atualizar lista para remover ou sinalizar
        setOportunidades(prev =>
          prev.map(op => (op.id === reportingId ? { ...op, reportado: true } : op))
        );
      } else {
        toast.error(json.message || "Erro ao enviar reporte.");
      }
    } catch (err) {
      toast.error("Erro ao enviar reporte.");
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div style={{ position: "relative", minHeight: "450px", width: "100%" }}>
      <div 
        style={{ 
          color: "#fff", 
          display: "flex", 
          flexDirection: "column", 
          gap: "20px",
          filter: isDemo ? "blur(5px) grayscale(40%)" : "none",
          pointerEvents: isDemo ? "none" : "auto",
          userSelect: isDemo ? "none" : "auto",
          transition: "filter 0.3s ease"
        }}
      >
      
      {/* ⚠️ Aviso Legal Obrigatório LGPD */}
      <div
        style={{
          background: "rgba(212, 175, 55, 0.08)",
          border: "1px solid rgba(212, 175, 55, 0.25)",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          gap: "14px",
          alignItems: "flex-start",
        }}
      >
        <ShieldAlert size={24} color="#d4af37" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div>
          <h4 style={{ color: "#d4af37", margin: "0 0 6px 0", fontWeight: 700, fontSize: "0.95rem" }}>
            Aviso de Oportunidades Públicas Detectadas
          </h4>
          <p style={{ margin: 0, fontSize: "0.86rem", color: "rgba(255,255,255,0.75)", lineHeight: "1.4" }}>
            Estas são oportunidades públicas encontradas na internet. Elas não foram publicadas diretamente no Social Jurídico. 
            Ao clicar, você será redirecionado para a publicação original. A disponibilidade da publicação pode mudar conforme a plataforma de origem. 
            O Radar Jurídico armazena somente referências a conteúdos públicos e links originais, sem coleta de dados pessoais sensíveis. 
            A abordagem reduz risco LGPD e mantém o advogado responsável por acessar a fonte original.
          </p>
        </div>
      </div>

      {/* Seção de Busca e Filtros */}
      <form
        onSubmit={handleSearchSubmit}
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "12px",
          padding: "18px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* Busca por Cidade */}
          <div style={{ flex: "1 1 200px", display: "flex", position: "relative" }}>
            <MapPin
              size={16}
              color="rgba(255,255,255,0.4)"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              placeholder="Buscar por cidade..."
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                padding: "10px 12px 10px 38px",
                color: "#fff",
                fontSize: "0.88rem",
                outline: "none",
              }}
            />
          </div>

          {/* Filtro Estado */}
          <input
            type="text"
            placeholder="UF (ex: SP)"
            maxLength={2}
            value={estado}
            onChange={(e) => setEstado(e.target.value.toUpperCase())}
            style={{
              width: "80px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              padding: "10px 10px",
              color: "#fff",
              fontSize: "0.88rem",
              textAlign: "center",
              outline: "none",
            }}
          />

          {/* Filtro Categoria */}
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            style={{
              flex: "1 1 180px",
              background: "rgba(20,20,20,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              padding: "10px 12px",
              color: "#fff",
              fontSize: "0.88rem",
              outline: "none",
            }}
          >
            <option value="">Todas as Áreas</option>
            <option value="Trabalhista">Trabalhista</option>
            <option value="Família">Família</option>
            <option value="Civil">Civil</option>
            <option value="Previdenciário">Previdenciário</option>
            <option value="Tributário">Tributário</option>
            <option value="Consumidor">Consumidor</option>
            <option value="Criminal">Criminal</option>
            <option value="Outros">Outros</option>
          </select>

          {/* Filtro Urgência */}
          <select
            value={urgencia}
            onChange={(e) => setUrgencia(e.target.value)}
            style={{
              width: "140px",
              background: "rgba(20,20,20,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              padding: "10px 12px",
              color: "#fff",
              fontSize: "0.88rem",
              outline: "none",
            }}
          >
            <option value="">Urgência (Todas)</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
          </select>

          {/* Score de Intenção Mínimo */}
          <select
            value={scoreMin}
            onChange={(e) => setScoreMin(e.target.value)}
            style={{
              width: "160px",
              background: "rgba(20,20,20,0.9)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "8px",
              padding: "10px 12px",
              color: "#fff",
              fontSize: "0.88rem",
              outline: "none",
            }}
          >
            <option value="0">Intenção Mínima</option>
            <option value="50">&gt; 50% Intenção</option>
            <option value="75">&gt; 75% Intenção</option>
            <option value="90">&gt; 90% Intenção</option>
          </select>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "4px" }}>
          <button
            type="button"
            onClick={handleClearFilters}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "8px 16px",
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.85rem",
              cursor: "pointer",
              transition: "0.2s",
            }}
            onMouseOver={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
            onMouseOut={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.15)")}
          >
            Limpar Filtros
          </button>
          <button
            type="submit"
            style={{
              background: "linear-gradient(135deg, #d4af37, #aa820a)",
              border: "none",
              borderRadius: "8px",
              padding: "8px 20px",
              color: "#000",
              fontWeight: 700,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              transition: "0.2s",
            }}
            onMouseOver={(e) => (e.target.style.opacity = "0.9")}
            onMouseOut={(e) => (e.target.style.opacity = "1")}
          >
            <Search size={14} /> Filtrar
          </button>
        </div>
      </form>

      {/* Grid de Resultados */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "60px 0" }}>
          <Loader2 size={36} className="animate-spin" color="#d4af37" />
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>Buscando oportunidades públicas no radar...</span>
        </div>
      ) : oportunidades.length === 0 ? (
        <div
          style={{
            padding: "80px 20px",
            textAlign: "center",
            background: "rgba(255,255,255,0.01)",
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: "12px",
          }}
        >
          <AlertTriangle size={32} color="rgba(255,255,255,0.3)" style={{ margin: "0 auto 12px auto" }} />
          <h4 style={{ margin: "0 0 6px 0", color: "rgba(255,255,255,0.8)" }}>Nenhuma oportunidade pública encontrada</h4>
          <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.85rem" }}>
            Tente mudar os filtros de localização ou categoria para expandir sua busca.
          </p>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "20px",
            }}
          >
            {oportunidades.map((op) => {
              // Mapeamento de urgência
              let colorUrgence = "#94a3b8"; // cinza
              if (op.urgencia === "alta") colorUrgence = "#ef4444"; // vermelho
              if (op.urgencia === "media") colorUrgence = "#f59e0b"; // laranja

              return (
                <div
                  key={op.id}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: op.reportado 
                      ? "1px solid rgba(239, 68, 68, 0.4)" 
                      : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "12px",
                    padding: "20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    position: "relative",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.4)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Topo do card */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px", marginBottom: "8px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "#d4af37",
                          textTransform: "uppercase",
                          background: "rgba(212, 175, 55, 0.08)",
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {op.categoria}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          color: colorUrgence,
                          textTransform: "uppercase",
                          border: `1px solid ${colorUrgence}`,
                          padding: "1px 6px",
                          borderRadius: "4px",
                        }}
                      >
                        {op.urgencia}
                      </span>
                    </div>

                    <h3 style={{ margin: "0 0 10px 0", fontSize: "1.05rem", fontWeight: 700, lineHeight: "1.3" }}>
                      {op.titulo}
                    </h3>

                    {/* Localização & Data */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={12} />
                        <span>
                          {op.cidade || "Não especificada"} - {op.estado || "UF"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Calendar size={12} />
                        <span>
                          {new Date(op.detectado_em || op.criado_em).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>

                    {/* Trecho Público */}
                    <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "8px", padding: "10px 12px", marginBottom: "14px" }}>
                      <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
                        Trecho Detectado na Origem:
                      </span>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.75)", fontStyle: "italic", lineHeight: "1.4" }}>
                        "{op.trecho_publico}"
                      </p>
                    </div>

                    {/* Resumo da IA */}
                    {op.resumo_ia && (
                      <div
                        style={{
                          background: "linear-gradient(135deg, rgba(212, 175, 55, 0.04), rgba(0, 180, 216, 0.04))",
                          border: "1px solid rgba(212, 175, 55, 0.1)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          marginBottom: "14px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                          <Sparkles size={12} color="#d4af37" />
                          <span style={{ fontSize: "0.72rem", color: "#d4af37", fontWeight: 700 }}>Resumo IA</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "rgba(255,255,255,0.85)", lineHeight: "1.4" }}>
                          {op.resumo_ia}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Rodapé do card (Ações) */}
                  <div>
                    {/* Linha de Metadados (Score, Fonte) */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", marginBottom: "12px", borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: "10px" }}>
                      <span>
                        Fonte: <strong style={{ color: "rgba(255,255,255,0.9)" }}>{op.fonte}</strong>
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "rgba(255,255,255,0.5)" }}>Score de intenção:</span>
                        <strong
                          style={{
                            color: op.score_intencao >= 80 ? "#10b981" : op.score_intencao >= 50 ? "#f59e0b" : "#ef4444",
                          }}
                        >
                          {op.score_intencao}%
                        </strong>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div style={{ display: "flex", gap: "8px" }}>
                      {op.reportado ? (
                        <button
                          disabled
                          style={{
                            flex: 1,
                            background: "rgba(239, 68, 68, 0.1)",
                            border: "1px solid rgba(239, 68, 68, 0.2)",
                            borderRadius: "6px",
                            padding: "8px",
                            color: "#ef4444",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                        >
                          <ShieldAlert size={12} /> Sinalizado
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReportClick(op.id)}
                          title="Sinalizar spam, conteúdo impróprio ou link quebrado"
                          style={{
                            width: "36px",
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            color: "rgba(255,255,255,0.6)",
                            transition: "0.2s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = "#ef4444";
                            e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = "rgba(255,255,255,0.6)";
                            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                          }}
                        >
                          <ShieldAlert size={14} />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenOriginal(op)}
                        style={{
                          flex: 1,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "6px",
                          padding: "8px 12px",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: "0.78rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          cursor: "pointer",
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#fff";
                          e.currentTarget.style.color = "#000";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                          e.currentTarget.style.color = "#fff";
                        }}
                      >
                        Abrir publicação original <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {pagination.pages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "24px" }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: page === 1 ? "rgba(255,255,255,0.2)" : "#fff",
                  fontSize: "0.8rem",
                  cursor: page === 1 ? "default" : "pointer",
                }}
              >
                Anterior
              </button>
              <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>
                Página {page} de {pagination.pages}
              </span>
              <button
                disabled={page === pagination.pages}
                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  color: page === pagination.pages ? "rgba(255,255,255,0.2)" : "#fff",
                  fontSize: "0.8rem",
                  cursor: page === pagination.pages ? "default" : "pointer",
                }}
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Sinalização/Reporte */}
      {showReportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#161b22",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
              padding: "24px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "14px" }}>
              <ShieldAlert size={20} color="#ef4444" />
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>Reportar Oportunidade</h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", margin: "0 0 16px 0", lineHeight: "1.4" }}>
              Sinalize este link se você encontrou dados inadequados, spam, link quebrado ou se a publicação original já foi removida.
            </p>

            <textarea
              placeholder="Descreva o motivo (ex: 'Link quebrado', 'Contém spam', 'Caso arquivado'...)"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                padding: "10px",
                color: "#fff",
                fontSize: "0.85rem",
                outline: "none",
                resize: "none",
                marginBottom: "18px",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                disabled={submittingReport}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  color: "#fff",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSendReport}
                disabled={submittingReport}
                style={{
                  background: "#ef4444",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {submittingReport ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Enviando...
                  </>
                ) : (
                  "Enviar Reporte"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {isDemo && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: "120px",
            zIndex: 100,
            background: "rgba(8, 9, 11, 0.45)",
            borderRadius: "16px"
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #171a21 0%, #0d0f12 100%)",
              border: "1px solid rgba(212, 175, 55, 0.3)",
              borderRadius: "16px",
              padding: "40px 30px",
              width: "90%",
              maxWidth: "480px",
              textAlign: "center",
              boxShadow: "0 15px 35px rgba(0, 0, 0, 0.7), 0 0 25px rgba(212, 175, 55, 0.12)",
              backdropFilter: "blur(4px)",
              position: "sticky",
              top: "120px"
            }}
          >
            <div style={{ display: "inline-flex", padding: "16px", background: "rgba(212, 175, 55, 0.08)", borderRadius: "50%", marginBottom: "20px" }}>
              <Lock size={32} color="#d4af37" />
            </div>
            
            <h3 style={{ margin: "0 0 12px 0", color: "#fff", fontSize: "1.4rem", fontWeight: 800 }}>
              Radar Jurídico Bloqueado
            </h3>
            
            <p style={{ margin: "0 0 24px 0", color: "rgba(255, 255, 255, 0.75)", fontSize: "0.92rem", lineHeight: "1.6" }}>
              O Radar Jurídico é uma funcionalidade exclusiva para assinantes ativos dos planos <strong style={{ color: "#d4af37" }}>START</strong> e <strong style={{ color: "#d4af37" }}>PRO</strong>. 
              Assine um plano para desbloquear detalhes completos de contato, resumos de IA e links originais das oportunidades.
            </p>
            
            <button
              type="button"
              onClick={() => setShowProModal && setShowProModal(true)}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #d4af37 0%, #aa820a 100%)",
                border: "none",
                borderRadius: "8px",
                padding: "14px 28px",
                color: "#000",
                fontWeight: 800,
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(212, 175, 55, 0.3)",
                transition: "all 0.2s"
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(212, 175, 55, 0.5)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 4px 15px rgba(212, 175, 55, 0.3)";
              }}
            >
              Assinar Plano Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
