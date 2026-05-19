"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Building, 
  Plus, 
  Search, 
  Trash2, 
  FolderOpen, 
  Check, 
  X, 
  Save, 
  UserPlus, 
  Database, 
  Cpu, 
  Bell, 
  Eye, 
  Users,
  Scale,
  Coins
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./EscritoriosAdmin.module.css";

const AREAS_OPTION = [
  "Civil", "Penal", "Trabalhista", "Tributário", "Previdenciário", 
  "Família", "Consumidor", "Imobiliário", "Digital", "Empresarial"
];

const ESTADOS_BRASIL = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", 
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const formatCNPJ = (value) => {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 14);
  if (limited.length <= 2) return limited;
  if (limited.length <= 5) return `${limited.slice(0, 2)}.${limited.slice(2)}`;
  if (limited.length <= 8) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5)}`;
  if (limited.length <= 12) return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8)}`;
  return `${limited.slice(0, 2)}.${limited.slice(2, 5)}.${limited.slice(5, 8)}/${limited.slice(8, 12)}-${limited.slice(12)}`;
};

const formatCEP = (value) => {
  const digits = value.replace(/\D/g, "");
  const limited = digits.slice(0, 8);
  if (limited.length <= 5) return limited;
  return `${limited.slice(0, 5)}-${limited.slice(5)}`;
};

const getPlanDisplayName = (plano) => {
  if (!plano) return "Enterprise Start";
  const names = {
    start: "Enterprise Start",
    start_7: "Enterprise Start 7 dias",
    start_15: "Enterprise Start 15 dias",
    start_30: "Enterprise Start 30 dias (R$ 590,00)",
    pro: "Enterprise Pro",
    pro_7: "Enterprise Pro 7 dias",
    pro_15: "Enterprise Pro 15 dias",
    pro_30: "Enterprise Pro 30 dias (R$ 700,00)",
    pro_plus: "Enterprise Pro+",
    pro_plus_7: "Enterprise Pro+ 7 dias",
    pro_plus_15: "Enterprise Pro+ 15 dias",
    pro_plus_30: "Enterprise Pro+ 30 dias (R$ 950,00)",
  };
  return names[plano] || "Enterprise Start";
};

