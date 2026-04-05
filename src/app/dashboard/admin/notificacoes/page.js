'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Bell, 
  Trash2, 
  ArrowLeft, 
  MessageSquare,
  Search,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Notificacoes.module.css';

export default function AdminNotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notifToDelete, setNotifToDelete] = useState(null);

  const fetchNotificacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notificacoes');
      const data = await res.json();
      if (data.success) {
        setNotificacoes(data.data || []);
      }
    } catch (err) {
      console.error("Erro fetch Notificações:", err);
      toast.error("Erro ao carregar notificações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotificacoes();
  }, [fetchNotificacoes]);

  const handleDelete = (id) => {
    setNotifToDelete(id);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    if (!notifToDelete) return;
    try {
      const res = await fetch(`/api/notificacoes?id=${notifToDelete}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success("Notificação removida!");
        setNotificacoes(prev => prev.filter(n => n.id !== notifToDelete));
        setShowDeleteConfirm(false);
        setNotifToDelete(null);
      } else {
        toast.error(data.message || "Erro ao remover.");
      }
    } catch (err) {
      console.error("Erro delete notif:", err);
      toast.error("Erro de conexão.");
    }
  };

  const filtered = notificacoes.filter(n => 
    (n.titulo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.mensagem || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link href="/dashboard/admin" className={styles.backBtn}>
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1>Minhas Notificações</h1>
            <p>Gerencie as mensagens e alertas recebidos pelo sistema.</p>
          </div>
        </div>
        <div className={styles.searchWrapper}>
           <Search size={18} className={styles.searchIcon} />
           <input 
              type="text" 
              placeholder="Buscar notificações..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
           />
        </div>
      </header>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>Carregando...</div>
        ) : filtered.length > 0 ? (
          <div className={styles.notifGrid}>
            {filtered.map((notif) => (
              <div key={notif.id} className={styles.notifCard}>
                <div className={styles.notifHeader}>
                   <div className={styles.notifIcon}>
                      <Bell size={20} color="#d4af37" />
                   </div>
                   <div className={styles.notifTitleInfo}>
                      <h3>{notif.titulo}</h3>
                      <span className={styles.notifDate}>
                         <Clock size={12} style={{ marginRight: 4 }} />
                         {new Date(notif.created_at).toLocaleString('pt-BR')}
                      </span>
                   </div>
                   <button 
                      className={styles.deleteBtn} 
                      onClick={() => handleDelete(notif.id)}
                      title="Apagar notificação"
                   >
                      <Trash2 size={16} />
                   </button>
                </div>
                <p className={styles.notifMensagem}>{notif.mensagem}</p>
                {notif.meta && (
                   <div className={styles.notifFooter}>
                      <span className={styles.notifTypeBadge}>{notif.tipo || "Geral"}</span>
                   </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
             <MessageSquare size={48} style={{ opacity: 0.1, marginBottom: 15 }} />
             <p>Nenhuma notificação encontrada.</p>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
             <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Trash2 size={32} />
             </div>
             <h3>Excluir Notificação?</h3>
             <p>Esta mensagem será removida permanentemente da sua caixa de entrada.</p>
             <div className={styles.modalActions}>
                <button onClick={() => setShowDeleteConfirm(false)} className={styles.btnCancel}>Cancelar</button>
                <button onClick={executeDelete} className={styles.btnDelete}>Excluir Agora</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
