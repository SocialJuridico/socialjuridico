"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Folder, 
  ChevronDown, 
  ChevronRight, 
  Megaphone, 
  Star, 
  UserPlus, 
  Edit, 
  Trash2, 
  Briefcase,
  Search,
  ExternalLink,
  Save,
  X,
  MessageSquare,
  Send,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./AnunciantesAdmin.module.css";

export default function AdminAnunciantesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [anunciantes, setAnunciantes] = useState([]);
  const [openFolderId, setOpenFolderId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [activeChatAnunciante, setActiveChatAnunciante] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAnunciante, setEditAnunciante] = useState(null);
  
  const [newAnunciante, setNewAnunciante] = useState({
    username: "",
    password: "",
    nome_empresa: "",
    whatsapp: ""
  });

  const fetchData = async () => {
    try {
      const res = await fetch("/api/admin/anunciantes", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setAnunciantes(data.data || []);
      }
    } catch (error) {
       toast.error("Erro ao carregar anunciantes");
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAnunciante.username || !newAnunciante.password) {
        toast.error("Preencha todos os campos obrigatórios.");
        return;
    }
    setSaving(true);
    try {
        const res = await fetch("/api/admin/anunciantes", {
            method: "POST",
            body: JSON.stringify({ action: "CREATE_ANUNCIANTE", ...newAnunciante })
        });
        const data = await res.json();
        if (data.success) {
            toast.success("Anunciante criado com sucesso!");
            setShowAddModal(false);
            setNewAnunciante({ username: "", password: "", nome_empresa: "", whatsapp: "" });
            fetchData();
        } else {
           toast.error(data.message || "Erro ao criar");
        }
    } catch (err) {
        toast.error("Erro na conexão");
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este anunciante e todos os seus anúncios?")) return;
    try {
        await fetch("/api/admin/anunciantes", {
            method: "POST",
            body: JSON.stringify({ action: "DELETE_ANUNCIANTE", id })
        });
        toast.success("Anunciante removido");
        fetchData();
    } catch (err) {
        toast.error("Erro ao deletar");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editAnunciante.username) {
        toast.error("Nome de usuário é obrigatório.");
        return;
    }
    setSaving(true);
    try {
        const res = await fetch("/api/admin/anunciantes", {
            method: "POST",
            body: JSON.stringify({ action: "UPDATE_ANUNCIANTE", ...editAnunciante })
        });
        const data = await res.json();
        if (data.success) {
            toast.success("Anunciante atualizado!");
            setShowEditModal(false);
            fetchData();
        } else {
            toast.error(data.message || "Erro ao atualizar");
        }
    } catch (err) {
        toast.error("Erro na conexão");
    } finally {
        setSaving(false);
    }
  };

  const handleToggleDestaque = async (anuncioId, currentState) => {
     try {
        await fetch("/api/admin/anunciantes", {
            method: "POST",
            body: JSON.stringify({ action: "TOGGLE_DESTAQUE", id: anuncioId, em_destaque: !currentState })
        });
        toast.success("Estado de destaque atualizado");
        fetchData();
     } catch (err) {
        toast.error("Erro ao atualizar destaque");
     }
  };

  const fetchMessages = useCallback(async () => {
    if (!showChatModal || !activeChatAnunciante) return;
    try {
      const res = await fetch(`/api/admin/anunciante/suporte/${activeChatAnunciante.id}`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (err) {
      console.error("Erro ao carregar chat");
    }
  }, [showChatModal, activeChatAnunciante]);

  useEffect(() => {
    if (showChatModal && activeChatAnunciante) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [showChatModal, activeChatAnunciante, fetchMessages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatAnunciante) return;
    const msg = newMessage;
    setNewMessage("");
    try {
      const res = await fetch(`/api/admin/anunciante/suporte/${activeChatAnunciante.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...messages, data.data]);
      }
    } catch (err) {
      toast.error("Erro ao enviar");
    }
  };

  const openChat = (anunciante) => {
    setActiveChatAnunciante(anunciante);
    setMessages([]);
    setShowChatModal(true);
  };

  const handleDeleteAnuncio = async (anuncioId) => {
    if (!confirm("Excluir este anúncio permanentemente?")) return;
    try {
        await fetch("/api/admin/anunciantes", {
            method: "POST",
            body: JSON.stringify({ action: "DELETE_ANUNCIO", id: anuncioId })
        });
        toast.success("Anúncio removido");
        fetchData();
    } catch (err) {
        toast.error("Erro ao deletar anúncio");
    }
  };

  if (loading) return <div className={styles.loading}>Carregando sistema de anunciantes...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao dashboard
        </Link>
        <div className={styles.headerTitle}>
          <h1><Megaphone size={24} /> Gestão de Anunciantes</h1>
          <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
            <UserPlus size={18} /> Novo Anunciante
          </button>
        </div>
      </header>

      {/* Grid de "Pastas" */}
      <section className={styles.folderGrid}>
        {anunciantes.length > 0 ? (
          anunciantes.map((anun) => (
            <div key={anun.id} className={`${styles.folderItem} ${openFolderId === anun.id ? styles.activeFolder : ""}`}>
              <div className={styles.folderHeader} onClick={() => setOpenFolderId(openFolderId === anun.id ? null : anun.id)}>
                <div className={styles.folderInfo}>
                  {openFolderId === anun.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <Folder className={styles.folderIcon} size={24} />
                  <div>
                    <strong>{anun.nome_empresa || "Sem Nome"}</strong>
                    <span>@{anun.username} · {anun.anuncios?.length || 0} anúncios</span>
                  </div>
                </div>
                <div className={styles.folderActions}>
                   <button className={styles.editBtnSmall} onClick={(e) => {
                       e.stopPropagation();
                       openChat(anun);
                   }} title="Chat com Anunciante">
                    <MessageSquare size={14} />
                  </button>
                  <button className={styles.editBtnSmall} onClick={(e) => {
                       e.stopPropagation();
                       setEditAnunciante(anun);
                       setShowEditModal(true);
                   }}>
                    <Edit size={14} />
                  </button>
                  <button className={styles.deleteBtnSmall} onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(anun.id);
                  }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Conteúdo da Pasta (Anúncios) */}
              {openFolderId === anun.id && (
                <div className={styles.folderContent}>
                   {anun.anuncios && anun.anuncios.length > 0 ? (
                      <div className={styles.anunciosList}>
                         {anun.anuncios.map((ad) => (
                            <div key={ad.id} className={styles.adCard}>
                               <div className={styles.adTag}>[{ad.categoria}]</div>
                               <h4>{ad.titulo}</h4>
                               <p>{ad.descricao}</p>
                               <div className={styles.adFooter}>
                                  <div className={styles.adStatus}>
                                     {ad.em_destaque ? (
                                        <span className={styles.destaqueBadge}><Star size={12} fill="gold" /> Destaque Ativo</span>
                                     ) : (
                                        <span className={styles.normalBadge}>Sem destaque</span>
                                     )}
                                  </div>
                                  <div className={styles.adActions}>
                                     <button 
                                        className={ad.em_destaque ? styles.btnDestaqueOn : styles.btnDestaqueOff}
                                        onClick={() => handleToggleDestaque(ad.id, ad.em_destaque)}
                                     >
                                        <Star size={14} /> {ad.em_destaque ? "Remover Destaque" : "Dar Destaque"}
                                     </button>
                                     <button className={styles.btnDeleteAd} onClick={() => handleDeleteAnuncio(ad.id)}>
                                        <Trash2 size={14} />
                                     </button>
                                  </div>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className={styles.emptyFolder}>
                         <Briefcase size={32} />
                         <p>Este anunciante ainda não criou anúncios.</p>
                      </div>
                   )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
             Nenhum anunciante cadastrado. Comece criando um novo login acima.
          </div>
        )}
      </section>

      {/* Modal Adicionar Anunciante */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleCreate}>
            <div className={styles.modalHeader}>
              <h2>Novo Anunciante</h2>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)}
                className={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
               <div className={styles.field}>
                  <label>Empresa / Anunciante</label>
                  <input 
                    type="text" 
                    value={newAnunciante.nome_empresa} 
                    onChange={e => setNewAnunciante({...newAnunciante, nome_empresa: e.target.value})}
                    placeholder="Ex: MC Assessoria"
                    required
                  />
               </div>
               <div className={styles.row}>
                  <div className={styles.field}>
                    <label>Usuário (Login)</label>
                    <input 
                        type="text" 
                        value={newAnunciante.username} 
                        onChange={e => setNewAnunciante({...newAnunciante, username: e.target.value})}
                        placeholder="ex: assessoria01"
                        required
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Senha Inicial</label>
                    <input 
                        type="password" 
                        value={newAnunciante.password} 
                        onChange={e => setNewAnunciante({...newAnunciante, password: e.target.value})}
                        placeholder="********"
                        required
                    />
                  </div>
               </div>
               <div className={styles.field}>
                  <label>WhatsApp (Link p/ contato)</label>
                  <input 
                    type="text" 
                    value={newAnunciante.whatsapp} 
                    onChange={e => setNewAnunciante({...newAnunciante, whatsapp: e.target.value})}
                    placeholder="51988887777"
                  />
               </div>
            </div>
            <div className={styles.modalFooter}>
               <button type="submit" className={styles.saveBtn} disabled={saving}>
                 {saving ? "Salvando..." : "Criar Login de Anunciante"}
               </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal Editar Anunciante */}
      {showEditModal && editAnunciante && (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleUpdate}>
            <div className={styles.modalHeader}>
              <h2>Editar Anunciante</h2>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)}
                className={styles.closeBtn}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalBody}>
               <div className={styles.field}>
                  <label>Empresa / Anunciante</label>
                  <input 
                    type="text" 
                    value={editAnunciante.nome_empresa} 
                    onChange={e => setEditAnunciante({...editAnunciante, nome_empresa: e.target.value})}
                    placeholder="Ex: MC Assessoria"
                    required
                  />
               </div>
               <div className={styles.field}>
                    <label>Usuário (Login)</label>
                    <input 
                        type="text" 
                        value={editAnunciante.username} 
                        onChange={e => setEditAnunciante({...editAnunciante, username: e.target.value})}
                        placeholder="ex: assessoria01"
                        required
                    />
                </div>
               <div className={styles.field}>
                  <label>WhatsApp (Link p/ contato)</label>
                  <input 
                    type="text" 
                    value={editAnunciante.whatsapp} 
                    onChange={e => setEditAnunciante({...editAnunciante, whatsapp: e.target.value})}
                    placeholder="51988887777"
                  />
               </div>
               <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>
                 Dica: A senha não pode ser editada por aqui por segurança. O anunciante pode alterá-la no próprio portal.
               </p>
            </div>
            <div className={styles.modalFooter}>
               <button type="submit" className={styles.saveBtn} disabled={saving}>
                 {saving ? "Salvando..." : "Salvar Alterações"}
               </button>
            </div>
          </form>
        </div>
      )}
      {/* Modal Chat Suporte */}
      {showChatModal && activeChatAnunciante && (
        <div className={styles.modalOverlay} onClick={() => setShowChatModal(false)}>
           <div className={`${styles.modal} ${styles.chatModal}`} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={styles.anuncianteAvatar}>{activeChatAnunciante.nome_empresa?.charAt(0)}</div>
                    <div>
                        <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Chat com {activeChatAnunciante.nome_empresa}</h2>
                        <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>Suporte ao Parceiro</span>
                    </div>
                 </div>
                 <button onClick={() => setShowChatModal(false)} className={styles.closeBtn}>
                    <X size={20} />
                 </button>
              </div>

              <div className={styles.chatArea}>
                 {messages.length === 0 && <div className={styles.emptyChat}>Nenhuma mensagem trocada ainda.</div>}
                 {messages.map((msg) => (
                    <div key={msg.id} className={msg.sender_type === "ADMIN" ? styles.adminMsgRow : styles.anuncianteMsgRow}>
                       <div className={msg.sender_type === "ADMIN" ? styles.adminMsg : styles.anuncianteMsg}>
                          {msg.content}
                          <span className={styles.msgTime}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                       </div>
                    </div>
                 ))}
              </div>

              <form onSubmit={sendMessage} className={styles.chatInputRow}>
                 <input 
                    type="text" 
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Responda ao anunciante..." 
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
