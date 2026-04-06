"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  BarChart3, 
  Trash2, 
  Plus, 
  PlusCircle, 
  User, 
  LogOut, 
  Zap, 
  Users, 
  MapPin, 
  Save, 
  Key, 
  Sparkles,
  Send,
  Loader2,
  X,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./DashboardAnunciante.module.css";
import { useRouter } from "next/navigation";

export default function AnuncianteDashboard() {
  const [activeTab, setActiveTab] = useState("meus-anuncios");
  const [anuncios, setAnuncios] = useState([]);
  const [loadingAnuncios, setLoadingAnuncios] = useState(true);
  const [showNewAdModal, setShowNewAdModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const router = useRouter();

  const [newAd, setNewAd] = useState({
    titulo: "",
    descricao: "",
    categoria: "PREPOSTOS",
    contato: "",
  });

  const [perfil, setPerfil] = useState({
    senha: "",
    repeteSenha: "",
  });

  const fetchAnuncios = useCallback(async () => {
    setLoadingAnuncios(true);
    try {
      const res = await fetch("/api/anunciante/ads");
      const data = await res.json();
      if (data.success) {
        setAnuncios(data.data);
      }
    } catch (err) {
      toast.error("Erro ao carregar anúncios");
    } finally {
      setLoadingAnuncios(false);
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!showChatModal) return;
    setLoadingChat(true);
    try {
      const res = await fetch("/api/anunciante/suporte");
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error("Erro ao carregar chat");
    } finally {
      setLoadingChat(false);
    }
  }, [showChatModal]);

  useEffect(() => {
    fetchAnuncios();
  }, [fetchAnuncios]);

  useEffect(() => {
    if (showChatModal) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [showChatModal, fetchMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage;
    setNewMessage("");
    try {
      const res = await fetch("/api/anunciante/suporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...messages, data.data]);
      }
    } catch (err) {
      toast.error("Erro ao enviar mensagem");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/anunciante/perfil", { 
      method: "POST", 
      body: JSON.stringify({ logout: true }),
      headers: { "Content-Type": "application/json" }
    });
    router.push("/login-anunciante");
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/anunciante/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAd),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Anúncio criado com sucesso!");
        setShowNewAdModal(false);
        setNewAd({ titulo: "", descricao: "", categoria: "PREPOSTOS", contato: "" });
        fetchAnuncios();
      } else {
        toast.error(data.details || data.message || "Erro ao criar anúncio");
      }
    } catch (err) {
      toast.error("Erro ao criar anúncio");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAd = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este anúncio?")) return;
    try {
      const res = await fetch(`/api/anunciante/ads/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Anúncio excluído!");
        fetchAnuncios();
      }
    } catch (err) {
      toast.error("Erro ao excluir");
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (perfil.senha !== perfil.repeteSenha) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (perfil.senha.length < 4) {
        toast.error("A senha deve ter pelo menos 4 caracteres");
        return;
    }
    try {
      const res = await fetch("/api/anunciante/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha: perfil.senha }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Senha alterada com sucesso!");
        setPerfil({ senha: "", repeteSenha: "" });
      } else {
          toast.error(data.message);
      }
    } catch (err) {
      toast.error("Erro ao atualizar senha");
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
           <div className={styles.logo}>
             <Zap size={24} color="#d4af37" fill="#d4af37" />
             <span style={{ fontWeight: 800 }}>Portal Parceiros</span>
           </div>
        </div>

        <nav className={styles.nav}>
          <div 
            className={`${styles.navItem} ${activeTab === "meus-anuncios" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("meus-anuncios")}
          >
            <BarChart3 size={20} />
            <span>Meus Anúncios</span>
          </div>
          <div 
            className={`${styles.navItem} ${activeTab === "perfil" ? styles.activeNav : ""}`}
            onClick={() => setActiveTab("perfil")}
          >
            <User size={20} />
            <span>Minha Conta</span>
          </div>
        </nav>

        <div className={styles.sidebarFooter} onClick={handleLogout}>
          <div className={styles.logoutBtn}>
            <LogOut size={20} />
            <span>Sair do Portal</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.welcome}>
            <h1>Bem-vindo Parceiro</h1>
            <p>Gerencie sua vitrine de serviços para advogados.</p>
          </div>
          <button className={styles.newAdBtn} onClick={() => setShowNewAdModal(true)}>
             <Plus size={20} /> Novo Anúncio
          </button>
        </header>

        <section className={styles.content}>
          {activeTab === "meus-anuncios" && (
            <div className={styles.adsSection}>
              <div className={styles.sectionHeader}>
                <h2>Listagem de Anúncios</h2>
                <span className={styles.countBadge}>{anuncios.length} anúncios ativos</span>
              </div>

              {loadingAnuncios ? (
                <div className={styles.loading}>Sincronizando com servidor...</div>
              ) : anuncios.length > 0 ? (
                <div className={styles.adsGrid}>
                  {anuncios.map(ad => (
                    <div key={ad.id} className={styles.adCard}>
                      <div className={styles.adHeader}>
                        <div className={styles.adTitleArea}>
                           <span className={styles.categoryTag}>{ad.categoria}</span>
                           <h3>{ad.titulo}</h3>
                        </div>
                        <div className={styles.adStatus}>
                           {ad.em_destaque && <span className={styles.destaqueBadge}><Sparkles size={10} /> DESTAQUE</span>}
                           <span className={styles.statusActive}>{ad.status}</span>
                        </div>
                      </div>
                      <p className={styles.adDesc}>{ad.descricao}</p>
                      <div className={styles.adFooter}>
                        <span className={styles.adDate}>Publicado em {new Date(ad.created_at).toLocaleDateString()}</span>
                        <button className={styles.deleteBtn} onClick={() => handleDeleteAd(ad.id)}>
                          <Trash2 size={16} /> Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                   <PlusCircle size={48} color="rgba(212,175,55,0.2)" />
                   <h3 style={{ marginTop: '20px' }}>Você ainda não tem anúncios</h3>
                   <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>Publique seus serviços para começar a receber contatos de advogados interessados.</p>
                   <button onClick={() => setShowNewAdModal(true)} style={{ background: '#d4af37', color: '#000', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 800, cursor: 'pointer' }}>
                     Criar Primeiro Anúncio
                   </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "perfil" && (
            <div className={styles.profileSection}>
               <div className={styles.profileCard}>
                 <div className={styles.profileHeader}>
                    <Key size={32} color="#d4af37" />
                    <div>
                      <h2>Segurança da Conta</h2>
                      <p style={{ color: 'rgba(255,255,255,0.5)' }}>Altere sua senha de acesso ao portal.</p>
                    </div>
                 </div>
                 <form className={styles.passwordForm} onSubmit={handleUpdatePassword}>
                    <div className={styles.formGroup}>
                       <label>Nova Senha</label>
                       <input 
                         type="password" 
                         value={perfil.senha} 
                         onChange={(e) => setPerfil({...perfil, senha: e.target.value})} 
                         placeholder="Crie uma senha segura"
                         required
                       />
                    </div>
                    <div className={styles.formGroup}>
                       <label>Confirmar Nova Senha</label>
                       <input 
                         type="password" 
                         value={perfil.repeteSenha} 
                         onChange={(e) => setPerfil({...perfil, repeteSenha: e.target.value})} 
                         placeholder="Repita a nova senha"
                         required
                       />
                    </div>
                    <button type="submit" className={styles.saveBtn}>
                       <Save size={20} /> Salvar Nova Senha
                    </button>
                 </form>
               </div>

               <div className={styles.profileCard} style={{ marginTop: '30px', background: 'rgba(212,175,55,0.02)' }}>
                  <div className={styles.profileHeader}>
                    <Users size={32} color="#d4af37" />
                    <div>
                      <h2>Suporte ao Parceiro</h2>
                      <p style={{ color: 'rgba(255,255,255,0.5)' }}>Precisa de ajuda ou quer contratar destaque?</p>
                    </div>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    Nossa equipe de administração está disponível para retirar dúvidas, auxiliar na criação de anúncios premium e gerenciar sua vitrine.
                  </p>
                  <button 
                    onClick={() => setShowChatModal(true)}
                    style={{ background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '20px', color: '#d4af37', fontWeight: 700, cursor: 'pointer' }}>
                     Falar com Administrador <Zap size={16} />
                  </button>
               </div>
            </div>
          )}
        </section>
      </main>

      {/* MODAL NEW AD */}
      {showNewAdModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewAdModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Novo Anúncio de Serviço</h2>
              <button 
                onClick={() => setShowNewAdModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
              >✕</button>
            </div>
            <form onSubmit={handleCreateAd}>
              <div className={styles.formGroup}>
                <label>Título Chamativo</label>
                <input 
                  type="text" 
                  value={newAd.titulo} 
                  onChange={e => setNewAd({...newAd, titulo: e.target.value})} 
                  placeholder="Ex: Preposto Ágil - Porto Alegre e Região"
                  required
                />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Tipo de Serviço</label>
                  <select 
                    value={newAd.categoria} 
                    onChange={e => setNewAd({...newAd, categoria: e.target.value})}
                  >
                    <option value="PREPOSTOS">PREPOSTOS</option>
                    <option value="DILIGENCIAS">DILIGÊNCIAS</option>
                    <option value="OUTROS">OUTROS</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>WhatsApp (DDD + Número)</label>
                  <input 
                    type="text" 
                    value={newAd.contato} 
                    onChange={e => setNewAd({...newAd, contato: e.target.value})} 
                    placeholder="Ex: 51993392983"
                    required
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Descrição do Serviço (Destaque o que você faz melhor)</label>
                <textarea 
                  value={newAd.descricao} 
                  onChange={e => setNewAd({...newAd, descricao: e.target.value})} 
                  rows={4}
                  placeholder="Descreva suas cidades atendidas, horários, especialidades e diferenciais técnicos..."
                  required
                />
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowNewAdModal(false)}>Cancelar</button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Publicar agora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL CHAT SUPPORT */}
      {showChatModal && (
        <div className={styles.modalOverlay} onClick={() => setShowChatModal(false)}>
          <div className={`${styles.modalContent} ${styles.chatModal}`} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                 <div className={styles.adminAvatar}>A</div>
                 <div>
                    <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Suporte Administrativo</h2>
                    <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></div> Online agora
                    </span>
                 </div>
              </div>
              <button onClick={() => setShowChatModal(false)}>✕</button>
            </div>
            
            <div className={styles.chatArea}>
               {messages.length === 0 && !loadingChat && (
                 <div className={styles.emptyChat}>
                    <MessageSquare size={32} opacity={0.2} />
                    <p>Inicie a conversa enviando uma mensagem abaixo.</p>
                 </div>
               )}
               {messages.map((msg) => (
                 <div key={msg.id} className={msg.sender_type === "ANUNCIANTE" ? styles.myMsgRow : styles.adminMsgRow}>
                    <div className={msg.sender_type === "ANUNCIANTE" ? styles.myMsg : styles.adminMsg}>
                       {msg.content}
                       <span className={styles.msgTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                 </div>
               ))}
               {loadingChat && messages.length === 0 && <div className={styles.loadingChat}>Carregando mensagens...</div>}
            </div>

            <form onSubmit={sendMessage} className={styles.chatInputRow}>
               <input 
                 type="text" 
                 value={newMessage} 
                 onChange={e => setNewMessage(e.target.value)} 
                 placeholder="Digite sua mensagem..."
               />
               <button type="submit">
                 <Send size={18} />
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
