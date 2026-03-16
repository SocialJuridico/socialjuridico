"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  PlusCircle, 
  Bell, 
  User, 
  LogOut, 
  Scale, 
  Search,
  Globe,
  Briefcase,
  Users,
  FileText,
  Sparkles,
  Calculator,
  Calendar,
  Filter,
  BookOpen,
  Settings,
  ChevronRight,
  Gavel,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  Phone,
  Coins,
  ArrowRight,
  Zap,
  TrendingUp,
  Shield,
  MessageSquare,
  X,
  UserPlus,
  ShieldHalf,
  Save,
  UserCheck,
  Paperclip,
  Upload,
  Pencil,
  FileDown,
  Paperclip as Clip,
  Send,
  Eye,
  Download
} from 'lucide-react';

import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';

import { createJurisCheckout, createProSubscription } from '@/services/stripeCheckoutService';

export default function AdvogadoDashboard() {
  const [userName, setUserName] = useState('Advogado');
  const [activeTab, setActiveTab] = useState('oportunidades');
  const [casos, setCasos] = useState([]);
  const [loadingCasos, setLoadingCasos] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [crmClients, setCrmClients] = useState([]);
  const [loadingCrm, setLoadingCrm] = useState(false);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({
    nome_completo: '',
    tipo: 'Pessoa Física',
    cpf_cnpj: '',
    rg_ie: '',
    estado_civil: '',
    profissao: '',
    telefone: '',
    endereco_completo: '',
    email: '',
    notas_internas: ''
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTypingAI, setIsTypingAI] = useState(false);
  
  // Smart Docs states
  const [allDocuments, setAllDocuments] = useState([]);
  const [loadingAllDocs, setLoadingAllDocs] = useState(false);
  const [selectedClientForSmartUpload, setSelectedClientForSmartUpload] = useState('');
  const [docFilters, setDocFilters] = useState({
    name: '',
    client: '',
    type: '',
    tag: '',
    dateFrom: '',
    dateTo: ''
  });

  const fileInputRef = useRef(null);
  const smartFileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isTypingAI]);

  useEffect(() => {
    async function loadData() {
      setLoadingProfile(true);
      try {
        const res = await fetch('/api/perfil');
        const data = await res.json();
        if (data.success) {
          setProfileData(data.data);
          setUserName(data.data.name);
        }
      } catch (e) {
        console.error("Erro perfil:", e);
      } finally {
        setLoadingProfile(false);
      }

      setLoadingCasos(true);
      try {
        await fetchCasos();
      } catch (e) {
        console.error("Erro casos:", e);
      } finally {
        setLoadingCasos(false);
      }
    }

    async function fetchCasos() {
      const res = await fetch('/api/casos');
      const data = await res.json();
      if (data.success) setCasos(data.data);
    }

    async function fetchCrmClients() {
      setLoadingCrm(true);
      try {
        const res = await fetch('/api/crm');
        const data = await res.json();
        if (data.success) setCrmClients(data.data);
      } catch (e) {
        console.error("Erro CRM:", e);
      } finally {
        setLoadingCrm(false);
      }
    }

    loadData();
    fetchCrmClients();
    fetchAllDocuments();
  }, []);

  const fetchAllDocuments = async () => {
    setLoadingAllDocs(true);
    try {
      const res = await fetch('/api/crm/documents');
      const data = await res.json();
      if (data.success) setAllDocuments(data.data);
    } catch (e) {
      console.error("Erro fetchAllDocs:", e);
    } finally {
      setLoadingAllDocs(false);
    }
  };
  useEffect(() => {
    // REAL-TIME: Assinar mudanças na tabela casos
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'casos' }, (payload) => {
        console.log('Real-time change detected:', payload);
        fetchCasos();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtros estritos para garantir a separação correta
  // Oportunidades: Somente casos SEM advogado e com status ABERTO
  const openCases = casos.filter(c => 
    (!c.advogado_id || c.advogado_id === null) && 
    c.status === 'ABERTO'
  );

  // Meus Casos: Somente casos vinculados ao MEU ID
  const myCases = casos.filter(c => 
    profileData?.id && 
    c.advogado_id === profileData.id
  );

  const renderActiveContent = () => {
    switch (activeTab) {
      case 'oportunidades':
        return renderOportunidades();
      case 'meus-casos':
        return renderMeusCasos();
      case 'crm':
        return renderCRM();
      case 'docs':
        return renderDocs();
      case 'redator':
        return renderRedator();
      case 'juris':
        return renderJuris();
      case 'agenda':
        return renderAgenda();
      case 'triagem':
        return renderTriagem();
      case 'perfil':
        return renderPerfil();
      case 'config':
        return renderConfig();
      default:
        return renderOportunidades();
    }
  };

  const renderOportunidades = () => (
    <div className={styles.toolContainer}>
      <div className={styles.searchWrapper}>
        <input 
          type="text" 
          placeholder="Buscar por qualquer coisa..." 
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className={styles.contentRow}>
        <aside className={styles.bannerLeft}>
          <div className={styles.bannerCard}>
            <Image src="/img/banner_sidebar.png" alt="Anuncie" width={240} height={360} className={styles.bannerImg} />
          </div>
        </aside>

        <section className={styles.opportunityGrid}>
          {loadingCasos ? (
            <div className={styles.loadingState}>Carregando oportunidades...</div>
          ) : openCases.length > 0 ? (
            openCases.filter(c => c.titulo.toLowerCase().includes(searchQuery.toLowerCase())).map(caso => (
              <div key={caso.id} className={styles.opCard}>
                <div className={styles.opHeader}>
                  <div className={styles.opArea}>
                    <div className={styles.opIcon}>{caso.area_atuacao?.charAt(0) || 'J'}</div>
                    <div className={styles.opTitleGroup}>
                      <h3>{caso.titulo || 'Caso Jurídico'}</h3>
                      <span className={styles.opLocation}>{caso.area_atuacao || 'Direito Geral'}</span>
                    </div>
                  </div>
                  <span className={styles.opDate}>{new Date(caso.created_at).toLocaleDateString()}</span>
                </div>
                <p className={styles.opDesc}>{caso.descricao}</p>
                <div className={styles.opFooter}>
                  <div className={styles.opPrice}>
                    <Coins size={14} /> 5 Juris
                  </div>
                  <button className={styles.applyBtn} onClick={() => vincularCaso(caso.id)}>Manifestar Interesse</button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>Nenhuma oportunidade aberta no momento.</div>
          )}
        </section>

        <aside className={styles.bannerRight}>
          <div className={styles.bannerCard}>
             <Image src="/img/banner_whatsapp.png" alt="Suporte" width={240} height={360} className={styles.bannerImg} />
          </div>
        </aside>
      </div>
    </div>
  );

  const vincularCaso = async (casoId) => {
    if (!confirm("Deseja assumir este caso?")) return;
    try {
      const res = await fetch('/api/casos/vincular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ casoId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Caso vinculado com sucesso!");
        window.location.reload();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao vincular caso.");
    }
  };

  const renderMeusCasos = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
         <h2 className={styles.sectionTitle}>Meus Casos Atunais</h2>
       </div>
       <div className={styles.opportunityGrid}>
          {myCases.map(caso => (
            <div key={caso.id} className={styles.opCard}>
                <div className={styles.opHeader}>
                  <div className={styles.opArea}>
                    <div className={styles.opIcon} style={{background: '#10b981'}}><CheckCircle2 size={16} /></div>
                    <div className={styles.opTitleGroup}>
                      <h3>{caso.titulo}</h3>
                      <span className={styles.opLocation}>{caso.area_atuacao}</span>
                    </div>
                  </div>
                  <span className={styles.opDate}>{new Date(caso.created_at).toLocaleDateString()}</span>
                </div>
                <p className={styles.opDesc}>{caso.descricao}</p>
                <div className={styles.opFooter}>
                   <span className={styles.badge} style={{background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none'}}>{caso.status}</span>
                   <button className={styles.applyBtn} style={{background: '#6366f1'}} onClick={() => window.location.href=`/chat/${caso.id}`}>Abrir Conversa</button>
                </div>
            </div>
          ))}
          {myCases.length === 0 && <div className={styles.emptyState}>Você ainda não possui casos vinculados.</div>}
       </div>
    </div>
  );

  const fetchCrmClients = async () => {
    try {
      const res = await fetch('/api/crm');
      const data = await res.json();
      if (data.success) setCrmClients(data.data);
    } catch (e) {
      console.error("Erro CRM:", e);
    }
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setIsSubmittingClient(true);
    try {
      const res = await fetch('/api/crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientData)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Cliente cadastrado com sucesso!");
        setShowNewClientModal(false);
        setNewClientData({
          nome_completo: '',
          tipo: 'Pessoa Física',
          cpf_cnpj: '',
          rg_ie: '',
          estado_civil: '',
          profissao: '',
          telefone: '',
          endereco_completo: '',
          email: '',
          notas_internas: ''
        });
        fetchCrmClients();
      } else {
        toast.error(data.message || "Erro ao salvar cliente");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const renderCRM = () => (
    <div className={styles.toolContainer}>
       <div className={styles.crmHeader}>
          <div>
            <h2 className={styles.sectionTitle}>CRM & KYC Jurídico</h2>
            <p className={styles.sectionSubtitle}>Gestão de carteira e análise de risco.</p>
          </div>
          <button className={styles.newClientBtn} onClick={() => setShowNewClientModal(true)}>
            <UserPlus size={18} /> Novo Cliente
          </button>
       </div>

       <div className={styles.crmIntro}>
          <div className={styles.crmIntroIcon}><ShieldHalf size={24} /></div>
          <div className={styles.crmIntroText}>
             <h3>O que você pode fazer:</h3>
             <p>Gerencie sua carteira de clientes com inteligência artificial. Analise risco automaticamente, segmente clientes por potencial, acompanhe histórico de casos e receba recomendações estratégicas sobre próximos passos. Tudo centralizado em um dossiê completo para cada cliente.</p>
             <div className={styles.crmToolGrid}>
                <span className={styles.crmToolTag}><Save size={14} /> Score de Confiança</span>
                <span className={styles.crmToolTag}><Filter size={14} /> Segmentação</span>
                <span className={styles.crmToolTag}><MessageSquare size={14} /> Chat IA</span>
                <span className={styles.crmToolTag}><FileText size={14} /> Relatórios</span>
             </div>
          </div>
       </div>

       <div className={styles.clientList}>
          {loadingCrm ? (
            <div className={styles.emptyState}>Carregando clientes...</div>
          ) : crmClients.length > 0 ? (
            crmClients.map(client => (
              <div key={client.id} className={styles.clientCard}>
                 <div className={styles.clientMainInfo}>
                    <div className={styles.clientAvatar}>
                       {client.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className={styles.clientMeta}>
                       <h4>{client.name}</h4>
                       <p>{client.email || 'Sem email'} • {client.phone || 'Sem telefone'}</p>
                    </div>
                 </div>

                 <div className={styles.clientSecondaryInfo}>
                    <div className={styles.infoGroup}>
                       <span className={styles.infoLabel}>Documento</span>
                       <span className={styles.infoValue}>{client.cpf_cnpj || '--'}</span>
                    </div>
                    <div className={styles.infoGroup}>
                       <span className={styles.infoLabel}>Risco</span>
                       <span className={`${styles.riskBadge} ${client.risk_score < 30 ? styles.riskLow : client.risk_score < 70 ? styles.riskMed : styles.riskHigh}`}>
                          {client.risk_score < 30 ? 'Baixo' : client.risk_score < 70 ? 'Médio' : 'Alto'} ({client.risk_score}%)
                       </span>
                    </div>
                    <div className={styles.infoGroup}>
                       <span className={styles.infoLabel}>Status</span>
                       <span className={styles.infoValue}>{client.status || 'Ativo'}</span>
                    </div>
                    <button 
                      className={styles.buyJurisBtn} 
                      style={{padding: '6px 12px', fontSize: '0.75rem'}}
                      onClick={() => {
                        setSelectedClient(client);
                        setShowDossierModal(true);
                        setClientDocuments([]);
                        fetchClientDocuments(client.id);
                      }}
                    >
                      Dossiê Completo
                    </button>
                 </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>
               <Users size={48} style={{opacity: 0.2, marginBottom: '15px'}} />
               <p>Nenhum cliente cadastrado no banco de dados.</p>
            </div>
          )}
       </div>
    </div>
  );

  const handleSmartFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (selectedClientForSmartUpload) {
      formData.append('client_id', selectedClientForSmartUpload);
    }

    try {
      const res = await fetch('/api/crm/documents', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Documento processado com IA!");
        fetchAllDocuments();
        setSelectedClientForSmartUpload('');
      } else {
        toast.error(data.message || "Erro no upload");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteSmartDoc = async (docId, fileUrl) => {
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;

    try {
      // Extrair o path do Storage a partir da URL pública
      const pathPart = fileUrl.split('crm_documents/')[1];
      
      const res = await fetch(`/api/crm/documents?id=${docId}&path=${encodeURIComponent(pathPart)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success("Documento excluído com sucesso!");
        fetchAllDocuments();
      } else {
        toast.error(data.message || "Erro ao excluir");
      }
    } catch (err) {
      console.error("Erro deletar:", err);
      toast.error("Erro na conexão");
    }
  };

  const renderDocs = () => {
    const filteredDocs = allDocuments.filter(doc => {
      const matchName = doc.file_name.toLowerCase().includes(docFilters.name.toLowerCase());
      const matchClient = !docFilters.client || doc.client_id === docFilters.client;
      const matchType = !docFilters.type || doc.doc_type?.toLowerCase() === docFilters.type.toLowerCase();
      // Tag filter
      const matchTag = !docFilters.tag || (doc.tags && doc.tags.some(t => t.toLowerCase().includes(docFilters.tag.toLowerCase())));
      
      return matchName && matchClient && matchType && matchTag;
    });

    return (
      <div className={styles.smartDocsContainer}>
         <div className={styles.smartDocsHeader}>
            <div>
               <h2 className={styles.sectionTitle}>Gerenciador de Documentos</h2>
               <p className={styles.modalSubtitle} style={{marginTop: 5}}>IA detecta tipos e organiza automaticamente.</p>
            </div>
            <div style={{display: 'flex', gap: 15, alignItems: 'center'}}>
               <select 
                 className={styles.filterSelect}
                 value={selectedClientForSmartUpload}
                 onChange={e => setSelectedClientForSmartUpload(e.target.value)}
                 style={{minWidth: 200}}
               >
                  <option value="">-- Vincular a Cliente (Opcional) --</option>
                  {crmClients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
               </select>
               <button 
                 className={styles.buyJurisBtn} 
                 style={{padding: '10px 20px', borderRadius: 10}}
                 onClick={() => smartFileInputRef.current?.click()}
               >
                  <Upload size={18} style={{marginRight: 8}} /> Upload
               </button>
            </div>
         </div>

         <div className={styles.smartDocsInfoCard}>
            <div className={styles.infoIconLarge}>
               <FileText size={32} />
            </div>
            <div className={styles.infoContent}>
               <h3>O que você pode fazer:</h3>
               <p>Faça upload de documentos jurídicos e deixe a IA organizá-los automaticamente. Sistema detecta tipo de documento (petição, contrato, sentença), gera tags relevantes e vincula ao cliente correspondente. Busca rápida e armazenamento centralizado de toda sua documentação.</p>
               <div className={styles.featureTagGrid}>
                  <div className={styles.featureTag}><Sparkles size={14} color="#a855f7" /> Detecção IA</div>
                  <div className={styles.featureTag}><Zap size={14} color="#f59e0b" /> Tagging Auto</div>
                  <div className={styles.featureTag}><Users size={14} color="#3b82f6" /> Vincular Cliente</div>
                  <div className={styles.featureTag}><Search size={14} color="#10b981" /> Busca Rápida</div>
               </div>
            </div>
         </div>

         <div className={styles.filterCard}>
            <div className={styles.filterHeader}>
               <div className={styles.filterTitle}><Filter size={16} /> Filtros de Pesquisa</div>
               <button className={styles.clearFiltersBtn} onClick={() => setDocFilters({name:'', client:'', type:'', tag:'', dateFrom:'', dateTo:''})}>
                  <X size={14} /> Limpar Filtros
               </button>
            </div>
            <div className={styles.filterGrid}>
               <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>Nome do Arquivo</label>
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    className={styles.filterInput}
                    value={docFilters.name}
                    onChange={e => setDocFilters({...docFilters, name: e.target.value})}
                  />
               </div>
               <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>Cliente</label>
                  <select 
                    className={styles.filterSelect}
                    value={docFilters.client}
                    onChange={e => setDocFilters({...docFilters, client: e.target.value})}
                  >
                     <option value="">Todos</option>
                     {crmClients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                  </select>
               </div>
               <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>Tipo</label>
                  <select className={styles.filterSelect}>
                     <option value="">Todos</option>
                     <option value="peticao">Petição</option>
                     <option value="contrato">Contrato</option>
                     <option value="sentenca">Sentença</option>
                  </select>
               </div>
               <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>Tag</label>
                  <input type="text" placeholder="Pesquisar tag..." className={styles.filterInput} />
               </div>
               <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>Data De</label>
                  <input type="date" className={styles.filterInput} />
               </div>
               <div className={styles.filterItem}>
                  <label className={styles.filterLabel}>Data Até</label>
                  <input type="date" className={styles.filterInput} />
               </div>
            </div>
            <div style={{marginTop: 15, fontSize: '0.8rem', color: 'var(--color-silver-dark)'}}>
               {filteredDocs.length} documento(s) encontrado(s)
            </div>
         </div>

         <div style={{overflowX: 'auto'}}>
            <table className={styles.docTable}>
               <thead>
                  <tr>
                     <th>Nome</th>
                     <th>Cliente Vinculado</th>
                     <th>Tipo (IA)</th>
                     <th>Tags</th>
                     <th>Data</th>
                     <th>Ações</th>
                  </tr>
               </thead>
               <tbody>
                  {filteredDocs.length > 0 ? (
                    filteredDocs.map(doc => (
                      <tr key={doc.id} className={styles.docRow}>
                         <td>{doc.file_name}</td>
                         <td>
                            {doc.client_name ? (
                              <span className={styles.clientLink}>{doc.client_name}</span>
                            ) : (
                              <span style={{color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem'}}>Sem vínculo</span>
                            )}
                         </td>
                         <td><span className={styles.iaBadge}>{doc.doc_type || 'Processando...'}</span></td>
                         <td>
                            {doc.tags && doc.tags.map((tag, idx) => (
                               <span key={idx} className={styles.docTag}>{tag}</span>
                            ))}
                            {(!doc.tags || doc.tags.length === 0) && <span style={{color: 'rgba(255,255,255,0.2)', fontSize: '0.7rem'}}>Sem tags</span>}
                         </td>
                         <td>{new Date(doc.created_at).toLocaleDateString()}</td>
                         <td>
                            <div className={styles.docActions}>
                               <button className={styles.docActionBtn} onClick={() => window.open(doc.file_url, '_blank')}><Eye size={18} /></button>
                               <button className={styles.docActionBtn}><Download size={18} /></button>
                               <button className={`${styles.docActionBtn} ${styles.trashBtn}`} onClick={() => handleDeleteSmartDoc(doc.id, doc.file_url)}><Trash2 size={18} /></button>
                            </div>
                         </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                       <td colSpan="6" style={{textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.2)'}}>
                          Nenhum documento. Faça upload para testar a IA.
                       </td>
                    </tr>
                  )}
               </tbody>
            </table>
         </div>

         <input 
            type="file" 
            ref={smartFileInputRef} 
            style={{display: 'none'}} 
            onChange={handleSmartFileUpload}
         />
      </div>
    );
  };

  const renderRedator = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Redator IA (Copilot)</h2>
       </div>
       <div className={styles.infoBox} style={{background: '#fff7ed', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #ffedd5'}}>
          <p style={{fontSize: '0.9rem', color: '#9a3412'}}>Gere minutas jurídicas completas com um clique. Configure o tipo de peça, tom de voz e dados do cliente.</p>
       </div>
       <div className={styles.emptyState}>Inicie uma nova redação para ver o editor.</div>
    </div>
  );

  const renderJuris = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Jurisprudência AI</h2>
       </div>
       <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
         <input type="text" placeholder="Pesquisar teses, tribunais ou temas..." className={styles.searchInput} style={{margin: 0}} />
         <button className={styles.applyBtn} style={{width: 'auto', flex: 'none'}}>Pesquisar</button>
       </div>
       <div className={styles.emptyState}>O motor de busca JurisAI está pronto.</div>
    </div>
  );

  const renderAgenda = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Agenda Inteligente</h2>
       </div>
       <div className={styles.emptyState}>Não há compromissos para hoje.</div>
    </div>
  );

  const renderTriagem = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Triagem (Intake)</h2>
       </div>
       <div className={styles.emptyState}>Nenhuma triagem em andamento.</div>
    </div>
  );

  const renderPerfil = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Meu Perfil Profissional</h2>
       </div>
       {profileData && (
         <div className={styles.opCard} style={{background: '#fff'}}>
            <p><strong>Nome:</strong> {profileData.name}</p>
            <p><strong>OAB:</strong> {profileData.oab}</p>
            <p><strong>Email:</strong> {profileData.email}</p>
            <p><strong>Telefone:</strong> {profileData.phone || 'Não informado'}</p>
            <p><strong>Saldo:</strong> {profileData.balance} Juris</p>
         </div>
       )}
    </div>
  );

  const renderConfig = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Configurações do Sistema</h2>
       </div>
       <div className={styles.emptyState}>Painel de configurações em desenvolvimento.</div>
    </div>
  );

  const handleBuyJuris = async (amount = 20) => {
    try {
      toast.loading("Iniciando pagamento...");
      await createJurisCheckout(amount);
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao iniciar compra: " + err.message);
    }
  };

  const handleBecomePro = async () => {
    try {
      toast.loading("Iniciando assinatura...");
      await createProSubscription();
    } catch (err) {
      toast.dismiss();
      toast.error("Erro ao iniciar assinatura: " + err.message);
    }
  };

  const fetchClientDocuments = async (clientId) => {
    try {
      const res = await fetch(`/api/crm/documents?client_id=${clientId}`);
      const data = await res.json();
      if (data.success) setClientDocuments(data.data);
    } catch (e) {
      console.error("Erro docs:", e);
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedClient) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('client_id', selectedClient.id);

    try {
      const res = await fetch('/api/crm/documents', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Documento anexado!");
        fetchClientDocuments(selectedClient.id);
      } else {
        toast.error(data.message || "Erro no upload");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteDocument = (docId, fileUrl) => {
    setDocToDelete({ id: docId, url: fileUrl });
    setShowDeleteConfirm(true);
  };

  const executeDeleteDocument = async () => {
    if (!docToDelete) return;

    try {
      const urlParts = docToDelete.url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${selectedClient.id}/${fileName}`;

      const res = await fetch(`/api/crm/documents?id=${docToDelete.id}&path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Arquivo excluído!");
        fetchClientDocuments(selectedClient.id);
      } else {
        toast.error(data.message || "Erro ao excluir");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setShowDeleteConfirm(false);
      setDocToDelete(null);
    }
  };

  const handleGenerateReport = () => {
    if (!selectedClient) return;
    setIsGeneratingReport(true);
    
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString('pt-BR');

      // Cabeçalho
      doc.setFontSize(22);
      doc.setTextColor(212, 175, 55); // Cor Ouro
      doc.text("SocialJuridico - Dossie do Cliente", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Relatorio gerado em: ${timestamp}`, 14, 30);
      doc.line(14, 35, 196, 35);

      // Dados do Cliente (Seção)
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text("Dados Pessoais & Contato", 14, 45);

      const personalData = [
        ["Nome", selectedClient.name],
        ["Tipo", selectedClient.type || "Pessoa Fisica"],
        ["CPF/CNPJ", selectedClient.cpf_cnpj || "---"],
        ["RG/IE", selectedClient.rg || "---"],
        ["Estado Civil", selectedClient.civil_status || "---"],
        ["Profissao", selectedClient.profession || "---"],
        ["Email", selectedClient.email || "---"],
        ["Telefone", selectedClient.phone || "---"],
        ["Endereco", selectedClient.address || "---"]
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Campo', 'Valor']],
        body: personalData,
        theme: 'striped',
        headStyles: { fillColor: [212, 175, 55] }
      });

      // Notas Internas
      let finalY = doc.lastAutoTable.finalY + 15;
      doc.setFontSize(16);
      doc.text("Notas Internas", 14, finalY);
      
      doc.setFontSize(11);
      const splitNotes = doc.splitTextToSize(selectedClient.notes || "Sem observacoes registradas.", 180);
      doc.text(splitNotes, 14, finalY + 10);

      // Lista de Documentos
      finalY = finalY + 30 + (splitNotes.length * 5);
      if (clientDocuments.length > 0) {
        doc.setFontSize(16);
        doc.text("Documentos Vinculados", 14, finalY);
        
        const docRows = clientDocuments.map(d => [d.file_name, new Date(d.created_at).toLocaleDateString('pt-BR')]);
        autoTable(doc, {
          startY: finalY + 5,
          head: [['Arquivo', 'Data de Anexo']],
          body: docRows,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40] }
        });
      }

      // Rodape
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`SocialJuridico PRO - Pagina ${i} de ${pageCount}`, 14, 285);
      }

      doc.save(`Dossie_${selectedClient.name.replace(/\s+/g, '_')}.pdf`);
      toast.success("Relatório gerado!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || isTypingAI || !selectedClient) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTypingAI(true);

    try {
      const res = await fetch('/api/crm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          clientData: selectedClient,
          history: chatMessages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
          }))
        })
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'ai', content: data.response }]);
      } else {
        toast.error(data.message || "Erro na IA");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setIsTypingAI(false);
    }
  };

  const renderDossierModal = () => {
    if (!showDossierModal || !selectedClient) return null;

    return (
      <div className={styles.modalOverlay} onClick={() => setShowDossierModal(false)}>
        <div className={styles.dossierContent} onClick={e => e.stopPropagation()}>
          {/* HEADER */}
          <div className={styles.dossierHeader}>
             <div className={styles.dossierProfile}>
                <div className={styles.dossierAvatar}>{selectedClient.name.substring(0, 2).toUpperCase()}</div>
                <div className={styles.dossierTitleInfo}>
                   <h2>{selectedClient.name}</h2>
                   <div className={styles.dossierBadges}>
                      <span className={styles.miniBadge}>{selectedClient.type}</span>
                      <span className={`${styles.riskBadge} ${selectedClient.risk_score < 30 ? styles.riskLow : selectedClient.risk_score < 70 ? styles.riskMed : styles.riskHigh}`} style={{padding: '2px 8px', fontSize: '0.6rem'}}>
                        Risco {selectedClient.risk_score < 30 ? 'Baixo' : selectedClient.risk_score < 70 ? 'Médio' : 'Alto'}
                      </span>
                   </div>
                </div>
             </div>
             <div style={{display: 'flex', gap: '10px'}}>
                <button className={styles.closeIconBtn} style={{background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)'}}><Pencil size={18} /></button>
                <button className={styles.closeIconBtn} onClick={() => setShowDossierModal(false)}><X size={18} /></button>
             </div>
          </div>

          {/* BODY */}
          <div className={styles.dossierBody}>
             <div className={styles.dossierLeft}>
                <div className={styles.dossierSection}>
                   <span className={styles.dossierSectionTitle}>Dados Pessoais</span>
                   <div className={styles.dossierDataGrid}>
                      <div className={styles.dataItem}>
                         <label>CPF / CNPJ</label>
                         <span>{selectedClient.cpf_cnpj || '---'}</span>
                      </div>
                      <div className={styles.dataItem}>
                         <label>RG / IE</label>
                         <span>{selectedClient.rg || '---'}</span>
                      </div>
                      <div className={styles.dataItem}>
                         <label>Estado Civil</label>
                         <span>{selectedClient.civil_status || '---'}</span>
                      </div>
                      <div className={styles.dataItem}>
                         <label>Profissão</label>
                         <span>{selectedClient.profession || '---'}</span>
                      </div>
                   </div>
                </div>

                <div className={styles.dossierSection}>
                   <span className={styles.dossierSectionTitle}>Contato</span>
                   <div className={styles.dossierDataGrid}>
                      <div className={styles.dataItem} style={{gridColumn: 'span 2'}}>
                         <label>Email</label>
                         <span>{selectedClient.email || 'Não informado'}</span>
                      </div>
                      <div className={styles.dataItem} style={{gridColumn: 'span 2'}}>
                         <label>Telefone</label>
                         <span>{selectedClient.phone || 'Não informado'}</span>
                      </div>
                      <div className={styles.dataItem} style={{gridColumn: 'span 2'}}>
                         <label>Endereço</label>
                         <span>{selectedClient.address || 'Não informado'}</span>
                      </div>
                   </div>
                </div>
             </div>

             <div className={styles.dossierRight}>
                <div className={styles.dossierSection}>
                   <span className={styles.dossierSectionTitle}>Notas Internas</span>
                   <div className={styles.notesBox}>
                      {selectedClient.notes || "Sem observações registradas."}
                   </div>
                </div>

                <div className={styles.dossierSection}>
                   <div className={styles.documentsSectionHeader}>
                      <span className={styles.dossierSectionTitle} style={{margin: 0}}>Documentos Vinculados</span>
                      <button 
                        className={styles.attachBtn} 
                        onClick={handleAttachClick}
                        disabled={isUploading}
                      >
                         <Paperclip size={14} /> {isUploading ? "Enviando..." : "Anexar"}
                      </button>
                   </div>
                   <div className={styles.docList}>
                      {clientDocuments.length > 0 ? (
                        <div style={{width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px'}}>
                           {clientDocuments.map(doc => (
                             <div key={doc.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                   <FileText size={16} color="var(--color-gold)" />
                                   <span style={{fontSize: '0.8rem'}}>{doc.file_name}</span>
                                </div>
                                <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                                   <a href={doc.file_url} target="_blank" rel="noreferrer" style={{color: 'var(--color-gold)', fontSize: '0.7rem', fontWeight: '800'}}>VER</a>
                                   <button 
                                     onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                                     style={{background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#ff4d4d', display: 'flex', alignItems: 'center'}}
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                </div>
                             </div>
                           ))}
                        </div>
                      ) : (
                        "Nenhum documento."
                      )}
                   </div>
                </div>
             </div>
          </div>

          {/* AI FOOTER */}
          <div className={styles.dossierFooterIA}>
             <div className={styles.iaHeader}>
                <div className={styles.iaTitle}><Sparkles size={18} color="var(--color-gold)" /> IA Insights & Ações</div>
                {/* <button className={styles.updateIABtn}><Zap size={12} /> Atualizar IA</button> */}
             </div>
             <div className={styles.iaActions}>
                <button 
                  className={styles.iaActionBtn} 
                  onClick={handleGenerateReport}
                  disabled={isGeneratingReport}
                >
                   <FileDown size={18} /> {isGeneratingReport ? "Gerando..." : "Gerar Relatório"}
                </button>
                <button 
                  className={`${styles.iaActionBtn} ${styles.chatIABtn}`}
                  onClick={() => setShowChatModal(true)}
                >
                   <MessageSquare size={18} /> Chat IA
                </button>
             </div>
          </div>

          <button className={styles.closeDossierBtn} onClick={() => setShowDossierModal(false)}>Fechar Dossiê</button>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div className={styles.modalOverlay} style={{zIndex: 20000}}>
        <div className={styles.confirmModal}>
          <div className={styles.confirmIcon}>
            <Trash2 size={32} />
          </div>
          <h3 className={styles.confirmTitle}>Excluir Documento?</h3>
          <p className={styles.confirmText}>
            Esta ação não pode ser desfeita. O arquivo será removido permanentemente do dossiê.
          </p>
          <div className={styles.confirmActions}>
            <button className={styles.cancelBtn} onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
            <button className={styles.confirmDeleteBtn} onClick={executeDeleteDocument}>Excluir</button>
          </div>
        </div>
      </div>
    );
  };

  const renderChatModal = () => {
    if (!showChatModal || !selectedClient) return null;

    return (
      <div className={styles.chatModalOverlay} onClick={() => setShowChatModal(false)}>
        <div className={styles.chatContainer} onClick={e => e.stopPropagation()}>
           <div className={styles.chatHeader}>
              <div className={styles.chatTitleArea}>
                 <div className={styles.chatTitle}>Assistente Jurídico IA</div>
                 <div className={styles.chatStatus}>
                    <div style={{width: 8, height: 8, background: '#10b981', borderRadius: '50%'}}></div>
                    Online
                 </div>
              </div>
              <button className={styles.closeIconBtn} onClick={() => setShowChatModal(false)}><X size={18} /></button>
           </div>

           <div className={styles.chatMessagesArea}>
              <div className={styles.messageWrapper} style={{alignSelf: 'center', maxWidth: '100%', marginBottom: '20px'}}>
                 <div className={styles.aiBubble} style={{background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.1)', textAlign: 'center'}}>
                    Olá Dr(a). Sou sua IA especialista em direito. <br/>
                    Como posso ajudar no caso de <strong>{selectedClient.name}</strong> hoje?
                 </div>
              </div>

              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
                   <div className={`${styles.messageBubble} ${msg.role === 'user' ? styles.userBubble : styles.aiBubble}`}>
                      {msg.content}
                   </div>
                   <div className={styles.messageInfo}>
                      {msg.role === 'user' ? 'Você' : 'SocialJuridico IA'} • {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   </div>
                </div>
              ))}
              
              {isTypingAI && (
                <div className={`${styles.messageWrapper} ${styles.aiMessage}`}>
                   <div className={`${styles.messageBubble} ${styles.aiBubble}`}>
                      <div className={styles.typingIndicator}>Analizando dados jurídicos...</div>
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
           </div>

           <form className={styles.chatInputArea} onSubmit={handleSendMessage}>
              <div className={styles.chatInputWrapper}>
                 <input 
                   type="text" 
                   className={styles.chatTextInput} 
                   placeholder="Pergunte sobre este cliente..."
                   value={chatInput}
                   onChange={e => setChatInput(e.target.value)}
                   disabled={isTypingAI}
                 />
                 <button 
                   type="submit" 
                   className={styles.chatSendBtn}
                   disabled={isTypingAI || !chatInput.trim()}
                 >
                    <Send size={18} />
                 </button>
              </div>
           </form>
        </div>
      </div>
    );
  };

  const renderNewClientModal = () => {
    if (!showNewClientModal) return null;

    return (
      <div className={styles.modalOverlay} onClick={() => setShowNewClientModal(false)}>
        <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{maxWidth: '600px'}}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Cadastrar Novo Cliente</h2>
            <p className={styles.modalSubtitle}>Preencha os dados básicos para iniciar o dossiê</p>
          </div>

          <form onSubmit={handleSaveClient} className={styles.formGrid}>
             <div className={`${styles.formItem} ${styles.formItemFull}`}>
                <label className={styles.formLabel}>Nome Completo</label>
                <input 
                  type="text" 
                  className={styles.formInput} 
                  required 
                  value={newClientData.nome_completo}
                  onChange={e => setNewClientData({...newClientData, nome_completo: e.target.value})}
                />
             </div>

             <div className={styles.formItem}>
                <label className={styles.formLabel}>Tipo</label>
                <select 
                  className={styles.formSelect}
                  value={newClientData.tipo}
                  onChange={e => setNewClientData({...newClientData, tipo: e.target.value})}
                >
                   <option>Pessoa Física</option>
                   <option>Pessoa Jurídica</option>
                </select>
             </div>

             <div className={styles.formItem}>
                <label className={styles.formLabel}>CPF / CNPJ</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={newClientData.cpf_cnpj}
                  onChange={e => setNewClientData({...newClientData, cpf_cnpj: e.target.value})}
                />
             </div>

             <div className={styles.formItem}>
                <label className={styles.formLabel}>RG / IE</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={newClientData.rg_ie}
                  onChange={e => setNewClientData({...newClientData, rg_ie: e.target.value})}
                />
             </div>

             <div className={styles.formItem}>
                <label className={styles.formLabel}>Estado Civil</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={newClientData.estado_civil}
                  onChange={e => setNewClientData({...newClientData, estado_civil: e.target.value})}
                />
             </div>

             <div className={styles.formItem}>
                <label className={styles.formLabel}>Profissão</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={newClientData.profissao}
                  onChange={e => setNewClientData({...newClientData, profissao: e.target.value})}
                />
             </div>

             <div className={styles.formItem}>
                <label className={styles.formLabel}>Telefone</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={newClientData.telefone}
                  onChange={e => setNewClientData({...newClientData, telefone: e.target.value})}
                />
             </div>

             <div className={`${styles.formItem} ${styles.formItemFull}`}>
                <label className={styles.formLabel}>Endereço Completo</label>
                <input 
                  type="text" 
                  className={styles.formInput}
                  value={newClientData.endereco_completo}
                  onChange={e => setNewClientData({...newClientData, endereco_completo: e.target.value})}
                />
             </div>

             <div className={`${styles.formItem} ${styles.formItemFull}`}>
                <label className={styles.formLabel}>Email</label>
                <input 
                  type="email" 
                  className={styles.formInput}
                  value={newClientData.email}
                  onChange={e => setNewClientData({...newClientData, email: e.target.value})}
                />
             </div>

             <div className={`${styles.formItem} ${styles.formItemFull}`}>
                <label className={styles.formLabel}>Notas Internas</label>
                <textarea 
                  className={styles.formTextarea}
                  value={newClientData.notas_internas}
                  onChange={e => setNewClientData({...newClientData, notas_internas: e.target.value})}
                ></textarea>
             </div>

             <button type="submit" className={styles.submitBtn} disabled={isSubmittingClient}>
                {isSubmittingClient ? "Salvando..." : <><UserCheck size={18} /> Salvar Cliente no Banco de Dados</>}
             </button>
          </form>

          <button className={styles.closeModalBtn} onClick={() => setShowNewClientModal(false)}>Cancelar</button>
        </div>
      </div>
    );
  };

  const renderBuyModal = () => {
    if (!showBuyModal) return null;

    return (
      <div className={styles.modalOverlay} onClick={() => setShowBuyModal(false)}>
        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>Comprar Juris</h2>
            <p className={styles.modalSubtitle}>Escolha um pacote para créditos instantâneos</p>
            <p className={styles.modalDescription}>Adicione créditos e manifeste interesse em demandas de seus clientes.</p>
          </div>

          <div className={styles.packageGrid}>
            <div className={styles.packageCard} onClick={() => handleBuyJuris(10)}>
              <span className={styles.packageAmount}>10</span>
              <span className={styles.packageUnit}>Juris</span>
              <span className={styles.packagePrice}>R$ 9.90</span>
              <button className={styles.packageBtn}>Comprar</button>
            </div>

            <div className={`${styles.packageCard} ${styles.popularCard}`} onClick={() => handleBuyJuris(20)}>
              <span className={styles.popularBadge}>Mais Popular</span>
              <span className={styles.packageAmount}>20</span>
              <span className={styles.packageUnit}>Juris</span>
              <span className={styles.packagePrice}>R$ 16.90</span>
              <button className={`${styles.packageBtn} ${styles.popularPkgBtn}`}>Comprar</button>
            </div>

            <div className={styles.packageCard} onClick={() => handleBuyJuris(50)}>
              <span className={styles.packageAmount}>50</span>
              <span className={styles.packageUnit}>Juris</span>
              <span className={styles.packagePrice}>R$ 39.90</span>
              <button className={styles.packageBtn}>Comprar</button>
            </div>
          </div>

          <button className={styles.closeModalBtn} onClick={() => setShowBuyModal(false)}>Fechar</button>
        </div>
      </div>
    );
  };

  const renderProModal = () => {
    if (!showProModal) return null;

    return (
      <div className={styles.premiumModalOverlay} onClick={() => setShowProModal(false)}>
        <div className={styles.premiumModalContent} onClick={e => e.stopPropagation()}>
          <div className={styles.modalLeft}>
             <div className={styles.proBadge}><Sparkles size={14} /> SocialJurídicoPRO</div>
             <div className={styles.proMainInfo}>
                <h1 className={styles.proTitle}>Desbloqueie o poder máximo da advocacia.</h1>
                <p className={styles.proSubline}>Ferramentas de IA e gestão para quem joga em outro nível.</p>
             </div>
             <div className={styles.priceContainer}>
                <div className={styles.priceLarge}>R$ 69<span className={styles.priceCents}>,90</span></div>
                <div className={styles.pricePeriod}>cobrado mensalmente</div>
             </div>
          </div>

          <div className={styles.modalRight}>
             <button className={styles.closeIconBtn} onClick={() => setShowProModal(false)}><X size={18} /></button>
             <h3 className={styles.rightHeader}>O que está incluído:</h3>
             
             <div className={styles.featureList}>
                <div className={styles.featureItem}>
                   <div className={styles.featureIconBox}><Users size={20} /></div>
                   <div className={styles.featureText}>
                      <h4>CRM & KYC Avançado</h4>
                      <p>Gestão de clientes com análise de risco e dossiê completo.</p>
                   </div>
                </div>

                <div className={styles.featureItem}>
                   <div className={styles.featureIconBox}><FileText size={20} /></div>
                   <div className={styles.featureText}>
                      <h4>Smart Docs</h4>
                      <p>Organização automática e vinculação de arquivos.</p>
                   </div>
                </div>

                <div className={styles.featureItem}>
                   <div className={styles.featureIconBox}><Sparkles size={20} /></div>
                   <div className={styles.featureText}>
                      <h4>Redator IA</h4>
                      <p>Geração de minutas com um clique usando dados do CRM.</p>
                   </div>
                </div>

                <div className={styles.featureItem}>
                   <div className={styles.featureIconBox}><Calculator size={20} /></div>
                   <div className={styles.featureText}>
                      <h4>Calculadoras Jurídicas</h4>
                      <p>Trabalhista, Cível, Penal, Família e mais.</p>
                   </div>
                </div>

                <div className={styles.featureItem}>
                   <div className={styles.featureIconBox}><Scale size={20} /></div>
                   <div className={styles.featureText}>
                      <h4>Inteligência Estratégica</h4>
                      <p>Análise de jurisprudência e triagem automática.</p>
                   </div>
                </div>
             </div>

             <div className={styles.bonusBox}>
                <div className={styles.bonusLabel}><Coins size={16} /> BÔNUS EXCLUSIVO</div>
                <div className={styles.bonusValue}>+20 Juris todo mês</div>
             </div>

             <button className={styles.subscribeBtn} onClick={handleBecomePro}>
                Assinar Agora <ChevronRight size={20} />
             </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logoWrapper}>
            <span className={styles.logoText}>SocialJurídico</span>
            <span className={styles.logoSub}>Advogado</span>
          </div>
        </div>

        <button className={styles.premiumBtn} onClick={() => setShowProModal(true)}>Seja Premium</button>

        <div className={styles.quotaContainer}>
           <div className={styles.quotaLabel}>
              <span>0 / 5.000</span>
              <span className={styles.quotaValue}>5.000 restantes</span>
           </div>
           <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
           </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroupLabel}>Navegação</div>
          <div className={`${styles.navItem} ${activeTab === 'oportunidades' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('oportunidades')}>
            <Globe size={18} /> <span>Oportunidades</span>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'meus-casos' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('meus-casos')}>
            <Briefcase size={18} /> <span>Meus Casos</span>
          </div>

          <div className={styles.navGroupLabel}>Ferramentas PRO</div>
          <div className={`${styles.navItem} ${activeTab === 'crm' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('crm')}>
            <Users size={18} /> <span>CRM & KYC</span>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'docs' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('docs')}>
            <FileText size={18} /> <span>Smart Docs</span>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'redator' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('redator')}>
            <Sparkles size={18} /> <span>Redator IA</span>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'juris' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('juris')}>
            <Scale size={18} /> <span>Jurisprudência</span>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'agenda' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('agenda')}>
            <Calendar size={18} /> <span>Agenda</span>
          </div>
          <div className={`${styles.navItem} ${activeTab === 'triagem' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('triagem')}>
            <Filter size={18} /> <span>Triagem</span>
          </div>

          <div className={styles.navGroupLabel}>Sistema</div>
          <div className={styles.navItem} onClick={() => alert('Documentação em breve...')}>
            <BookOpen size={18} /> <span>Documentação</span>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
           <div className={`${styles.navItem} ${activeTab === 'perfil' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('perfil')}>
              <User size={18} /> <span>Meu Perfil</span>
           </div>
           <div className={styles.navItem} onClick={() => setActiveTab('config')}>
              <Settings size={18} /> <span>Ajustes</span>
           </div>
           <div className={`${styles.navItem} ${styles.footerLogout}`} onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
           }}>
              <LogOut size={18} /> <span>Sair</span>
           </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.breadcrumb}>
            <Globe size={20} className={styles.breadcrumbIcon} />
            <span>Oportunidades em Aberto</span>
          </div>

          <div className={styles.userActions}>
            <div className={styles.jurisBadge}>
               <Coins size={14} color="var(--brand-gold)" />
               <span className={styles.jurisCount}>{profileData?.balance || 0} Juris</span>
               <button className={styles.buyJurisBtn} onClick={() => setShowBuyModal(true)}>Comprar</button>
            </div>
            
            <div className={styles.userInfo}>
               <span className={styles.userName}>{userName}</span>
               <span className={styles.userOAB}>{profileData?.oab || 'OAB Pendente'}</span>
            </div>

            <div className={styles.avatar}>
               {userName.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        <section className={styles.pageBody}>
           {renderActiveContent()}
        </section>
      </main>

      <input 
        type="file" 
        ref={fileInputRef} 
        style={{display: 'none'}} 
        onChange={handleFileUpload}
      />
      {renderBuyModal()}
      {renderProModal()}
      {renderNewClientModal()}
      {renderDossierModal()}
      {renderDeleteConfirmModal()}
      {renderChatModal()}
    </div>
  );
}
