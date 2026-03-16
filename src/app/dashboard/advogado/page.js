"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Bell, 
  User, 
  LogOut, 
  Scale, 
  Star,
  ShieldCheck,
  Menu,
  X,
  Upload,
  FileText,
  ImageIcon,
  Trash2,
  MessageSquare,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  Calendar
} from 'lucide-react';
import styles from './Dashboard.module.css';
import { 
  createCasoAction, 
  updateCasoAction,
  getNotificacoesAction,
  updatePasswordAction,
  deleteAccountAction
} from '@/app/actions/authActions';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function AdvogadoDashboard() {
  const [userName, setUserName] = useState('Advogado');
  const [activeTab, setActiveTab] = useState('painel');
  const [casos, setCasos] = useState([]);
  const [loadingCasos, setLoadingCasos] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // States para Edição de Caso
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCaso, setSelectedCaso] = useState(null);
  const [editFormData, setEditFormData] = useState({
    titulo: '',
    area: '',
    descricao: ''
  });
  
  // States para Notificações
  const [notificacoes, setNotificacoes] = useState([]);
  const [loadingNotificacoes, setLoadingNotificacoes] = useState(false);

  // States para Novo Caso
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    titulo: '',
    area: '',
    descricao: ''
  });

  // States para Perfil
  const [profileData, setProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    password: ''
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) setIsSidebarCollapsed(true);
      else setIsSidebarCollapsed(false);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    async function loadInitialData() {
      console.log("Iniciando carga de dados do dashboard...");
      


      // 1.1 Carregar Casos
      console.log("Chamando loadCasos do loadInitialData...");
      loadCasos();

      // 2. Carregar Perfil
      console.log("Chamando loadProfile do loadInitialData...");
      loadProfile();
    }
    loadInitialData();

    // Inscrição em tempo real para novas notificações
    let channel;
    const setupRealtime = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      channel = supabase
        .channel(`public:notificacoes:user_id=eq.${user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notificacoes',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotificacoes(prev => [payload.new, ...prev]);

            toast.custom((t) => (
              <div className={`${styles.toastNotification} ${t.visible ? styles.toastIn : styles.toastOut}`}>
                <div className={styles.toastIcon}>
                   <Bell size={20} color="var(--color-gold)" />
                </div>
                <div className={styles.toastContent}>
                  <p className={styles.toastTitle}>{payload.new.titulo}</p>
                  <p className={styles.toastDesc}>{payload.new.mensagem}</p>
                </div>
              </div>
            ), { duration: 5000 });
          }
        )
        .subscribe();
    };

    setupRealtime();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Monitorar mudança de Tab
  useEffect(() => {
    if (activeTab === 'painel') {
      loadCasos();
    }
    if (activeTab === 'notificacoes') {
      loadNotificacoes();
    }
    if (activeTab === 'perfil') {
      loadProfile();
    }
  }, [activeTab]);

  const loadProfile = async () => {
    setLoadingProfile(true);
    try {
      const response = await fetch('/api/perfil');
      const data = await response.json();
      
      if (data.success) {
        setProfileData(data.data);
        setUserName(data.data.name);
        setProfileForm({
          name: data.data.name,
          phone: data.data.phone || '',
          password: ''
        });
      } else {
        toast.error(data.message || "Erro ao carregar perfil.");
      }
    } catch (err) {
      console.error("Erro carregar perfil:", err);
      toast.error("Erro de conexão ao carregar perfil.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadCasos = async () => {
    console.log("Chamando loadCasos...");
    setLoadingCasos(true);
    try {
      const response = await fetch('/api/casos');
      console.log("Resposta loadCasos:", response.status);
      const data = await response.json();
      if (data.success) {
        console.log("Casos carregados:", data.data.length);
        setCasos(data.data);
      } else {
        console.warn("Falha ao carregar casos:", data.message);
      }
    } catch (err) {
      console.error("Erro ao carregar casos:", err);
    } finally {
      setLoadingCasos(false);
    }
  };

  const handleOpenEditModal = (caso) => {
    setSelectedCaso(caso);
    setEditFormData({
      titulo: caso.titulo || '',
      area: caso.area_atuacao || '',
      descricao: caso.descricao || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateCaso = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch('/api/casos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedCaso.id,
          titulo: editFormData.titulo,
          area_atuacao: editFormData.area,
          descricao: editFormData.descricao
        })
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Caso atualizado com sucesso!");
        setIsEditModalOpen(false);
        loadCasos();
      } else {
        toast.error(data.message || "Erro ao atualizar caso.");
      }
    } catch (err) {
      console.error("Erro ao atualizar caso:", err);
      toast.error("Erro de conexão ao atualizar caso.");
    } finally {
      setFormLoading(false);
    }
  };

  const loadNotificacoes = async () => {
    setLoadingNotificacoes(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      const response = await getNotificacoesAction(user.id);
      if (response.success) {
        setNotificacoes(response.data);
      }
    }
    setLoadingNotificacoes(false);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const isLt5MB = file.size / 1024 / 1024 < 5;
      const isAllowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      return isLt5MB && isAllowed;
    });

    if (selectedFiles.length + validFiles.length > 5) {
      toast.error('Limite máximo de 5 arquivos atingido.');
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitCaso = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const uploadedUrls = [];
      const user = (await supabase.auth.getUser()).data.user;

      if (!user) throw new Error("Usuário não autenticado.");

      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
          .from('CASES')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('CASES')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }

      const result = await createCasoAction({
        titulo: formData.titulo,
        descricao: formData.descricao,
        area_atuacao: formData.area,
        cliente_id: user.id,
        anexos: uploadedUrls
      });

      if (result.success) {
        setFormSuccess(true);
        setFormData({ titulo: '', area: '', descricao: '' });
        setSelectedFiles([]);
        setTimeout(() => {
          setFormSuccess(false);
          setActiveTab('painel');
        }, 3000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error("Erro ao enviar caso:", error);
      toast.error("Erro ao enviar caso.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      // 1. Atualizar Nome e Telefone via API real
      const resProfile = await fetch('/api/perfil', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              name: profileForm.name,
              phone: profileForm.phone
          })
      });
      const dataProfile = await resProfile.json();

      if (!dataProfile.success) throw new Error(dataProfile.message);

      // 2. Atualizar Senha se preenchida
      if (profileForm.password) {
        const resPass = await updatePasswordAction(profileForm.password);
        if (!resPass.success) throw new Error(resPass.message);
      }

      toast.success("Perfil atualizado com sucesso!");
      setUserName(profileForm.name);
      loadProfile();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("TEM CERTEZA? Esta ação é irreversível e excluirá todos os seus dados.")) return;
    
    setFormLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const response = await deleteAccountAction(user.id);
    if (response.success) {
      toast.success("Conta excluída. Sentiremos sua falta.");
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = "/";
    } else {
      toast.error(response.message);
      setFormLoading(false);
    }
  };

  return (
    <div className={`${styles.dashboardContainer} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.menuToggle} onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            {isSidebarCollapsed ? <Menu size={24} /> : <X size={24} />}
          </button>
          
          {!isSidebarCollapsed && (
            <Link href="/" className={styles.logoWrapper}>
              <div className={styles.logoIcon}><Scale size={20} color="#1A1A1A" /></div>
              <span className={styles.logoText}>SocialJurídico</span>
            </Link>
          )}

          {isSidebarCollapsed && (
            <div className={styles.collapsedLogo}>
               <div className={styles.logoIconCompact}><Scale size={20} color="#fff" /></div>
            </div>
          )}
        </div>

        <nav className={styles.nav}>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'painel' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('painel')} title="Painel">
            <LayoutDashboard size={22} />
            {!isSidebarCollapsed && <span>Painel</span>}
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'novo' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('novo')} title="Novos Casos">
            <PlusCircle size={22} />
            {!isSidebarCollapsed && <span>Novos Casos</span>}
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'notificacoes' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('notificacoes')} title="Notificações">
            <Bell size={22} />
            {!isSidebarCollapsed && <span>Notificações</span>}
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'perfil' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('perfil')} title="Meu Perfil">
            <User size={22} />
            {!isSidebarCollapsed && <span>Meu Perfil</span>}
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'meus-casos' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('meus-casos')} title="Meus Casos">
            <FileText size={22} />
            {!isSidebarCollapsed && <span>Meus Casos</span>}
          </Link>
          <Link href="#" className={`${styles.navItem} ${activeTab === 'conversas' ? styles.activeNavItem : ''}`} onClick={() => setActiveTab('conversas')} title="Minhas Conversas">
            <MessageSquare size={22} />
            {!isSidebarCollapsed && <span>Minhas Conversas</span>}
          </Link>
          <button className={`${styles.navItem} ${styles.logoutBtn}`}
            title="Sair"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
          >
            <LogOut size={22} />
            {!isSidebarCollapsed && <span>Sair</span>}
          </button>
        </nav>
      </aside>

      {/* MAIN */}
      <main className={styles.mainContent}>
        <header className={styles.topHeader}>
          <div className={styles.headerInfo}>
            <h1>{
              activeTab === 'painel' ? 'Painel' :
              activeTab === 'novo' ? 'Novos Casos' :
              activeTab === 'notificacoes' ? 'Notificações' :
              activeTab === 'meus-casos' ? 'Meus Casos' :
              activeTab === 'conversas' ? 'Minhas Conversas' :
              'Meu Perfil'
            }</h1>
            <p>Bem-vindo, {userName}</p>
            {profileData && (
              <span style={{fontSize: '10px', opacity: 0.5, display: 'block'}}>ID: {profileData.id} | {profileData.email}</span>
            )}
          </div>
          <div className={styles.userProfile}>
            <div className={styles.avatarCircle}>{userName.substring(0, 2).toUpperCase()}</div>
          </div>
        </header>

        <section className={styles.pageBody}>
          
          {activeTab === 'painel' && (
            <div className={styles.contentGrid}>
              <div className={styles.listSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Meus Casos Atuais</h2>
                </div>
                
                {loadingCasos ? (
                  <p style={{padding: '20px'}}>Carregando seus casos...</p>
                ) : casos.filter(c => c.advogado_id === profileData?.id).length > 0 ? (
                  casos.filter(c => c.advogado_id === profileData?.id).map((caso) => (
                    <div key={caso.id} className={styles.caseCard} onClick={() => handleOpenEditModal(caso)}>
                      <div className={styles.cardTop}>
                        <span className={styles.badge}>{caso.status}</span>
                        <span className={styles.date}>
                          {new Date(caso.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className={styles.caseTitleCard} style={{color: 'var(--color-gold)', margin: '8px 0', fontSize: '1rem'}}>{caso.titulo}</h3>
                      <p className={styles.caseDesc}>{caso.descricao.substring(0, 100)}...</p>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyStateMinimal} style={{padding: '40px 20px', textAlign: 'center', opacity: 0.7}}>
                    <FileText size={48} style={{marginBottom: '12px', color: 'var(--color-gold)'}} />
                    <p>Você ainda não pegou nenhum caso.</p>
                  </div>
                )}
              </div>

              <div className={styles.lawyersSection}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Resumo de Atividades</h2>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px'}}>
                  <div className={styles.statCard} style={{background: 'rgba(212, 175, 55, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.1)'}}>
                    <span style={{display: 'block', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gold)'}}>
                      {casos.filter(c => c.advogado_id === profileData?.id).length}
                    </span>
                    <span style={{fontSize: '0.8rem', opacity: 0.6}}>Casos ativos</span>
                  </div>
                  <div className={styles.statCard} style={{background: 'rgba(212, 175, 55, 0.05)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.1)'}}>
                    <span style={{display: 'block', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-gold)'}}>
                      {notificacoes.filter(n => !n.lida).length}
                    </span>
                    <span style={{fontSize: '0.8rem', opacity: 0.6}}>Notificações</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'novo' && (
            <div className={styles.novosCasosGrid}>
              <div className={styles.sectionHeader} style={{marginBottom: '24px'}}>
                 <h2 className={styles.sectionTitle}>Novos Casos Disponíveis</h2>
                 <p style={{fontSize: '0.8rem', opacity: 0.6}}>Estes casos ainda não possuem um advogado vinculado.</p>
              </div>

              {casos.filter(c => !c.advogado_id && c.status === 'ABERTO').length > 0 ? (
                <div className={styles.lawyersGrid}>
                  {casos.filter(c => !c.advogado_id && c.status === 'ABERTO').map(caso => (
                    <div key={caso.id} className={styles.lawyerCard} style={{textAlign: 'left', alignItems: 'flex-start'}}>
                      <div className={styles.cardTop} style={{width: '100%', display: 'flex', justifyContent: 'space-between'}}>
                        <span className={styles.badge}>{caso.area_atuacao || 'Geral'}</span>
                        <span className={styles.date}>{new Date(caso.created_at).toLocaleDateString()}</span>
                      </div>
                      <h3 className={styles.lawyerName} style={{minHeight: 'auto', textAlign: 'left', justifyContent: 'flex-start', marginTop: '12px'}}>{caso.titulo}</h3>
                      <p className={styles.lawyerSpecs} style={{minHeight: 'auto', textAlign: 'left', justifyContent: 'flex-start', fontSize: '0.8rem'}}>{caso.descricao.substring(0, 120)}...</p>
                      
                      <button 
                        className={styles.contactBtn} 
                        style={{marginTop: 'auto'}}
                        onClick={async () => {
                          if (!confirm("Deseja assumir este caso?")) return;
                          setFormLoading(true);
                          try {
                            const res = await fetch('/api/casos/vincular', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ casoId: caso.id })
                            });
                            const data = await res.json();
                            if (data.success) {
                              toast.success("Caso vinculado com sucesso!");
                              loadCasos();
                            } else {
                              toast.error(data.message);
                            }
                          } catch (err) {
                            toast.error("Erro ao vincular caso.");
                          } finally {
                            setFormLoading(false);
                          }
                        }}
                      >
                        Assumir Caso
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Scale size={48} className={styles.emptyIcon} />
                  <p className={styles.emptyText}>Não há novos casos disponíveis no momento.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notificacoes' && (
            <div className={styles.notificationsContainer}>
              <div className={styles.notificationsHeader}>
                <h2 className={styles.sectionTitle}>Suas Notificações</h2>
                <span className={styles.unreadCount}>
                  {notificacoes.filter(n => !n.lida).length} não lidas
                </span>
              </div>
              
              {loadingNotificacoes ? (
                <p style={{padding: '24px', textAlign: 'center'}}>Carregando notificações...</p>
              ) : notificacoes.length > 0 ? (
                notificacoes.map(notif => (
                  <div key={notif.id} className={styles.notificationItem}>
                    <div className={styles.notificationIcon}>
                      <Bell size={20} />
                    </div>
                    <div className={styles.notificationInfo}>
                      <div className={styles.notificationTop}>
                        <span className={styles.notifTitle}>{notif.titulo}</span>
                        <span className={styles.notifDate}>
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className={styles.notifDesc}>{notif.mensagem}</p>
                    </div>
                    {!notif.lida && <div className={styles.unreadDot}></div>}
                  </div>
                ))
              ) : (
                <div className={styles.emptyState} style={{border: 'none'}}>
                  <Bell size={48} className={styles.emptyIcon} />
                  <p className={styles.emptyText}>Você não tem notificações no momento.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'perfil' && (
            <div className={styles.profileContainer}>
               {loadingProfile ? (
                 <p style={{textAlign: 'center'}}>Carregando seu perfil...</p>
               ) : profileData ? (
                 <>
                   <div className={styles.profileHeader}>
                      <div className={styles.profileAvatarLarge}>
                        {profileData.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className={styles.profileHeaderText}>
                        <h2>{profileData.name}</h2>
                        <p>{profileData.role === 'ADMIN' ? 'Administrador' : profileData.role === 'LAWYER' ? 'Advogado' : 'Cliente'} SocialJurídico</p>
                      </div>
                   </div>

                   <form onSubmit={handleUpdateProfile}>
                      <div className={styles.profileGrid}>
                        <div className={`${styles.profileField} ${styles.editable}`}>
                          <label><User size={14} style={{marginRight: 6}} /> Nome Completo</label>
                          <input 
                            type="text" 
                            className={styles.profileInput}
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                          />
                        </div>

                        <div className={`${styles.profileField} ${styles.editable}`}>
                          <label><Phone size={14} style={{marginRight: 6}} /> Telefone/WhatsApp</label>
                          <input 
                            type="text" 
                            className={styles.profileInput}
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                          />
                        </div>

                        <div className={styles.profileField}>
                          <label><Mail size={14} style={{marginRight: 6}} /> E-mail (Inalterável)</label>
                          <div className={styles.value}>{profileData.email}</div>
                        </div>

                        <div className={`${styles.profileField} ${styles.editable}`}>
                          <label><Lock size={14} style={{marginRight: 6}} /> Alterar Senha</label>
                          <input 
                            type="password" 
                            className={styles.profileInput}
                            placeholder="Deixe em branco para manter"
                            value={profileForm.password}
                            onChange={(e) => setProfileForm({...profileForm, password: e.target.value})}
                          />
                        </div>

                        <div className={styles.profileField}>
                          <label><Calendar size={14} style={{marginRight: 6}} /> Membro desde</label>
                          <div className={styles.value}>
                            {new Date(profileData.created_at || Date.now()).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </div>
                        </div>

                        <div className={styles.profileField}>
                          <label><Scale size={14} style={{marginRight: 6}} /> Tipo de Conta</label>
                          <div className={styles.value}>{profileData.role}</div>
                        </div>
                      </div>

                      <div className={styles.profileActions}>
                        <button type="submit" className={styles.saveProfileBtn} disabled={formLoading}>
                          {formLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                        <button type="button" className={styles.deleteAccountBtn} onClick={handleDeleteAccount} disabled={formLoading}>
                          <Trash2 size={18} style={{marginRight: 8}} /> Excluir Minha Conta
                        </button>
                      </div>
                   </form>
                 </>
               ) : (
                <div className={styles.emptyState}>
                   <User size={48} className={styles.emptyIcon} />
                   <h3 className={styles.sectionTitle}>Perfil não encontrado</h3>
                   <p className={styles.emptyText}>Não foi possível carregar os dados. Verifique sua conexão.</p>
                 </div>
               )}
            </div>
          )}

          {activeTab === 'meus-casos' && (
            <div className={styles.meusCasosPage}>
              <div className={styles.sectionHeader} style={{marginBottom: '24px'}}>
                <h2 className={styles.sectionTitle}>Todos os Meus Casos</h2>
                <button onClick={() => setActiveTab('novo')} className={styles.addNewBtn}>+ Novo Caso</button>
              </div>
              {loadingCasos ? (
                <p style={{padding: '20px', opacity: 0.6}}>Carregando seus casos...</p>
              ) : casos.filter(c => c.advogado_id === profileData?.id).length > 0 ? (
                <div className={styles.casosFullGrid}>
                  {casos.filter(c => c.advogado_id === profileData?.id).map((caso) => (
                    <div key={caso.id} className={styles.caseCardFull} onClick={() => handleOpenEditModal(caso)}>
                      <div className={styles.caseCardHeader}>
                        <span className={styles.badge}>{caso.status}</span>
                        <span className={styles.date}>{new Date(caso.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <h3 className={styles.caseTitleCard}>{caso.titulo}</h3>
                      <p className={styles.caseAreaTag}>{caso.area_atuacao || 'Área não definida'}</p>
                      <p className={styles.caseDesc}>{caso.descricao?.substring(0, 150)}...</p>
                      <div className={styles.caseCardFooter}>
                        <span className={styles.advTag}>✔ Caso sob seu cuidado</span>
                        <span className={styles.editHint}>Clique para ver detalhes →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyStateMinimal} style={{padding: '60px 20px', textAlign: 'center', opacity: 0.7}}>
                  <FileText size={56} style={{marginBottom: '16px', color: 'var(--color-gold)'}} />
                  <p style={{fontSize: '1.1rem', fontWeight: 700}}>Nenhum caso sob sua responsabilidade</p>
                  <p style={{marginTop: '8px', opacity: 0.6}}>Vá em &quot;Novos Casos&quot; para assumir uma nova solicitação.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'conversas' && (
            <div className={styles.conversasPage}>
              <div className={styles.sectionHeader} style={{marginBottom: '24px'}}>
                <h2 className={styles.sectionTitle}>Minhas Conversas</h2>
              </div>
              {loadingCasos ? (
                <p style={{padding: '20px', opacity: 0.6}}>Carregando...</p>
              ) : casos.filter(c => c.advogado_id === profileData?.id).length > 0 ? (
                <div className={styles.conversasList}>
                  {casos.filter(caso => caso.advogado_id === profileData?.id).map((caso) => (
                    <div
                      key={caso.id}
                      className={styles.conversaItem}
                      onClick={() => window.location.href = `/chat/${caso.id}`}
                    >
                      <div className={styles.conversaAvatar}>
                        <Scale size={20} />
                      </div>
                      <div className={styles.conversaInfo}>
                        <h3 className={styles.conversaTitulo}>{caso.titulo}</h3>
                        <p className={styles.conversaArea}>{caso.area_atuacao || 'Área não definida'}</p>
                      </div>
                      <div className={styles.conversaStatus}>
                        <span className={styles.badge}>{caso.status}</span>
                        <span className={styles.conversaArrow}>→</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyStateMinimal} style={{padding: '60px 20px', textAlign: 'center', opacity: 0.7}}>
                  <MessageSquare size={56} style={{marginBottom: '16px', color: 'var(--color-gold)'}} />
                  <p style={{fontSize: '1.1rem', fontWeight: 700}}>Nenhuma conversa ativa</p>
                  <p style={{marginTop: '8px', opacity: 0.6}}>Suas conversas com os clientes aparecerão aqui assim que você assumir um caso.</p>
                </div>
              )}
            </div>
          )}

        </section>
      </main>
      
      {/* MODAL DE EDIÇÃO DE CASO */}
      {isEditModalOpen && selectedCaso && (
        <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
          <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Editar Caso</h2>
              <button className={styles.closeBtn} onClick={() => setIsEditModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateCaso} className={styles.editForm}>
              <div className={styles.formGroup}>
                <label>Título do Caso</label>
                <input 
                  type="text" 
                  value={editFormData.titulo}
                  onChange={(e) => setEditFormData({...editFormData, titulo: e.target.value})}
                  className={styles.modalInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Área de Atuação</label>
                <select 
                  value={editFormData.area}
                  onChange={(e) => setEditFormData({...editFormData, area: e.target.value})}
                  className={styles.modalSelect}
                  required
                >
                  <option value="">Selecione a área</option>
                  <option value="CIVIL">Direito Civil</option>
                  <option value="TRABALHISTA">Direito Trabalhista</option>
                  <option value="PENAL">Direito Penal</option>
                  <option value="FAMILIA">Direito de Família</option>
                  <option value="CONSUMIDOR">Direito do Consumidor</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Descrição Detalhada</label>
                <textarea 
                  value={editFormData.descricao}
                  onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})}
                  className={styles.modalTextarea}
                  required
                />
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.saveChangesBtn} disabled={formLoading}>
                  {formLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>                
                {selectedCaso.advogado_id ? (
                  <Link href={`/chat/${selectedCaso.id}`} className={styles.chatBtn} style={{textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <MessageSquare size={18} style={{marginRight:8}} />
                    Iniciar Chat com Advogado
                  </Link>
                ) : (
                  <button type="button" className={styles.chatBtn} disabled title="Aguardando um advogado ser vinculado ao caso">
                    <MessageSquare size={18} style={{marginRight:8}} />
                    Aguardando advogado...
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
