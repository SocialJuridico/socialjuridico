"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield,
  ArrowLeft,
  Search,
  Filter,
  Check,
  X,
  PlusCircle,
  Upload,
  Eye,
  AlertTriangle,
  MapPin,
  Calendar,
  Sparkles,
  ExternalLink,
  Loader2,
  Trash2,
  Edit2,
  Archive,
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./page.module.css";

export default function AdminRadarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [oportunidades, setOportunidades] = useState([]);
  
  // Filtros & Paginação
  const [statusFilter, setStatusFilter] = useState("pendente");
  const [catFilter, setCatFilter] = useState("");
  const [fonteFilter, setFonteFilter] = useState("");
  const [fonteTipoFilter, setFonteTipoFilter] = useState("");
  const [reportFilter, setReportFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, limit: 10 });

  // Criação Manual
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "Trabalhista",
    fonte: "Facebook",
    url_original: "",
    trecho_publico: "",
    cidade: "",
    estado: "",
    score_intencao: 80,
    urgencia: "media",
    resumo_ia: "",
    status: "pendente",
  });

  // Importação JSON
  const [showImportArea, setShowImportArea] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);

  // Busca Automática Robô
  const [executingSearch, setExecutingSearch] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  // Capturador Manual Inteligente
  const [showCapturador, setShowCapturador] = useState(false);
  const [captForm, setCaptForm] = useState({ url: "", fonte: "Facebook", texto: "" });
  const [captPreview, setCaptPreview] = useState(null);
  const [captLoading, setCaptLoading] = useState(false);
  const [captSaving, setCaptSaving] = useState(false);

  // Edição
  const [editingItem, setEditingItem] = useState(null);

  // Rejeição
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectMotive, setRejectMotive] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Carregar dados administrativos e de perfil
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const meRes = await fetch("/api/admin/me", { cache: "no-store" });
        const meData = await meRes.json();
        if (!meRes.ok || !meData.success) {
          toast.error("Acesso restrito: área administrativa.");
          router.replace("/dashboard/cliente");
          return;
        }
        setAdmin(meData.data);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao validar credenciais administrativas.");
      }
    };
    checkAuth();
  }, [router]);

  // Carregar Oportunidades
  const fetchOportunidades = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (statusFilter) params.append("status", statusFilter);
      if (catFilter) params.append("categoria", catFilter);
      if (fonteFilter) params.append("fonte", fonteFilter);
      if (fonteTipoFilter) params.append("fonte_tipo", fonteTipoFilter);
      if (reportFilter) params.append("reportado", "true");

      const res = await fetch(`/api/admin/radar?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setOportunidades(json.data || []);
        setPagination(json.pagination || { total: 0, pages: 1, limit: 10 });
      } else {
        toast.error(json.message || "Erro ao carregar oportunidades públicas.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao buscar oportunidades.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (admin) {
      fetchOportunidades();
    }
  }, [admin, page, statusFilter, catFilter, reportFilter, fonteTipoFilter]);

  // Criar Manulamente
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.url_original.trim() || !formData.categoria.trim() || !formData.fonte.trim()) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const res = await fetch("/api/admin/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Oportunidade pública inserida com sucesso!");
        setShowCreateForm(false);
        setFormData({
          titulo: "",
          categoria: "Trabalhista",
          fonte: "Facebook",
          url_original: "",
          trecho_publico: "",
          cidade: "",
          estado: "",
          score_intencao: 80,
          urgencia: "media",
          resumo_ia: "",
          status: "pendente",
        });
        fetchOportunidades();
      } else {
        toast.error(json.message || "Erro ao cadastrar.");
      }
    } catch (err) {
      toast.error("Erro na conexão com o servidor.");
    }
  };

  // Importar JSON
  const handleImportSubmit = async () => {
    if (!jsonText.trim()) {
      toast.error("Cole o JSON estruturado para importação");
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      toast.error("JSON inválido. Verifique a sintaxe.");
      return;
    }

    setImporting(true);
    try {
      const res = await fetch("/api/admin/radar/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const json = await res.json();

      if (json.success) {
        const { importadas, ignoradas, erros } = json.stats;
        toast.success(`Importação finalizada! ${importadas} criadas, ${ignoradas} duplicadas ignoradas, ${erros} erros.`);
        setJsonText("");
        setShowImportArea(false);
        fetchOportunidades();
      } else {
        toast.error(json.message || "Erro na importação.");
      }
    } catch (err) {
      toast.error("Erro ao enviar lote de importação.");
    } finally {
      setImporting(false);
    }
  };

  // Capturador Manual Inteligente — Analisar com IA
  const handleCapturarAnalisar = async () => {
    if (!captForm.url.trim() || !captForm.texto.trim()) {
      toast.error("Cole a URL e o texto da publicação.");
      return;
    }
    // Sanitizar dados pessoais antes de enviar
    const sanit = captForm.texto
      .replace(/(\+55[\s-]?)?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g, "[telefone omitido]")
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email omitido]")
      .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, "[CPF omitido]")
      .substring(0, 2000);

    // Verificar duplicata por URL
    const urlNorm = captForm.url.trim();
    setCaptLoading(true);
    setCaptPreview(null);
    try {
      const res = await fetch("/api/admin/radar/capturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlNorm, fonte: captForm.fonte, texto: sanit })
      });
      const json = await res.json();
      if (json.success) {
        setCaptPreview(json.preview);
      } else {
        toast.error(json.message || "Erro ao analisar.");
      }
    } catch {
      toast.error("Erro na conexão.");
    } finally {
      setCaptLoading(false);
    }
  };

  // Capturador Manual Inteligente — Confirmar e Salvar
  const handleCapturarSalvar = async () => {
    if (!captPreview) return;
    setCaptSaving(true);
    try {
      const res = await fetch("/api/admin/radar/capturar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(captPreview)
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Oportunidade salva como pendente!");
        setCaptPreview(null);
        setCaptForm({ url: "", fonte: "Facebook", texto: "" });
        setShowCapturador(false);
        fetchOportunidades();
      } else {
        toast.error(json.message || "Erro ao salvar.");
      }
    } catch {
      toast.error("Erro ao salvar.");
    } finally {
      setCaptSaving(false);
    }
  };

  // Dispara a busca automática pelo painel
  const handleExecutarBuscaAutomatica = async () => {
    setExecutingSearch(true);
    setSearchResult(null);
    try {
      const res = await fetch("/api/admin/radar/executar-busca", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setSearchResult(json.stats);
        toast.success("Busca automática concluída!");
        fetchOportunidades();
      } else {
        toast.error(json.message || "Erro ao executar busca automática.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na conexão com o servidor.");
    } finally {
      setExecutingSearch(false);
    }
  };

  // Aprovar
  const handleAprovar = async (id) => {
    try {
      const res = await fetch(`/api/admin/radar/${id}/aprovar`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        toast.success("Oportunidade aprovada e publicada!");
        fetchOportunidades();
      } else {
        toast.error(json.message || "Erro ao aprovar.");
      }
    } catch (err) {
      toast.error("Erro na requisição.");
    }
  };

  // Rejeitar (Abrir modal)
  const openRejeitarModal = (id) => {
    setRejectingId(id);
    setRejectMotive("");
    setShowRejectModal(true);
  };

  const handleRejeitarConfirm = async () => {
    if (!rejectMotive.trim()) {
      toast.error("Descreva o motivo da rejeição");
      return;
    }
    try {
      const res = await fetch(`/api/admin/radar/${reportingId || rejectingId}/rejeitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: rejectMotive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Oportunidade rejeitada!");
        setShowRejectModal(false);
        fetchOportunidades();
      } else {
        toast.error(json.message || "Erro ao rejeitar.");
      }
    } catch (err) {
      toast.error("Erro na requisição.");
    }
  };

  // Arquivar
  const handleArquivar = async (id) => {
    try {
      const res = await fetch(`/api/admin/radar/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "arquivado" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Oportunidade arquivada com sucesso!");
        fetchOportunidades();
      } else {
        toast.error(json.message || "Erro ao arquivar.");
      }
    } catch (err) {
      toast.error("Erro na requisição.");
    }
  };

  // Edição - Salvar
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/radar/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Oportunidade editada com sucesso!");
        setEditingItem(null);
        fetchOportunidades();
      } else {
        toast.error(json.message || "Erro ao atualizar.");
      }
    } catch (err) {
      toast.error("Erro ao salvar edições.");
    }
  };

  if (!admin) {
    return (
      <div className={styles.loaderContainer}>
        <Loader2 size={40} className="animate-spin" color="var(--color-gold)" />
        <p>Carregando Radar Administrativo...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/dashboard/admin" className={styles.brand}>
          <Shield size={18} />
          SocialJuridico Admin
        </Link>
        <div className={styles.adminCard}>
          <p className={styles.adminName}>{admin.name || "Administrador"}</p>
          <p className={styles.adminEmail}>{admin.email}</p>
        </div>
        <Link href="/dashboard/admin" className={styles.backBtn}>
          <ArrowLeft size={16} /> Voltar ao Painel
        </Link>
      </aside>

      {/* Conteúdo Principal */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Radar Jurídico: Oportunidades Públicas</h1>
          <p>Gerencie e aprove oportunidades encontradas em canais externos.</p>
        </header>

        {/* Painel de Controle Superior */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              setShowCreateForm(!showCreateForm);
              setShowImportArea(false);
              setShowCapturador(false);
            }}
            className={styles.actionBtn}
            style={{ background: "linear-gradient(135deg, #d4af37, #aa820a)", color: "#000", fontWeight: 700 }}
          >
            <PlusCircle size={16} /> Criar Manual
          </button>
          <button
            onClick={() => {
              setShowImportArea(!showImportArea);
              setShowCreateForm(false);
              setShowCapturador(false);
            }}
            className={styles.actionBtn}
            style={{ background: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <Upload size={16} /> Importar Lote JSON
          </button>
          <button
            onClick={() => {
              setShowCapturador(!showCapturador);
              setShowCreateForm(false);
              setShowImportArea(false);
              setCaptPreview(null);
            }}
            className={styles.actionBtn}
            style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)", color: "#fff", fontWeight: 700 }}
          >
            <Search size={16} /> Capturador Manual Inteligente
          </button>
          <button
            onClick={handleExecutarBuscaAutomatica}
            disabled={executingSearch}
            className={styles.actionBtn}
            style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "#fff", fontWeight: 700 }}
          >
            {executingSearch ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Buscando...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Executar busca automática agora
              </>
            )}
          </button>
        </div>

        {/* Resultado da Busca Automática */}
        {searchResult && (
          <div
            style={{
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              padding: "18px",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "0.87rem",
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ display: "flex", alignItems: "center", gap: "6px", color: "#60a5fa" }}>
                <Sparkles size={16} /> Relatório da Última Busca Automática
              </strong>
              <button
                onClick={() => setSearchResult(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.82rem" }}
              >
                Limpar
              </button>
            </div>

            {/* Totais gerais */}
            <div style={{ display: "flex", gap: "12px 24px", flexWrap: "wrap", paddingBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              <div>Encontrados: <strong style={{ color: "#cbd5e1" }}>{searchResult.total_encontrado ?? 0}</strong></div>
              <div>Duplicados: <strong style={{ color: "#f59e0b" }}>{searchResult.total_duplicados ?? 0}</strong></div>
              <div>Classificados IA: <strong style={{ color: "#3b82f6" }}>{searchResult.total_classificados ?? 0}</strong></div>
              <div>Score &lt; 70 (descartados): <strong style={{ color: "#f97316" }}>{searchResult.total_descartados_baixo_score ?? searchResult.total_descartados_score ?? 0}</strong></div>
              <div>Inseridos pendentes: <strong style={{ color: "#10b981" }}>{searchResult.total_inseridos ?? 0}</strong></div>
              {(searchResult.total_erros ?? 0) > 0 && (
                <div>Erros: <strong style={{ color: "#f87171" }}>{searchResult.total_erros}</strong></div>
              )}
            </div>

            {/* Por fonte */}
            {(searchResult.brave || searchResult.reddit || searchResult.google_cse) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "8px" }}>
                {[{key: "brave", label: "Brave Search", color: "#f97316"}, {key: "reddit", label: "Reddit RSS", color: "#fb923c"}, {key: "google_cse", label: "Google CSE", color: "#4ade80"}].map(({key, label, color}) => {
                  const s = searchResult[key];
                  if (!s) return null;
                  return (
                    <div key={key} style={{ background: "rgba(0,0,0,0.25)", borderRadius: "8px", padding: "8px 12px", fontSize: "0.8rem" }}>
                      <div style={{ color, fontWeight: 700, marginBottom: "4px" }}>{label}</div>
                      <div>Encontrados: <strong>{s.encontrados ?? 0}</strong></div>
                      <div>Classificados: <strong>{s.classificados ?? 0}</strong></div>
                      <div>Inseridos: <strong style={{ color: "#10b981" }}>{s.inseridos ?? 0}</strong></div>
                      {(s.descartados_baixo_score ?? 0) > 0 && <div>Descartados: <strong style={{ color: "#f97316" }}>{s.descartados_baixo_score}</strong></div>}
                      {(s.erros ?? 0) > 0 && <div>Erros: <strong style={{ color: "#f87171" }}>{s.erros}</strong></div>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Por domínio */}
            {searchResult.por_dominio && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "10px" }}>
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.78rem", display: "block", marginBottom: "6px", fontWeight: 600 }}>Por Domínio (Brutos):</span>
                <div style={{ display: "flex", gap: "12px 20px", flexWrap: "wrap", fontSize: "0.81rem" }}>
                  <div>Facebook: <strong style={{ color: "#93c5fd" }}>{searchResult.por_dominio.facebook ?? 0}</strong></div>
                  <div>Instagram: <strong style={{ color: "#c084fc" }}>{searchResult.por_dominio.instagram ?? 0}</strong></div>
                  <div>X/Twitter: <strong style={{ color: "#f472b6" }}>{searchResult.por_dominio.x_twitter ?? 0}</strong></div>
                  <div>JusBrasil: <strong style={{ color: "#fb7185" }}>{searchResult.por_dominio.jusbrasil ?? 0}</strong></div>
                  <div>Reddit: <strong style={{ color: "#fb923c" }}>{searchResult.por_dominio.reddit ?? 0}</strong></div>
                  {(searchResult.por_dominio.outros ?? 0) > 0 && <div>Outros: <strong style={{ color: "#94a3b8" }}>{searchResult.por_dominio.outros}</strong></div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Capturador Manual Inteligente */}
        {showCapturador && (
          <div className={styles.adminForm}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Search size={18} color="#a78bfa" /> Capturador Manual Inteligente
            </h3>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", marginBottom: "14px" }}>
              Cole a URL pública e o texto da publicação encontrado manualmente no Facebook, Instagram, X, JusBrasil ou Reddit.
              A IA irá analisar e gerar um pré-cadastro. <strong style={{ color: "#f97316" }}>Telefones, e-mails e CPFs são removidos automaticamente.</strong>
            </p>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>URL Pública da Publicação *</label>
                <input
                  type="url"
                  placeholder="https://facebook.com/posts/..."
                  value={captForm.url}
                  onChange={(e) => setCaptForm({ ...captForm, url: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Fonte de Origem *</label>
                <select value={captForm.fonte} onChange={(e) => setCaptForm({ ...captForm, fonte: e.target.value })}>
                  <option value="Facebook">Facebook</option>
                  <option value="Instagram">Instagram</option>
                  <option value="X / Twitter">X / Twitter</option>
                  <option value="JusBrasil">JusBrasil</option>
                  <option value="Reddit">Reddit</option>
                </select>
              </div>
              <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                <label>Texto Bruto da Publicação * (máx. 2000 caracteres)</label>
                <textarea
                  rows={5}
                  maxLength={2000}
                  placeholder="Cole aqui o texto exato da publicação (sem fotos, prints ou dados pessoais)..."
                  value={captForm.texto}
                  onChange={(e) => setCaptForm({ ...captForm, texto: e.target.value })}
                />
                <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.35)" }}>{captForm.texto.length}/2000</span>
              </div>
            </div>

            {!captPreview ? (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                <button type="button" onClick={() => { setShowCapturador(false); setCaptForm({ url: "", fonte: "Facebook", texto: "" }); }} className={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="button" onClick={handleCapturarAnalisar} disabled={captLoading} className={styles.saveBtn} style={{ background: "linear-gradient(135deg, #7c3aed, #5b21b6)" }}>
                  {captLoading ? <><Loader2 size={14} className="animate-spin" /> Analisando...</> : <><Sparkles size={14} /> Analisar com IA</>}
                </button>
              </div>
            ) : (
              <div style={{ marginTop: "16px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "10px", padding: "16px" }}>
                <strong style={{ color: "#a78bfa", display: "block", marginBottom: "10px" }}>📋 Pré-visualização — Confirme antes de salvar:</strong>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", fontSize: "0.83rem", color: "rgba(255,255,255,0.85)" }}>
                  <div><span style={{ color: "rgba(255,255,255,0.45)" }}>Título:</span> <strong>{captPreview.titulo}</strong></div>
                  <div><span style={{ color: "rgba(255,255,255,0.45)" }}>Categoria:</span> <strong>{captPreview.categoria}</strong></div>
                  <div><span style={{ color: "rgba(255,255,255,0.45)" }}>Score:</span> <strong style={{ color: captPreview.score_intencao >= 70 ? "#10b981" : "#f97316" }}>{captPreview.score_intencao}%</strong></div>
                  <div><span style={{ color: "rgba(255,255,255,0.45)" }}>Urgência:</span> <strong>{captPreview.urgencia}</strong></div>
                  <div><span style={{ color: "rgba(255,255,255,0.45)" }}>Cidade:</span> <strong>{captPreview.cidade || "N/A"}</strong></div>
                  <div><span style={{ color: "rgba(255,255,255,0.45)" }}>Estado:</span> <strong>{captPreview.estado || "N/A"}</strong></div>
                  <div style={{ gridColumn: "span 2" }}><span style={{ color: "rgba(255,255,255,0.45)" }}>Resumo IA:</span> {captPreview.resumo_ia}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
                  <button type="button" onClick={() => setCaptPreview(null)} className={styles.cancelBtn}>Reanalisar</button>
                  <button type="button" onClick={handleCapturarSalvar} disabled={captSaving} className={styles.saveBtn} style={{ background: "#10b981" }}>
                    {captSaving ? "Salvando..." : <><Check size={14} /> Confirmar e Salvar como Pendente</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Formulário de Criação Manual */}
        {showCreateForm && (
          <form onSubmit={handleCreateSubmit} className={styles.adminForm}>
            <h3>Nova Oportunidade Pública</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Título da Oportunidade *</label>
                <input
                  type="text"
                  placeholder="Ex: Busca de advogado trabalhista para demissão"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>URL Original (Link Público) *</label>
                <input
                  type="text"
                  placeholder="https://facebook.com/groups/..."
                  required
                  value={formData.url_original}
                  onChange={(e) => setFormData({ ...formData, url_original: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Categoria (Área do Direito) *</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                >
                  <option value="Trabalhista">Trabalhista</option>
                  <option value="Família">Família</option>
                  <option value="Civil">Civil</option>
                  <option value="Previdenciário">Previdenciário</option>
                  <option value="Tributário">Tributário</option>
                  <option value="Consumidor">Consumidor</option>
                  <option value="Criminal">Criminal</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Fonte de Origem *</label>
                <input
                  type="text"
                  placeholder="Ex: Facebook, Reddit, X"
                  required
                  value={formData.fonte}
                  onChange={(e) => setFormData({ ...formData, fonte: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Cidade</label>
                <input
                  type="text"
                  placeholder="Ex: Porto Alegre"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Estado (Sigla com 2 letras)</label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="Ex: RS"
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Score de Intenção (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score_intencao}
                  onChange={(e) => setFormData({ ...formData, score_intencao: parseInt(e.target.value) })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Urgência</label>
                <select
                  value={formData.urgencia}
                  onChange={(e) => setFormData({ ...formData, urgencia: e.target.value })}
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                <label>Trecho Público (Exibido para o advogado - máximo 500 caracteres)</label>
                <textarea
                  maxLength={500}
                  rows={2}
                  placeholder="Recorte curto sem dados sensíveis..."
                  value={formData.trecho_publico}
                  onChange={(e) => setFormData({ ...formData, trecho_publico: e.target.value })}
                />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                <label>Resumo IA</label>
                <textarea
                  rows={2}
                  placeholder="Resumo explicativo gerado automaticamente ou manualmente..."
                  value={formData.resumo_ia}
                  onChange={(e) => setFormData({ ...formData, resumo_ia: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
              <button type="button" onClick={() => setShowCreateForm(false)} className={styles.cancelBtn}>
                Cancelar
              </button>
              <button type="submit" className={styles.saveBtn}>
                Salvar Oportunidade
              </button>
            </div>
          </form>
        )}

        {/* Área de Importação JSON */}
        {showImportArea && (
          <div className={styles.adminForm}>
            <h3>Importar Oportunidades Estruturadas (Lote JSON)</h3>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)", marginBottom: "12px" }}>
              Insira abaixo um array JSON contendo os itens formatados pela IA. O radar ignorará URLs originais duplicadas.
            </p>
            <textarea
              rows={8}
              placeholder="[ { 'titulo': '...', 'categoria': '...', 'fonte': '...', 'url_original': '...', 'score_intencao': 90 } ]"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.2)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                padding: "12px",
                fontFamily: "monospace",
                outline: "none",
                fontSize: "0.82rem",
                marginBottom: "14px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button type="button" onClick={() => setShowImportArea(false)} className={styles.cancelBtn}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={importing}
                className={styles.saveBtn}
                style={{ background: "#10b981", color: "#fff" }}
              >
                {importing ? "Importando..." : "Executar Importação"}
              </button>
            </div>
          </div>
        )}

        {/* Filtros da Listagem */}
        <div className={styles.filtersWrapper} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => { setStatusFilter("pendente"); setPage(1); }}
              className={`${styles.filterTab} ${statusFilter === "pendente" ? styles.filterTabActive : ""}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => { setStatusFilter("aprovado"); setPage(1); }}
              className={`${styles.filterTab} ${statusFilter === "aprovado" ? styles.filterTabActive : ""}`}
            >
              Aprovadas
            </button>
            <button
              onClick={() => { setStatusFilter("rejeitado"); setPage(1); }}
              className={`${styles.filterTab} ${statusFilter === "rejeitado" ? styles.filterTabActive : ""}`}
            >
              Rejeitadas
            </button>
            <button
              onClick={() => { setStatusFilter("arquivado"); setPage(1); }}
              className={`${styles.filterTab} ${statusFilter === "arquivado" ? styles.filterTabActive : ""}`}
            >
              Arquivadas
            </button>

            <label className={styles.checkboxLabel} style={{ marginLeft: "14px" }}>
              <input
                type="checkbox"
                checked={reportFilter}
                onChange={(e) => { setReportFilter(e.target.checked); setPage(1); }}
              />
              <span style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 600 }}>Reportadas / Sinalizadas</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "10px" }}>
            <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center", marginRight: "8px", fontWeight: 600 }}>
              Filtrar Canal:
            </span>
            {[
              { label: "Todos", value: "" },
              { label: "Facebook", value: "Facebook" },
              { label: "Instagram", value: "Instagram" },
              { label: "X / Twitter", value: "X" },
              { label: "Reddit", value: "Reddit" },
              { label: "JusBrasil", value: "JusBrasil" },
              { label: "Google", value: "Google" },
              { label: "Outros", value: "Outros" }
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={() => { setFonteTipoFilter(tab.value); setPage(1); }}
                className={`${styles.filterTab} ${fonteTipoFilter === tab.value ? styles.filterTabActive : ""}`}
                style={{ fontSize: "0.78rem", padding: "4px 10px" }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Listagem */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <Loader2 size={36} className="animate-spin" color="var(--color-gold)" style={{ margin: "0 auto 10px auto" }} />
            <p style={{ color: "rgba(255,255,255,0.6)" }}>Buscando oportunidades do banco...</p>
          </div>
        ) : oportunidades.length === 0 ? (
          <div className={styles.emptyState}>
            <AlertTriangle size={36} color="rgba(255,255,255,0.3)" style={{ margin: "0 auto 12px auto" }} />
            <h4>Nenhuma oportunidade correspondente encontrada</h4>
          </div>
        ) : (
          <div className={styles.list}>
            {oportunidades.map((op) => {
              const cliCount = op.cliques?.[0]?.count || 0;
              return (
                <div key={op.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div>
                      <span className={styles.badgeArea}>{op.categoria}</span>
                      <span className={styles.badgeFonte}>{op.fonte}</span>
                      {op.reportado && (
                        <span className={styles.badgeReportado}>🚨 Reportado ({op.reportado_motivos?.length || 1})</span>
                      )}
                    </div>
                    <span className={styles.cardDate}>
                      {new Date(op.criado_em).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  <h3 className={styles.cardTitle}>{op.titulo}</h3>

                  <div className={styles.cardMeta}>
                    <span>📍 {op.cidade || "N/A"} - {op.estado || "N/A"}</span>
                    <span>📈 Score: <strong>{op.score_intencao}%</strong></span>
                    <span>⚡ Urgência: <strong style={{ color: op.urgencia === "alta" ? "#ef4444" : "#f59e0b" }}>{op.urgencia}</strong></span>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Eye size={12} color="#00b4d8" /> cliques: <strong style={{ color: "#00b4d8" }}>{cliCount}</strong>
                    </span>
                  </div>

                  <p className={styles.cardExcerpt}>{op.trecho_publico}</p>

                  {op.resumo_ia && (
                    <div className={styles.cardAi}>
                      <strong>Resumo IA:</strong> {op.resumo_ia}
                    </div>
                  )}

                  {/* Detalhes de Rejeição */}
                  {op.status === "rejeitado" && op.rejeitado_motivo && (
                    <div className={styles.cardRejectedReason}>
                      <strong>Motivo da Rejeição:</strong> {op.rejeitado_motivo}
                    </div>
                  )}

                  {/* Motivos de reportes */}
                  {op.reportado && op.reportado_motivos?.length > 0 && (
                    <div className={styles.cardReportsList}>
                      <strong>Sinalizações do Advogado:</strong>
                      <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px", fontSize: "0.8rem", color: "#ef4444" }}>
                        {op.reportado_motivos.map((m, idx) => (
                          <li key={idx}>&quot;{m}&quot;</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Linha de Rodapé com Ações */}
                  <div className={styles.cardFooter}>
                    <a
                      href={op.url_original}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.linkUrl}
                    >
                      Ver Publicação Original <ExternalLink size={12} />
                    </a>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => setEditingItem(op)}
                        className={styles.btnIcon}
                        title="Editar"
                      >
                        <Edit2 size={13} /> Editar
                      </button>

                      {op.status === "pendente" && (
                        <>
                          <button
                            onClick={() => handleAprovar(op.id)}
                            className={styles.btnApprove}
                          >
                            <Check size={13} /> Aprovar
                          </button>
                          <button
                            onClick={() => openRejeitarModal(op.id)}
                            className={styles.btnReject}
                          >
                            <X size={13} /> Rejeitar
                          </button>
                        </>
                      )}

                      {op.status !== "arquivado" && (
                        <button
                          onClick={() => handleArquivar(op.id)}
                          className={styles.btnArchive}
                          title="Arquivar"
                        >
                          <Archive size={13} /> Arquivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {pagination.pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "20px" }}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={styles.pageBtn}
            >
              Anterior
            </button>
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>
              Página {page} de {pagination.pages}
            </span>
            <button
              disabled={page === pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              className={styles.pageBtn}
            >
              Próxima
            </button>
          </div>
        )}
      </main>

      {/* Modal de Rejeição */}
      {showRejectModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Justificativa de Rejeição</h3>
            <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.6)" }}>
              Escreva o motivo pelo qual esta oportunidade está sendo rejeitada.
            </p>
            <textarea
              rows={3}
              placeholder="Ex: Contém dados pessoais expostos / Spam / Sem nexo jurídico..."
              value={rejectMotive}
              onChange={(e) => setRejectMotive(e.target.value)}
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "#fff",
                padding: "8px",
                outline: "none",
                fontSize: "0.85rem",
                marginTop: "10px",
                marginBottom: "14px",
                resize: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button onClick={() => setShowRejectModal(false)} className={styles.cancelBtn}>
                Cancelar
              </button>
              <button onClick={handleRejeitarConfirm} className={styles.saveBtn} style={{ background: "#ef4444" }}>
                Rejeitar Oportunidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingItem && (
        <div className={styles.modalOverlay}>
          <form onSubmit={handleEditSubmit} className={styles.modalContent} style={{ maxWidth: "580px" }}>
            <h3>Editar Oportunidade Pública</h3>
            <div className={styles.formGrid} style={{ marginTop: "14px" }}>
              <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                <label>Título</label>
                <input
                  type="text"
                  required
                  value={editingItem.titulo}
                  onChange={(e) => setEditingItem({ ...editingItem, titulo: e.target.value })}
                />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                <label>URL Original (Link Público)</label>
                <input
                  type="text"
                  required
                  value={editingItem.url_original || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, url_original: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Categoria</label>
                <select
                  value={editingItem.categoria}
                  onChange={(e) => setEditingItem({ ...editingItem, categoria: e.target.value })}
                >
                  <option value="Trabalhista">Trabalhista</option>
                  <option value="Família">Família</option>
                  <option value="Civil">Civil</option>
                  <option value="Previdenciário">Previdenciário</option>
                  <option value="Tributário">Tributário</option>
                  <option value="Consumidor">Consumidor</option>
                  <option value="Criminal">Criminal</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Fonte</label>
                <input
                  type="text"
                  required
                  value={editingItem.fonte}
                  onChange={(e) => setEditingItem({ ...editingItem, fonte: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Cidade</label>
                <input
                  type="text"
                  value={editingItem.cidade || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, cidade: e.target.value })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Estado</label>
                <input
                  type="text"
                  maxLength={2}
                  value={editingItem.estado || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, estado: e.target.value.toUpperCase() })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editingItem.score_intencao}
                  onChange={(e) => setEditingItem({ ...editingItem, score_intencao: parseInt(e.target.value) })}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Urgência</label>
                <select
                  value={editingItem.urgencia}
                  onChange={(e) => setEditingItem({ ...editingItem, urgencia: e.target.value })}
                >
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                <label>Trecho Público (max 500 chars)</label>
                <textarea
                  maxLength={500}
                  rows={2}
                  value={editingItem.trecho_publico || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, trecho_publico: e.target.value })}
                />
              </div>
              <div className={styles.formGroup} style={{ gridColumn: "span 2" }}>
                <label>Resumo IA</label>
                <textarea
                  rows={2}
                  value={editingItem.resumo_ia || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, resumo_ia: e.target.value })}
                />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "14px" }}>
              <button type="button" onClick={() => setEditingItem(null)} className={styles.cancelBtn}>
                Cancelar
              </button>
              <button type="submit" className={styles.saveBtn}>
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