export default function AdminEscritoriosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [escritorios, setEscritorios] = useState([]);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [logoType, setLogoType] = useState("url"); // "url" ou "upload"
  const [selectedOffice, setSelectedOffice] = useState(null); // Dossier/Pasta ativa
  const [dossierTab, setDossierTab] = useState("geral"); // "geral", "limites", "funcionarios"
  
  // Associated staff state
  const [funcionarios, setFuncionarios] = useState([]);
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);

  // New Office form state
  const [newOffice, setNewOffice] = useState({
    nome: "",
    cnpj: "",
    max_advogados: 10,
    max_estagiarios: 5,
    endereco: "",
    cidade_estado: "",
    cep: "",
    areas_atuacao: [],
    estados_atendidos: ["Todo o Território Brasileiro"],
    nome_responsavel: "",
    logo_url: "",
    email: "",
    senha: "",
    plano: "start"
  });

  // New Staff form state
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: "",
    oab: "",
    estado: "SP",
    cargo: "advogado", // 'advogado' ou 'estagiario'
    senha: ""
  });

  // Limits adjustment/bonus state
  const [limitsEdit, setLimitsEdit] = useState({
    storage_mb: 256000,
    creditos_ia: 1500,
    notificacoes: 50,
    osint: 15,
    oab_sinc: 0
  });

  // Load offices
  const loadEscritorios = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/escritorios", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Não autorizado");
        router.replace("/dashboard/cliente");
        return;
      }
      setEscritorios(data.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar escritórios.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEscritorios();
  }, []);

  // Filtered offices list
  const filteredEscritorios = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return escritorios;
    return escritorios.filter(e => 
      String(e.nome || "").toLowerCase().includes(term) ||
      String(e.cnpj || "").toLowerCase().includes(term) ||
      String(e.nome_responsavel || "").toLowerCase().includes(term)
    );
  }, [escritorios, search]);

  // Load associated staff
  const loadFuncionarios = async (escritorioId) => {
    try {
      setLoadingFuncionarios(true);
      const res = await fetch(`/api/admin/escritorios/funcionarios?escritorioId=${escritorioId}`);
      const data = await res.json();
      if (data.success) {
        setFuncionarios(data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar funcionários do escritório");
    } finally {
      setLoadingFuncionarios(false);
    }
  };

  // Open Dossier/Folder View
  const handleOpenDossier = (office) => {
    setSelectedOffice(office);
    setLimitsEdit(office.limites || {
      storage_mb: 256000,
      creditos_ia: 1500,
      notificacoes: 50,
      osint: 15,
      oab_sinc: 0
    });
    setDossierTab("geral");
    loadFuncionarios(office.id);
  };

  // Handle register submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/escritorios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOffice)
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Erro ao cadastrar escritório");
        return;
      }

      toast.success(data.message || "Escritório cadastrado com sucesso!");
      setIsRegisterOpen(false);
      // Reset form
      setNewOffice({
        nome: "",
        cnpj: "",
        max_advogados: 10,
        max_estagiarios: 5,
        endereco: "",
        cidade_estado: "",
        cep: "",
        areas_atuacao: [],
        estados_atendidos: ["Todo o Território Brasileiro"],
        nome_responsavel: "",
        logo_url: "",
        email: "",
        senha: "",
        plano: "start"
      });
      loadEscritorios();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar requisição");
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem da logo deve ter no máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewOffice(prev => ({ ...prev, logo_url: reader.result }));
      toast.success("Logo carregada localmente com sucesso!");
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo de imagem.");
    };
    reader.readAsDataURL(file);
  };

  // Handle limits save (bonuses)
  const handleSaveLimits = async () => {
    if (!selectedOffice) return;
    try {
      const res = await fetch("/api/admin/escritorios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOffice.id,
          action: "UPDATE_LIMITS",
          value: limitsEdit
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Erro ao atualizar limites");
        return;
      }

      toast.success("Bônus e Limites salvos com sucesso!");
      setSelectedOffice(data.data);
      loadEscritorios();
    } catch (err) {
      console.error(err);
      toast.error("Erro de rede ao salvar limites");
    }
  };

  const handleUpdatePlan = async (newPlan) => {
    if (!selectedOffice) return;
    try {
      const res = await fetch("/api/admin/escritorios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOffice.id,
          action: "UPDATE_PLAN",
          value: newPlan
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Erro ao atualizar plano");
        return;
      }
      toast.success("Plano atualizado com sucesso!");
      setSelectedOffice(data.data);
      setLimitsEdit(data.data.limites || {
        storage_mb: 256000,
        creditos_ia: 1500,
        notificacoes: 50,
        osint: 15,
        oab_sinc: 0
      });
      loadEscritorios();
    } catch (err) {
      console.error(err);
      toast.error("Erro de rede ao atualizar plano");
    }
  };

  const handleUpdateBalance = async (newBalance) => {
    if (!selectedOffice) return;
    try {
      const val = Number(newBalance) || 0;
      const res = await fetch("/api/admin/escritorios", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedOffice.id,
          action: "UPDATE_GENERAL",
          value: { balance: val }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Erro ao atualizar saldo de Juris");
        return;
      }
      toast.success("Saldo de Juris atualizado com sucesso!");
      setSelectedOffice(data.data);
      loadEscritorios();
    } catch (err) {
      console.error(err);
      toast.error("Erro de rede ao atualizar saldo");
    }
  };

  // Handle adding a new associated staff member
  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    if (!selectedOffice) return;
    try {
      const res = await fetch("/api/admin/escritorios/funcionarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          escritorioId: selectedOffice.id,
          ...newStaff
        })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Erro ao adicionar funcionário");
        return;
      }

      toast.success(data.message || "Funcionário adicionado com sucesso!");
      setIsAddStaffOpen(false);
      // Reset form
      setNewStaff({
        name: "",
        email: "",
        phone: "",
        oab: "",
        estado: "SP",
        cargo: "advogado",
        senha: ""
      });
      loadFuncionarios(selectedOffice.id);
    } catch (err) {
      console.error(err);
      toast.error("Erro de rede ao adicionar funcionário");
    }
  };

  // Delete office
  const handleDeleteOffice = async (officeId) => {
    if (!confirm("Tem certeza que deseja EXCLUIR este escritório? Todos os advogados vinculados serão desassociados e perderão os benefícios do plano.")) return;
    try {
      const res = await fetch(`/api/admin/escritorios?id=${officeId}`, {
        method: "DELETE"
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Erro ao excluir escritório");
        return;
      }

      toast.success("Escritório excluído!");
      if (selectedOffice?.id === officeId) {
        setSelectedOffice(null);
      }
      loadEscritorios();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir escritório");
    }
  };

  return (
    <div className={styles.page}>
      
      {/* HEADER PRINCIPAL */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} /> Voltar ao Painel
          </Link>
          <h1>
            <Building size={24} color="#00b4d8" /> Módulo de Escritórios Enterprise
          </h1>
        </div>
        {!selectedOffice && (
          <button className={styles.registerBtn} onClick={() => setIsRegisterOpen(true)}>
            <Plus size={18} /> Adicionar Novo Escritório
          </button>
        )}
      </div>

      {/* VISTA DA PASTA DO ESCRITÓRIO (DOSSIER) CASO SELECIONADA */}
      {selectedOffice ? (
        <div className={styles.dossierContainer}>
          {/* Header do Dossiê */}
          <div className={styles.dossierHeader}>
            <div className={styles.dossierHeaderLeft}>
              <div className={styles.officeLogo}>
                {selectedOffice.logo_url ? (
                  <img src={selectedOffice.logo_url} alt={selectedOffice.nome} />
                ) : (
                  selectedOffice.nome.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h2 className={styles.dossierTitle}>{selectedOffice.nome}</h2>
                <div className={styles.dossierSubtitle}>
                  <span><strong>CNPJ:</strong> {selectedOffice.cnpj}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <strong>Plano:</strong> 
                    <select
                      value={selectedOffice.plano}
                      onChange={(e) => handleUpdatePlan(e.target.value)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        padding: "2px 6px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        outline: "none"
                      }}
                    >
                      <option value="start" style={{ background: "#111" }}>Enterprise Start (R$ 590,00)</option>
                      <option value="start_7" style={{ background: "#111" }}>Enterprise Start 7 dias</option>
                      <option value="start_15" style={{ background: "#111" }}>Enterprise Start 15 dias</option>
                      <option value="start_30" style={{ background: "#111" }}>Enterprise Start 30 dias (R$ 590,00)</option>
                      
                      <option value="pro" style={{ background: "#111" }}>Enterprise Pro (R$ 700,00)</option>
                      <option value="pro_7" style={{ background: "#111" }}>Enterprise Pro 7 dias</option>
                      <option value="pro_15" style={{ background: "#111" }}>Enterprise Pro 15 dias</option>
                      <option value="pro_30" style={{ background: "#111" }}>Enterprise Pro 30 dias (R$ 700,00)</option>
                      
                      <option value="pro_plus" style={{ background: "#111" }}>Enterprise Pro+ (R$ 950,00)</option>
                      <option value="pro_plus_7" style={{ background: "#111" }}>Enterprise Pro+ 7 dias</option>
                      <option value="pro_plus_15" style={{ background: "#111" }}>Enterprise Pro+ 15 dias</option>
                      <option value="pro_plus_30" style={{ background: "#111" }}>Enterprise Pro+ 30 dias (R$ 950,00)</option>
                    </select>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "12px" }}>
                    <Coins size={14} color="var(--color-gold)" />
                    <strong>Juris do Escritório:</strong>
                    <input
                      type="number"
                      value={selectedOffice.balance || 0}
                      onChange={(e) => handleUpdateBalance(e.target.value)}
                      style={{
                        width: "70px",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        borderRadius: "6px",
                        color: "#fff",
                        padding: "2px 6px",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        outline: "none",
                        textAlign: "center"
                      }}
                    />
                  </span>
                </div>
              </div>
            </div>
            <button className={styles.closeDossierBtn} onClick={() => setSelectedOffice(null)}>
              Fechar Pasta
            </button>
          </div>

          {/* Abas do Dossiê */}
          <div className={styles.dossierTabs}>
            <button 
              className={`${styles.dossierTab} ${dossierTab === "geral" ? styles.activeDossierTab : ""}`}
              onClick={() => setDossierTab("geral")}
            >
              Ficha do Escritório
            </button>
            <button 
              className={`${styles.dossierTab} ${dossierTab === "limites" ? styles.activeDossierTab : ""}`}
              onClick={() => setDossierTab("limites")}
            >
              Limites & Bônus de IA
            </button>
            <button 
              className={`${styles.dossierTab} ${dossierTab === "funcionarios" ? styles.activeDossierTab : ""}`}
              onClick={() => setDossierTab("funcionarios")}
            >
              Advogados & Estagiários
            </button>
          </div>

          {/* Conteúdo das Abas */}
          <div className={styles.dossierContent}>
            
            {/* 1. ABA GERAL */}
            {dossierTab === "geral" && (
              <div className={styles.generalTabContent}>
                <div className={styles.generalPanel}>
                  <h4>Dados Operacionais</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Nome do Responsável</span>
                    <span className={styles.detailValue}>{selectedOffice.nome_responsavel}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Email de Login/Contato</span>
                    <span className={styles.detailValue}>{selectedOffice.email}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Capacidade Máxima Contratada</span>
                    <span className={styles.detailValue}>
                      Até {selectedOffice.max_advogados} Advogados & {selectedOffice.max_estagiarios} Estagiários
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>CEP</span>
                    <span className={styles.detailValue}>{selectedOffice.cep || "Não informado"}</span>
                  </div>
                </div>

                <div className={styles.generalPanel}>
                  <h4>Especialidades & Atuação</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Endereço Completo</span>
                    <span className={styles.detailValue}>
                      {selectedOffice.endereco || "Não informado"} - {selectedOffice.cidade_estado || ""}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Áreas de Atuação</span>
                    <div className={styles.areasGrid}>
                      {selectedOffice.areas_atuacao && selectedOffice.areas_atuacao.length > 0 ? (
                        selectedOffice.areas_atuacao.map((area, idx) => (
                          <span key={idx} className={styles.areaTag}>{area}</span>
                        ))
                      ) : (
                        <span className={styles.detailValue}>Nenhuma selecionada</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Estados Atendidos</span>
                    <div className={styles.areasGrid}>
                      {selectedOffice.estados_atendidos && selectedOffice.estados_atendidos.length > 0 ? (
                        selectedOffice.estados_atendidos.map((estado, idx) => (
                          <span key={idx} className={styles.areaTag} style={{ borderColor: "#00b4d8", color: "#00b4d8" }}>{estado}</span>
                        ))
                      ) : (
                        <span className={styles.detailValue}>Nenhum</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ABA LIMITES & BÔNUS */}
            {dossierTab === "limites" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#9ca3af" }}>
                  Abaixo você pode visualizar os limites de uso contratados pelo escritório. Como administrador do SocialJurídico, você tem o poder de <strong>aumentar estes limites livremente para dar bônus e vantagens</strong> ao cliente.
                </p>

                <div className={styles.limitsGrid}>
                  <div className={styles.limitCard}>
                    <span className={styles.limitCardTitle}><Database size={16} color="#00b4d8" style={{ marginBottom: "-3px" }} /> Armazenamento (MB)</span>
                    <span className={styles.limitCardValue}>
                      {limitsEdit.storage_mb >= 999999 ? "1 TB (Ilimitado)" : `${Math.floor(limitsEdit.storage_mb / 1024)} GB`}
                    </span>
                    <input 
                      type="number"
                      className={styles.limitBonusInput}
                      value={limitsEdit.storage_mb}
                      onChange={(e) => setLimitsEdit({ ...limitsEdit, storage_mb: Number(e.target.value) })}
                      placeholder="Modificar MB"
                    />
                  </div>

                  <div className={styles.limitCard}>
                    <span className={styles.limitCardTitle}><Cpu size={16} color="#eab308" style={{ marginBottom: "-3px" }} /> Créditos de IA (mês)</span>
                    <span className={styles.limitCardValue}>
                      {limitsEdit.creditos_ia >= 999999 ? "Ilimitado" : `${limitsEdit.creditos_ia} reqs`}
                    </span>
                    <input 
                      type="number"
                      className={styles.limitBonusInput}
                      value={limitsEdit.creditos_ia}
                      onChange={(e) => setLimitsEdit({ ...limitsEdit, creditos_ia: Number(e.target.value) })}
                      placeholder="Modificar requisições"
                    />
                  </div>

                  <div className={styles.limitCard}>
                    <span className={styles.limitCardTitle}><Bell size={16} color="#10b981" style={{ marginBottom: "-3px" }} /> Notificações Extrajudiciais</span>
                    <span className={styles.limitCardValue}>
                      {limitsEdit.notificacoes >= 999999 ? "Ilimitado" : `${limitsEdit.notificacoes} /mês`}
                    </span>
                    <input 
                      type="number"
                      className={styles.limitBonusInput}
                      value={limitsEdit.notificacoes}
                      onChange={(e) => setLimitsEdit({ ...limitsEdit, notificacoes: Number(e.target.value) })}
                      placeholder="Modificar cotas"
                    />
                  </div>

                  <div className={styles.limitCard}>
                    <span className={styles.limitCardTitle}><Search size={16} color="#8b5cf6" style={{ marginBottom: "-3px" }} /> Buscas OSINT</span>
                    <span className={styles.limitCardValue}>
                      {limitsEdit.osint >= 999999 ? "Ilimitado" : `${limitsEdit.osint} /mês`}
                    </span>
                    <input 
                      type="number"
                      className={styles.limitBonusInput}
                      value={limitsEdit.osint}
                      onChange={(e) => setLimitsEdit({ ...limitsEdit, osint: Number(e.target.value) })}
                      placeholder="Modificar buscas"
                    />
                  </div>

                  <div className={styles.limitCard}>
                    <span className={styles.limitCardTitle}><Scale size={16} color="#3b82f6" style={{ marginBottom: "-3px" }} /> OAB Sinc (Processos)</span>
                    <span className={styles.limitCardValue}>
                      {limitsEdit.oab_sinc} /mês
                    </span>
                    <input 
                      type="number"
                      className={styles.limitBonusInput}
                      value={limitsEdit.oab_sinc}
                      onChange={(e) => setLimitsEdit({ ...limitsEdit, oab_sinc: Number(e.target.value) })}
                      placeholder="Modificar limites"
                    />
                  </div>
                </div>

                <button className={styles.saveLimitsBtn} onClick={handleSaveLimits}>
                  <Save size={18} /> Salvar Alterações e Dar Bônus
                </button>
              </div>
            )}

            {/* 3. ABA FUNCIONÁRIOS / STAFF */}
            {dossierTab === "funcionarios" && (
              <div>
                <div className={styles.staffHeader}>
                  <div>
                    <h3>Membros Cadastrados</h3>
                    <span className={styles.staffCapacity}>
                      Advogados: {funcionarios.filter(f => f.cargo === "advogado").length} / {selectedOffice.max_advogados} | 
                      Estagiários: {funcionarios.filter(f => f.cargo === "estagiario").length} / {selectedOffice.max_estagiarios}
                    </span>
                  </div>
                  <button className={styles.addStaffBtn} onClick={() => setIsAddStaffOpen(true)}>
                    <UserPlus size={16} /> Adicionar Membro
                  </button>
                </div>

                {loadingFuncionarios ? (
                  <div className={styles.loading}>Carregando funcionários associados...</div>
                ) : funcionarios.length === 0 ? (
                  <div className={styles.empty}>Nenhum membro cadastrado para este escritório até o momento.</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Email</th>
                          <th>Telefone</th>
                          <th>Cargo</th>
                          <th>OAB</th>
                          <th>Cadastro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {funcionarios.map((f) => (
                          <tr key={f.id}>
                            <td style={{ fontWeight: 600 }}>{f.name}</td>
                            <td>{f.email}</td>
                            <td>{f.phone || "Não informado"}</td>
                            <td>
                              <span className={`${styles.staffRoleBadge} ${
                                f.cargo === "estagiario" ? styles.badgeIntern : styles.badgeLawyer
                              }`}>
                                {f.cargo === "estagiario" ? "Estagiário" : "Advogado"}
                              </span>
                            </td>
                            <td>{f.oab ? `${f.oab}/${f.estado}` : "Não possui"}</td>
                            <td>{new Date(f.created_at).toLocaleDateString("pt-BR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      ) : (
        <>
          {/* BUSCA */}
          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} size={18} />
            <input 
              type="text"
              className={styles.searchInput}
              placeholder="Buscar escritório por nome, CNPJ ou responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* LISTA / TABELA PRINCIPAL */}
          {loading ? (
            <div className={styles.loading}>Buscando escritórios no banco de dados...</div>
          ) : filteredEscritorios.length === 0 ? (
            <div className={styles.empty}>Nenhum escritório cadastrado ou encontrado.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Escritório</th>
                    <th>CNPJ</th>
                    <th>Responsável</th>
                    <th>Plano</th>
                    <th>Membros</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEscritorios.map((esc) => (
                    <tr key={esc.id}>
                      <td>
                        <div className={styles.officeNameCell}>
                          <div className={styles.officeLogo}>
                            {esc.logo_url ? (
                              <img src={esc.logo_url} alt={esc.nome} />
                            ) : (
                              esc.nome.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>{esc.nome}</span>
                            <div style={{ fontSize: "0.78rem", color: "#9ca3af", marginTop: "2px" }}>{esc.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{esc.cnpj}</td>
                      <td>{esc.nome_responsavel}</td>
                      <td>
                        <span className={`${styles.planBadge} ${
                          String(esc.plano || "").startsWith("pro_plus") ? styles.badgeProPlus :
                          String(esc.plano || "").startsWith("pro") ? styles.badgePro : styles.badgeStart
                        }`}>
                          {getPlanDisplayName(esc.plano)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                          Max: {esc.max_advogados} Adv / {esc.max_estagiarios} Est
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <button className={styles.folderBtn} onClick={() => handleOpenDossier(esc)}>
                          <FolderOpen size={16} /> Abrir Pasta
                        </button>
                        <button className={styles.deleteBtn} onClick={() => handleDeleteOffice(esc.id)}>
                          <Trash2 size={16} /> Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* MODAL DE CADASTRO DE NOVO ESCRITÓRIO */}
      {isRegisterOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h3>Cadastrar Novo Escritório Enterprise</h3>
            <form onSubmit={handleRegisterSubmit}>
              <div className={styles.formGrid}>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nome do Escritório</label>
                  <input 
                    type="text"
                    required
                    className={styles.input}
                    placeholder="Advocacia Rocha & Associados"
                    value={newOffice.nome}
                    onChange={(e) => setNewOffice({ ...newOffice, nome: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>CNPJ do Escritório</label>
                  <input 
                    type="text"
                    required
                    className={styles.input}
                    placeholder="00.000.000/0001-00"
                    maxLength={18}
                    value={newOffice.cnpj}
                    onChange={(e) => setNewOffice({ ...newOffice, cnpj: formatCNPJ(e.target.value) })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Nome do Responsável</label>
                  <input 
                    type="text"
                    required
                    className={styles.input}
                    placeholder="Dr. Carlos Rocha"
                    value={newOffice.nome_responsavel}
                    onChange={(e) => setNewOffice({ ...newOffice, nome_responsavel: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label className={styles.label}>Logo do Escritório</label>
                    <span 
                      style={{ fontSize: "0.75rem", color: "#00b4d8", cursor: "pointer", fontWeight: "bold" }}
                      onClick={() => setLogoType(logoType === "url" ? "upload" : "url")}
                    >
                      {logoType === "url" ? "Usar Upload Local" : "Usar URL"}
                    </span>
                  </div>
                  {logoType === "url" ? (
                    <input 
                      type="text"
                      className={styles.input}
                      placeholder="https://exemplo.com/logo.png"
                      value={newOffice.logo_url}
                      onChange={(e) => setNewOffice({ ...newOffice, logo_url: e.target.value })}
                    />
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <input 
                        type="file"
                        accept="image/*"
                        className={styles.input}
                        style={{ padding: "6px" }}
                        onChange={handleLogoUpload}
                      />
                      {newOffice.logo_url && (
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: "bold" }}>✓ Imagem carregada!</span>
                          <button 
                            type="button" 
                            style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}
                            onClick={() => setNewOffice({ ...newOffice, logo_url: "" })}
                          >
                            Limpar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email de Login/Contato</label>
                  <input 
                    type="email"
                    required
                    className={styles.input}
                    placeholder="contato@rochaadv.com"
                    value={newOffice.email}
                    onChange={(e) => setNewOffice({ ...newOffice, email: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Senha de Login</label>
                  <input 
                    type="password"
                    required
                    className={styles.input}
                    placeholder="Criar senha de login"
                    value={newOffice.senha}
                    onChange={(e) => setNewOffice({ ...newOffice, senha: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Plano Inicial</label>
                  <select 
                    className={styles.select}
                    value={newOffice.plano}
                    onChange={(e) => {
                      const pl = e.target.value;
                      let advs = 10;
                      let ests = 5;
                      if (pl.startsWith("pro_plus")) { advs = 20; ests = 10; }
                      else if (pl.startsWith("pro")) { advs = 15; ests = 7; }
                      setNewOffice({ ...newOffice, plano: pl, max_advogados: advs, max_estagiarios: ests });
                    }}
                  >
                    <option value="start">Enterprise Start (R$ 590,00)</option>
                    <option value="start_7">Enterprise Start 7 dias</option>
                    <option value="start_15">Enterprise Start 15 dias</option>
                    <option value="start_30">Enterprise Start 30 dias (R$ 590,00)</option>
                    
                    <option value="pro">Enterprise Pro (R$ 700,00)</option>
                    <option value="pro_7">Enterprise Pro 7 dias</option>
                    <option value="pro_15">Enterprise Pro 15 dias</option>
                    <option value="pro_30">Enterprise Pro 30 dias (R$ 700,00)</option>
                    
                    <option value="pro_plus">Enterprise Pro+ (R$ 950,00)</option>
                    <option value="pro_plus_7">Enterprise Pro+ 7 dias</option>
                    <option value="pro_plus_15">Enterprise Pro+ 15 dias</option>
                    <option value="pro_plus_30">Enterprise Pro+ 30 dias (R$ 950,00)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Limites de Usuários</label>
                  <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Max Advs</span>
                      <input 
                        type="number" 
                        max="20"
                        className={styles.input} 
                        style={{ padding: "6px" }} 
                        value={newOffice.max_advogados} 
                        onChange={(e) => setNewOffice({ ...newOffice, max_advogados: Number(e.target.value) })}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Max Estags</span>
                      <input 
                        type="number" 
                        max="10"
                        className={styles.input} 
                        style={{ padding: "6px" }} 
                        value={newOffice.max_estagiarios} 
                        onChange={(e) => setNewOffice({ ...newOffice, max_estagiarios: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>CEP</label>
                  <input 
                    type="text"
                    className={styles.input}
                    placeholder="00000-000"
                    maxLength={9}
                    value={newOffice.cep}
                    onChange={(e) => setNewOffice({ ...newOffice, cep: formatCEP(e.target.value) })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Cidade/Estado</label>
                  <input 
                    type="text"
                    className={styles.input}
                    placeholder="São Paulo/SP"
                    value={newOffice.cidade_estado}
                    onChange={(e) => setNewOffice({ ...newOffice, cidade_estado: e.target.value })}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Endereço Completo</label>
                  <input 
                    type="text"
                    className={styles.input}
                    placeholder="Av. Paulista, 1000, Bloco A, Conj. 100"
                    value={newOffice.endereco}
                    onChange={(e) => setNewOffice({ ...newOffice, endereco: e.target.value })}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Áreas de Atuação</label>
                  <div className={styles.checkboxGrid}>
                    {AREAS_OPTION.map((area) => (
                      <label key={area} className={styles.checkboxLabel}>
                        <input 
                          type="checkbox"
                          className={styles.checkbox}
                          checked={newOffice.areas_atuacao.includes(area)}
                          onChange={(e) => {
                            let list = [...newOffice.areas_atuacao];
                            if (e.target.checked) {
                              list.push(area);
                            } else {
                              list = list.filter(a => a !== area);
                            }
                            setNewOffice({ ...newOffice, areas_atuacao: list });
                          }}
                        />
                        {area}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroupFull}>
                  <label className={styles.label}>Estados atendidos</label>
                  <select 
                    className={styles.select}
                    value={Array.isArray(newOffice.estados_atendidos) ? newOffice.estados_atendidos[0] : newOffice.estados_atendidos}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewOffice({ 
                        ...newOffice, 
                        estados_atendidos: val === "Nacional" ? ["Todo o Território Brasileiro"] : [val] 
                      });
                    }}
                  >
                    <option value="Nacional">Todo o Território Brasileiro</option>
                    {ESTADOS_BRASIL.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsRegisterOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  Cadastrar Escritório
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CADASTRO DE FUNCIONÁRIO (DENTRO DO DOSSIÊ) */}
      {isAddStaffOpen && selectedOffice && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard} style={{ maxWidth: "460px" }}>
            <h3>Cadastrar Novo Membro - {selectedOffice.nome}</h3>
            <form onSubmit={handleAddStaffSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Nome Completo</label>
                  <input 
                    type="text"
                    required
                    className={styles.input}
                    placeholder="Dra. Mariana Silva"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Email de Login</label>
                  <input 
                    type="email"
                    required
                    className={styles.input}
                    placeholder="mariana@rochaadv.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Senha de Login</label>
                  <input 
                    type="password"
                    required
                    className={styles.input}
                    placeholder="Criar senha de login"
                    value={newStaff.senha}
                    onChange={(e) => setNewStaff({ ...newStaff, senha: e.target.value })}
                  />
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>Cargo</label>
                    <select 
                      className={styles.select}
                      value={newStaff.cargo}
                      onChange={(e) => setNewStaff({ ...newStaff, cargo: e.target.value })}
                    >
                      <option value="advogado">Advogado</option>
                      <option value="estagiario">Estagiário</option>
                    </select>
                  </div>

                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>OAB (Apenas Advogado)</label>
                    <input 
                      type="text"
                      className={styles.input}
                      placeholder="123456"
                      value={newStaff.oab}
                      onChange={(e) => setNewStaff({ ...newStaff, oab: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <div className={styles.formGroup} style={{ flex: 1.5 }}>
                    <label className={styles.label}>Telefone/Whatsapp</label>
                    <input 
                      type="text"
                      className={styles.input}
                      placeholder="(11) 99999-9999"
                      value={newStaff.phone}
                      onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                    />
                  </div>

                  <div className={styles.formGroup} style={{ flex: 1 }}>
                    <label className={styles.label}>UF da OAB</label>
                    <select 
                      className={styles.select}
                      value={newStaff.estado}
                      onChange={(e) => setNewStaff({ ...newStaff, estado: e.target.value })}
                    >
                      {ESTADOS_BRASIL.map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsAddStaffOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn}>
                  Cadastrar e Associar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
