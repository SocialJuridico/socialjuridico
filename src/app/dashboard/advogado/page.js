"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  MessageSquare
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
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

    loadData();

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

  const renderCRM = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>CRM & KYC Jurídico</h2>
          <button className={styles.premiumBtn} style={{margin: 0}}>+ Novo Cliente</button>
       </div>
       <div className={styles.infoBox} style={{background: '#eef2ff', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #c7d2fe'}}>
          <p style={{fontSize: '0.9rem', color: '#3730a3'}}>Gerencie sua carteira de clientes com inteligência artificial. Analise risco automaticamente e segmente clientes por potencial.</p>
       </div>
       <div className={styles.emptyState}>Base de clientes em processamento...</div>
    </div>
  );

  const renderDocs = () => (
    <div className={styles.toolContainer}>
       <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Smart Docs</h2>
       </div>
       <div className={styles.infoBox} style={{background: '#fdf2f8', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #fce7f3'}}>
          <p style={{fontSize: '0.9rem', color: '#9d174d'}}>Faça upload de documentos e deixe a IA organizá-los. Detectamos tipos de petição, contratos e sentenças automaticamente.</p>
       </div>
       <div className={styles.emptyState}>Nenhum documento armazenado.</div>
    </div>
  );

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

        <button className={styles.premiumBtn} onClick={handleBecomePro}>Seja Premium</button>

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

      {renderBuyModal()}
    </div>
  );
}
