"use client";

import React, { useState, useEffect } from "react";
import { 
  Lock, 
  MonitorSmartphone, 
  FolderOpen, 
  Trash2, 
  Bell, 
  BellOff, 
  FolderDown, 
  Check, 
  X, 
  BookOpen, 
  FileText, 
  AlertTriangle,
  ExternalLink,
  Users,
  Sparkles
} from "lucide-react";
import { useLawyerSession } from "../../LawyerSessionContext";
import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import toast from "react-hot-toast";
import styles from "./Monitoramento.module.css";

export default function MonitoramentoDashboard() {
  const { profileData, openPlansModal } = useLawyerSession();
  
  // Access control check
  const isPro = String(profileData?.plan_type || "").toUpperCase() === "PRO";

  // State definitions
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("processos");
  const [wizardStep, setWizardStep] = useState(null);
  
  // Database/API values
  const [oabProcessosBaixados, setOabProcessosBaixados] = useState(false);
  const [oabMonitoramentoCitacoes, setOabMonitoramentoCitacoes] = useState(false);
  const [oabNumber, setOabNumber] = useState("");
  const [ufState, setUfState] = useState("");
  const [processes, setProcesses] = useState([]);
  const [citations, setCitations] = useState([]);

  // Modal setup
  const [showImportModal, setShowImportModal] = useState(null); // process object if open
  const [importMode, setImportMode] = useState("new"); // "new" or "existing"
  const [crmClients, setCrmClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientCpfCnpj, setNewClientCpfCnpj] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [importing, setImporting] = useState(false);

  // Mark citations read tracker
  const [markingReadId, setMarkingReadId] = useState(null);

  // Citation detail modal
  const [showCitationModal, setShowCitationModal] = useState(null); // citation object if open

  // Load monitorings and OAB status
  const loadData = async () => {
    if (!isPro) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/advogado/monitoramento", { cache: "no-store" });
      const json = await res.json();

      if (json.success) {
        setOabProcessosBaixados(json.oab_processos_baixados);
        setOabMonitoramentoCitacoes(json.oab_monitoramento_citacoes);
        setOabNumber(json.oab);
        setUfState(json.uf);
        setProcesses(json.processes || []);
        setCitations(json.citations || []);

        // If processes not set up yet, show wizard step 1
        if (!json.oab_processos_baixados) {
          setWizardStep(1);
        } else {
          setWizardStep(null);
        }
      } else {
        toast.error(json.message || "Erro ao carregar dados do monitoramento.");
      }
    } catch (err) {
      console.error("Error loading monitorings:", err);
      toast.error("Erro de conexão ao carregar monitoramento.");
    } finally {
      setLoading(false);
    }
  };

  // Load CRM clients for dropdown selection
  const loadCrmClients = async () => {
    try {
      const res = await fetch("/api/advogado/clientes?pageSize=100", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setCrmClients(json.data || []);
        if (json.data && json.data.length > 0) {
          setSelectedClientId(json.data[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading CRM clients:", err);
    }
  };

  useEffect(() => {
    loadData();
    if (isPro) {
      loadCrmClients();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  // Handle choice in first configuration wizard
  const handleWizardChoice = async (choice) => {
    if (wizardStep === 1) {
      setSaving(true);
      try {
        const payload = { 
          baixar_processos: choice === "sim"
        };
        const res = await fetch("/api/advogado/monitoramento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.success) {
          setOabProcessosBaixados(choice === "sim");
          setWizardStep(2);
          if (choice === "sim") {
            toast.success("Iniciando a busca e download de seus processos. Continue respondendo...");
          }
        } else {
          toast.error(json.message || "Erro ao processar escolha.");
        }
      } catch (err) {
        console.error("Error saving step 1:", err);
        toast.error("Erro de conexão com o servidor.");
      } finally {
        setSaving(false);
      }
    } else if (wizardStep === 2) {
      setSaving(true);
      try {
        const payload = { 
          monitorar_citacoes: choice === "sim"
        };
        const res = await fetch("/api/advogado/monitoramento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        if (json.success) {
          setOabMonitoramentoCitacoes(choice === "sim");
          setWizardStep(null);
          toast.success("Configuração de monitoramento de OAB concluída!");
          // Reload all processes list and events
          loadData();
        } else {
          toast.error(json.message || "Erro ao processar escolha.");
        }
      } catch (err) {
        console.error("Error saving step 2:", err);
        toast.error("Erro de conexão com o servidor.");
      } finally {
        setSaving(false);
      }
    }
  };

  // Toggle monitoring status on a process
  const handleToggleMonitor = async (processItem) => {
    try {
      const res = await fetch("/api/advogado/monitoramento/processo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "monitorar",
          id: processItem.id,
          monitored: !processItem.monitored
        })
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message);
        setProcesses(prev => 
          prev.map(p => p.id === processItem.id ? { ...p, monitored: json.monitored } : p)
        );
      } else {
        toast.error(json.message || "Erro ao atualizar monitoramento.");
      }
    } catch (err) {
      console.error("Error toggling process monitoring:", err);
      toast.error("Erro de conexão ao alterar monitoramento.");
    }
  };

  // Delete/Remove process from OAB processes
  const handleDeleteProcess = async (processItem) => {
    if (!window.confirm("Deseja realmente remover este processo do painel de monitoramento OAB?")) {
      return;
    }

    try {
      const res = await fetch("/api/advogado/monitoramento/processo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "excluir",
          id: processItem.id
        })
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Processo removido com sucesso.");
        setProcesses(prev => prev.filter(p => p.id !== processItem.id));
      } else {
        toast.error(json.message || "Erro ao remover processo.");
      }
    } catch (err) {
      console.error("Error deleting process:", err);
      toast.error("Erro de conexão ao remover processo.");
    }
  };

  // Mark citation event as read
  const handleMarkCitationRead = async (citationId) => {
    setMarkingReadId(citationId);
    try {
      const res = await fetch("/api/advogado/monitoramento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "marcar_lido",
          id: citationId
        })
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Publicação marcada como lida.");
        // We can either remove it or update its status locally
        setCitations(prev => prev.filter(c => c.id !== citationId));
      } else {
        toast.error(json.message || "Erro ao marcar como lida.");
      }
    } catch (err) {
      console.error("Error marking citation read:", err);
      toast.error("Erro de conexão ao atualizar citação.");
    } finally {
      setMarkingReadId(null);
    }
  };

  // Open import modal and pre-fill details
  const openImportModal = (processItem) => {
    setShowImportModal(processItem);
    setImportMode("new");
    // Pre-fill fields with possible parties in metadata
    const metadata = processItem.metadata || {};
    const processData = (metadata.capa || metadata.partes) ? metadata : (metadata.data?.processo || metadata.data || metadata.processo || {});
    const partes = processData.partes || [];
    
    // Find a party that might be the client (e.g. polo ativo/principal)
    const possibleClient = partes.find(p => String(p.polo || "").toLowerCase().includes("ativo") || String(p.tipo_parte || "").toLowerCase().includes("autor")) || partes[0];
    
    setNewClientName(possibleClient?.nome || possibleClient?.name || "");
    setNewClientCpfCnpj(possibleClient?.documento || "");
    setNewClientEmail("");
    setNewClientPhone("");
  };

  // Execute import process to CRM
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!showImportModal) return;

    setImporting(true);
    try {
      const payload = {
        action: "importar",
        id: showImportModal.id,
        existingClientId: importMode === "existing" ? selectedClientId : null,
        clienteManual: importMode === "new" ? {
          nome: newClientName,
          cpfCnpj: newClientCpfCnpj,
          email: newClientEmail,
          phone: newClientPhone
        } : null
      };

      const res = await fetch("/api/advogado/monitoramento/processo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Processo importado com sucesso para o CRM!");
        // Update processes state locally to show as imported
        setProcesses(prev => 
          prev.map(p => p.id === showImportModal.id ? { ...p, imported: true } : p)
        );
        setShowImportModal(null);
      } else if (json.duplicate) {
        toast.error("Este processo já está cadastrado em seu CRM.");
        setProcesses(prev => 
          prev.map(p => p.id === showImportModal.id ? { ...p, imported: true } : p)
        );
        setShowImportModal(null);
      } else {
        toast.error(json.message || "Erro ao importar processo para o CRM.");
      }
    } catch (err) {
      console.error("Error importing process to CRM:", err);
      toast.error("Erro de conexão ao realizar importação.");
    } finally {
      setImporting(false);
    }
  };

  // Helper to highlight words like OAB or lawyer's name
  const highlightCitationsText = (text) => {
    if (!text) return "";
    
    // Create regex matching keywords
    const keywords = [];
    if (profileData?.name) keywords.push(profileData.name.trim());
    if (oabNumber) {
      keywords.push(oabNumber.trim());
      keywords.push(`${ufState}\\s*${oabNumber}`);
      keywords.push(`${oabNumber}\\s*${ufState}`);
    }

    if (keywords.length === 0) return text;

    const regexPattern = `(${keywords.map(kw => kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|")})`;
    const parts = text.split(new RegExp(regexPattern, "gi"));

    return parts.map((part, index) => {
      const isMatch = keywords.some(kw => {
        const cleanPart = part.toLowerCase().replace(/\s/g, "");
        const cleanKw = kw.toLowerCase().replace(/\s/g, "");
        return cleanPart.includes(cleanKw) || cleanKw.includes(cleanPart);
      });
      
      return isMatch ? (
        <span key={index} className={styles.highlight}>
          {part}
        </span>
      ) : (
        part
      );
    });
  };

  const modalMetadata = showImportModal?.metadata || {};
  const modalProcessData = (modalMetadata.capa || modalMetadata.partes) ? modalMetadata : (modalMetadata.data?.processo || modalMetadata.data || modalMetadata.processo || {});
  const modalParties = modalProcessData.partes || [];

  // Render Main Tabbed Dashboard UI
  return (
    <LawyerDashboardShell
      activeRoute="monitoramento"
      title="Monitoramento de OAB"
      subtitle="Gerencie processos e acompanhe citações nos diários oficiais vinculados à sua OAB"
      icon={Sparkles}
    >
      {!isPro && !loading ? (
        <div className={styles.lockedContainer}>
          <div className={styles.lockIconWrapper}>
            <Lock size={40} />
          </div>
          <h2 className={styles.lockedTitle}>Recurso Exclusivo do Plano PRO</h2>
          <p className={styles.lockedText}>
            O painel de <strong>Monitoramento de OAB</strong> permite baixar seus processos diretamente pelo número de sua OAB e acompanhar todas as citações e intimações publicadas nos diários oficiais com inteligência artificial.
          </p>
          <div className={styles.lockedBenefitsList}>
            <div className={styles.benefitItem}>
              <Check size={16} className={styles.benefitCheck} />
              <span>Baixar até 20 processos automaticamente</span>
            </div>
            <div className={styles.benefitItem}>
              <Check size={16} className={styles.benefitCheck} />
              <span>Monitoramento ativo de até 10 processos</span>
            </div>
            <div className={styles.benefitItem}>
              <Check size={16} className={styles.benefitCheck} />
              <span>Leitura automatizada do Diário Oficial (DJEN)</span>
            </div>
            <div className={styles.benefitItem}>
              <Check size={16} className={styles.benefitCheck} />
              <span>Cadastro instantâneo de partes no CRM</span>
            </div>
          </div>
          <button type="button" className={styles.upgradeBtn} onClick={openPlansModal}>
            Fazer Upgrade para Plano PRO
          </button>
        </div>
      ) : loading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p>Carregando ferramentas de monitoramento...</p>
        </div>
      ) : wizardStep !== null ? (
        <div className={styles.wizardCard}>
          <span className={styles.wizardEyebrow}>
            <Sparkles size={14} aria-hidden="true" />
            Configuração de OAB
          </span>
          {wizardStep === 1 && (
            <>
              <h2 className={styles.wizardTitle}>
                Deseja baixar seus processos cadastrados na OAB <span>{oabNumber ? `${oabNumber} - ${ufState}` : ""}</span>?
              </h2>
              <p className={styles.wizardSubtitle}>
                Ao selecionar sim, faremos uma busca automática em todos os tribunais do Brasil integrados ao DataJud e listaremos seus processos em pastas.
              </p>
              <div className={styles.wizardButtons}>
                <button 
                  type="button"
                  className={styles.wizardBtnYes} 
                  onClick={() => handleWizardChoice("sim")}
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Sim"}
                </button>
                <button 
                  type="button"
                  className={styles.wizardBtnNo} 
                  onClick={() => handleWizardChoice("nao")}
                  disabled={saving}
                >
                  Não
                </button>
              </div>
              <div className={styles.wizardProgress}>
                <div className={`${styles.progressDot} ${styles.progressDotActive}`}></div>
                <div className={styles.progressDot}></div>
              </div>
            </>
          )}

          {wizardStep === 2 && (
            <>
              <h2 className={styles.wizardTitle}>
                Deseja monitorar citações de sua OAB nos <span>diários oficiais</span>?
              </h2>
              <p className={styles.wizardSubtitle}>
                Acompanhe publicações e menções de seu nome e número de OAB nos diários de justiça de todo o país. Você receberá alertas em tempo real.
              </p>
              <div className={styles.wizardButtons}>
                <button 
                  type="button"
                  className={styles.wizardBtnYes} 
                  onClick={() => handleWizardChoice("sim")}
                  disabled={saving}
                >
                  {saving ? "Salvando..." : "Sim, monitorar"}
                </button>
                <button 
                  type="button"
                  className={styles.wizardBtnNo} 
                  onClick={() => handleWizardChoice("nao")}
                  disabled={saving}
                >
                  Não monitorar
                </button>
              </div>
              <div className={styles.wizardProgress}>
                <div className={styles.progressDot}></div>
                <div className={`${styles.progressDot} ${styles.progressDotActive}`}></div>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={styles.container}>
      
      {/* Header Info Banner */}
      <div className={styles.headerRow}>
        <div className={styles.oabBadge}>
          <MonitorSmartphone size={16} />
          <span>OAB vinculada: {oabNumber} - {ufState}</span>
        </div>
        {oabProcessosBaixados && processes.length === 0 && (
          <div className={styles.asyncStatusAlert}>
            <span className={styles.spinner} style={{ width: 14, height: 14, borderWidth: '2px' }}></span>
            <span className={styles.asyncStatusAlertIcon}>Buscando e baixando processos na OAB em segundo plano...</span>
          </div>
        )}
      </div>

      {/* Tabs selectors */}
      <div className={styles.tabHeader}>
        <button 
          className={`${styles.tabButton} ${activeTab === "processos" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("processos")}
        >
          Monitoramento de OAB ({processes.length})
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === "citacoes" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("citacoes")}
          disabled={!oabMonitoramentoCitacoes}
          style={!oabMonitoramentoCitacoes ? { opacity: 0.5, cursor: "not-allowed" } : {}}
          title={!oabMonitoramentoCitacoes ? "Ative o monitoramento de citações nas configurações" : ""}
        >
          Citações em Diários Oficiais ({citations.length})
        </button>
      </div>

      {/* Tab: Processes */}
      {activeTab === "processos" && (
        <div>
          {processes.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <FolderOpen size={48} />
              </div>
              <h3 style={{ color: '#ffffff', fontWeight: 600 }}>Nenhum processo localizado</h3>
              <p className={styles.emptyStateText}>
                {oabProcessosBaixados 
                  ? "Ainda estamos buscando processos no DataJud. Isso pode demorar alguns minutos. Atualize a página em instantes." 
                  : "Você optou por não baixar processos da OAB automaticamente nas perguntas iniciais."}
              </p>
            </div>
          ) : (
            <>
              <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginBottom: 12 }}>
                * Limite máximo de 10 processos monitorados simultaneamente. Exibindo {processes.filter(p => p.monitored).length}/10 ativos.
              </div>
              <div className={styles.processesGrid}>
                {processes.map(item => {
                  const metadata = item.metadata || {};
                  const processData = (metadata.capa || metadata.partes) ? metadata : (metadata.data?.processo || metadata.data || metadata.processo || {});
                  const capa = processData.capa || {};
                  
                  return (
                    <div key={item.id} className={styles.processCard}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div className={styles.processFolderIcon}>
                          <FolderOpen size={24} fill="currentColor" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className={styles.processCnj}>
                            {item.numero_cnj.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/, "$1-$2.$3.$4.$5.$6")}
                          </div>
                          <div className={styles.processDetails}>
                            <span><strong>Classe:</strong> {capa.classe || "Não identificada"}</span>
                            <span><strong>Órgão:</strong> {capa.orgao_julgador || "Não identificado"}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {item.monitored && <span className={`${styles.processBadge} ${styles.badgeMonitored}`}>Monitorado</span>}
                        {item.imported && <span className={`${styles.processBadge} ${styles.badgeImported}`}>No CRM</span>}
                      </div>

                      <div className={styles.cardActions}>
                        <button 
                          className={`${styles.btnAction} ${item.monitored ? styles.btnMonitorActive : styles.btnMonitor}`}
                          onClick={() => handleToggleMonitor(item)}
                          title="Monitorar processo nos diários e movimentações"
                        >
                          {item.monitored ? <BellOff size={14} /> : <Bell size={14} />}
                          <span>{item.monitored ? "Remover Alerta" : "Monitorar"}</span>
                        </button>
                        
                        {item.imported ? (
                          <div className={`${styles.btnAction} ${styles.btnImported}`} title="Processo já adicionado ao CRM">
                            <Check size={14} />
                            <span>No CRM</span>
                          </div>
                        ) : (
                          <button 
                            className={`${styles.btnAction} ${styles.btnImport}`}
                            onClick={() => openImportModal(item)}
                            title="Importar processo e criar cliente no CRM"
                          >
                            <FolderDown size={14} />
                            <span>Importar</span>
                          </button>
                        )}

                        <button 
                          className={styles.btnDelete}
                          onClick={() => handleDeleteProcess(item)}
                          title="Remover este processo"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab: Citations */}
      {activeTab === "citacoes" && (
        <div>
          {citations.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyStateIcon}>
                <BookOpen size={48} />
              </div>
              <h3 style={{ color: '#ffffff', fontWeight: 600 }}>Nenhuma citação localizada</h3>
              <p className={styles.emptyStateText}>
                Nenhuma publicação de diário oficial vinculada à sua OAB foi encontrada recentemente.
              </p>
            </div>
          ) : (
            <div className={styles.citationsList}>
              {citations.map(c => {
                const isUnread = !c.lido;
                const formattedDate = c.data_publicacao 
                  ? new Date(c.data_publicacao).toLocaleDateString("pt-BR") 
                  : "Data não identificada";

                return (
                  <div 
                    key={c.id} 
                    className={`${styles.citationCard} ${isUnread ? styles.citationCardUnread : ""} ${styles.citationCardClickable}`}
                    onClick={() => setShowCitationModal(c)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setShowCitationModal(c)}
                    aria-label={`Ver detalhes da citação do ${c.diario || 'Diário Oficial'}`}
                  >
                    <div className={styles.citationHeader}>
                      <div className={styles.citationMeta}>
                        <span className={styles.citationTag}>{c.diario || "Diário Oficial"}</span>
                        <span>Publicado em: {formattedDate}</span>
                      </div>
                      <div className={styles.citationCardActions}>
                        {isUnread && (
                          <button 
                            className={styles.btnMarkRead}
                            onClick={(e) => { e.stopPropagation(); handleMarkCitationRead(c.id); }}
                            disabled={markingReadId === c.id}
                            type="button"
                          >
                            {markingReadId === c.id ? "Marcando..." : "Marcar como lido"}
                          </button>
                        )}
                        <span className={styles.citationCardOpenHint}>
                          <ExternalLink size={13} />
                          Ver detalhes
                        </span>
                      </div>
                    </div>
                    
                    <div className={styles.citationExcerpt}>
                      {highlightCitationsText(c.trecho || c.excerpt || "")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Citation Detail Modal */}
      {showCitationModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCitationModal(null)}>
          <div className={styles.modalContent} style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#d4af37' }}>
                  <BookOpen size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                  Publicação em Diário Oficial
                </span>
                <h3 className={styles.modalTitle}>{showCitationModal.diario || "Diário Oficial"}</h3>
              </div>
              <button type="button" className={styles.modalClose} onClick={() => setShowCitationModal(null)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Meta info */}
              <div className={styles.citationDetailMeta}>
                <div className={styles.citationDetailMetaItem}>
                  <span className={styles.citationDetailMetaLabel}>Data de Publicação</span>
                  <span className={styles.citationDetailMetaValue}>
                    {showCitationModal.data_publicacao
                      ? new Date(showCitationModal.data_publicacao).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                      : "Não identificada"}
                  </span>
                </div>
                {showCitationModal.processo && (
                  <div className={styles.citationDetailMetaItem}>
                    <span className={styles.citationDetailMetaLabel}>Processo Vinculado</span>
                    <span className={styles.citationDetailMetaValue}>{showCitationModal.processo}</span>
                  </div>
                )}
                <div className={styles.citationDetailMetaItem}>
                  <span className={styles.citationDetailMetaLabel}>Status</span>
                  <span className={`${styles.citationDetailMetaValue} ${!showCitationModal.lido ? styles.citationStatusUnread : styles.citationStatusRead}`}>
                    {showCitationModal.lido ? '✓ Lida' : '● Não lida'}
                  </span>
                </div>
              </div>

              {/* Full text excerpt */}
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Trecho da Publicação</label>
                <div className={styles.citationDetailExcerpt}>
                  {highlightCitationsText(showCitationModal.trecho || showCitationModal.excerpt || "Conteúdo não disponível.")}
                </div>
              </div>

              {/* Extra fields if present */}
              {showCitationModal.url && (
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Link da Publicação</label>
                  <a
                    href={showCitationModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.citationDetailLink}
                  >
                    <ExternalLink size={13} />
                    Acessar publicação original
                  </a>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnCancel} onClick={() => setShowCitationModal(null)}>
                Fechar
              </button>
              {!showCitationModal.lido && (
                <button
                  type="button"
                  className={styles.btnConfirm}
                  disabled={markingReadId === showCitationModal.id}
                  onClick={async () => {
                    await handleMarkCitationRead(showCitationModal.id);
                    setShowCitationModal(null);
                  }}
                >
                  <Check size={14} />
                  {markingReadId === showCitationModal.id ? 'Marcando...' : 'Marcar como lida'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRM Import Modal Dialog */}
      {showImportModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Importar Processo para o CRM</h3>
              <button className={styles.modalClose} onClick={() => setShowImportModal(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleImportSubmit}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: '0.9rem', color: '#9ca3af', lineHeight: 1.5 }}>
                  Você está vinculando o processo CNJ <strong>{showImportModal.numero_cnj}</strong> ao seu CRM de clientes.
                </p>

                {/* Import Mode Radio Toggle */}
                <div className={styles.modalOptionGroup}>
                  <div 
                    className={`${styles.radioOption} ${importMode === "new" ? styles.radioOptionSelected : ""}`}
                    onClick={() => setImportMode("new")}
                  >
                    <input 
                      type="radio" 
                      className={styles.radioInput} 
                      checked={importMode === "new"} 
                      onChange={() => setImportMode("new")} 
                    />
                    <span>Criar Novo Cliente</span>
                  </div>
                  <div 
                    className={`${styles.radioOption} ${importMode === "existing" ? styles.radioOptionSelected : ""}`}
                    onClick={() => setImportMode("existing")}
                  >
                    <input 
                      type="radio" 
                      className={styles.radioInput} 
                      checked={importMode === "existing"} 
                      onChange={() => setImportMode("existing")} 
                    />
                    <span>Cliente Existente</span>
                  </div>
                </div>

                {/* Mode: Existing Client selection */}
                {importMode === "existing" && (
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Selecione o Cliente do CRM</label>
                    {crmClients.length === 0 ? (
                      <div style={{ color: '#fca5a5', fontSize: '0.85rem' }}>
                        Nenhum cliente cadastrado no CRM. Escolha &quot;Criar Novo Cliente&quot;.
                      </div>
                    ) : (
                      <select 
                        className={styles.selectInput}
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        required
                      >
                        {crmClients.map(cli => (
                          <option key={cli.id} value={cli.id}>{cli.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Mode: New Client fields creation */}
                {importMode === "new" && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {modalParties.length > 0 && (
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>Escolha o cliente das partes do processo:</label>
                        <div className={styles.partiesSelectorList}>
                          {modalParties.map((p, idx) => {
                            const isSelected = newClientName === (p.nome || p.name);
                            return (
                              <button
                                key={idx}
                                type="button"
                                className={`${styles.partySelectorCard} ${isSelected ? styles.partySelectorCardActive : ""}`}
                                onClick={() => {
                                  setNewClientName(p.nome || p.name || "");
                                  setNewClientCpfCnpj(p.documento || "");
                                }}
                              >
                                <div className={styles.partySelectorInfo}>
                                  <strong>{p.nome || p.name}</strong>
                                  <span>{p.polo || p.tipo_parte || "Parte"}</span>
                                </div>
                                {p.documento && (
                                  <span className={styles.partySelectorDoc}>
                                    Doc: {p.documento.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4").replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Nome do Cliente *</label>
                      <input 
                        type="text" 
                        className={styles.textInput} 
                        value={newClientName} 
                        onChange={(e) => setNewClientName(e.target.value)} 
                        placeholder="Ex: Carlos Henrique da Silva"
                        required
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>CPF ou CNPJ</label>
                      <input 
                        type="text" 
                        className={styles.textInput} 
                        value={newClientCpfCnpj} 
                        onChange={(e) => setNewClientCpfCnpj(e.target.value)} 
                        placeholder="Apenas números"
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>E-mail</label>
                      <input 
                        type="email" 
                        className={styles.textInput} 
                        value={newClientEmail} 
                        onChange={(e) => setNewClientEmail(e.target.value)} 
                        placeholder="cliente@email.com"
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>Telefone</label>
                      <input 
                        type="text" 
                        className={styles.textInput} 
                        value={newClientPhone} 
                        onChange={(e) => setNewClientPhone(e.target.value)} 
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button 
                  type="button" 
                  className={styles.btnCancel} 
                  onClick={() => setShowImportModal(null)}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className={styles.btnConfirm}
                  disabled={importing || (importMode === "existing" && !selectedClientId)}
                >
                  {importing ? "Importando..." : "Confirmar Importação"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </div>
      )}
    </LawyerDashboardShell>
  );
}
