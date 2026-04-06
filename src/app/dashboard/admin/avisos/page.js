"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Bell, Clock, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./AvisosAdmin.module.css";

export default function AdminAvisosPage() {
  const [loading, setLoading] = useState(true);
  const [avisos, setAvisos] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newAviso, setNewAviso] = useState({
    texto: "",
    dias: "3"
  });

  const loadAvisos = async () => {
    try {
      const res = await fetch("/api/admin/avisos", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setAvisos(data.data || []);
      } else {
        toast.error("Erro ao carregar avisos");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvisos();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newAviso.texto.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/avisos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAviso)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Aviso criado com sucesso!");
        setShowAddModal(false);
        setNewAviso({ texto: "", dias: "3" });
        loadAvisos();
      } else {
        toast.error(data.message || "Erro ao criar aviso");
      }
    } catch (err) {
      toast.error("Erro ao enviar dados");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Deseja realmente excluir este aviso?")) return;

    try {
      const res = await fetch(`/api/admin/avisos?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Aviso excluído");
        setAvisos(prev => prev.filter(a => a.id !== id));
      } else {
        toast.error(data.message || "Erro ao excluir");
      }
    } catch (err) {
      toast.error("Erro ao excluir");
    }
  };

  const toggleAtivo = async (id, currentStatus) => {
    try {
      const res = await fetch("/api/admin/avisos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ativo: !currentStatus })
      });
      if (res.ok) {
        setAvisos(prev => prev.map(a => a.id === id ? { ...a, ativo: !currentStatus } : a));
        toast.success("Status atualizado");
      }
    } catch (err) {
      toast.error("Erro ao atualizar");
    }
  };

  const isExpired = (date) => {
    return new Date(date) < new Date();
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <Link href="/dashboard/admin" className={styles.backBtn}>
            <ArrowLeft size={18} />
          </Link>
          <h1>Gestão de Avisos Dash</h1>
        </div>
        <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
          <Plus size={18} /> Novo Aviso
        </button>
      </header>

      <div className={styles.avisosList}>
        {avisos.length === 0 ? (
          <div className={styles.empty}>Nenhum aviso configurado.</div>
        ) : (
          avisos.map((aviso) => (
            <div key={aviso.id} className={`${styles.avisoCard} ${isExpired(aviso.expira_em) ? styles.expired : ""}`}>
              <div className={styles.avisoMain}>
                <div className={styles.avisoIcon}>
                  <Bell size={20} color={aviso.ativo && !isExpired(aviso.expira_em) ? "#f59e0b" : "#94a3b8"} />
                </div>
                <div className={styles.avisoContent}>
                  <p className={styles.avisoText}>{aviso.texto}</p>
                  <div className={styles.avisoMeta}>
                    <span>
                      <Calendar size={12} /> Expira em: {new Date(aviso.expira_em).toLocaleString("pt-BR")}
                    </span>
                    {isExpired(aviso.expira_em) && (
                      <span className={styles.expiredBadge}>EXPIRADO</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className={styles.avisoActions}>
                <button 
                  className={aviso.ativo ? styles.activeToggle : styles.inactiveToggle}
                  onClick={() => toggleAtivo(aviso.id, aviso.ativo)}
                >
                  {aviso.ativo ? "Ativo" : "Inativo"}
                </button>
                <button 
                  className={styles.deleteBtn}
                  onClick={() => handleDelete(aviso.id)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Criar Novo Aviso</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.formGroup}>
                <label>Texto do Aviso</label>
                <textarea 
                  value={newAviso.texto}
                  onChange={e => setNewAviso({...newAviso, texto: e.target.value})}
                  placeholder="Digite o texto que aparecerá na faixa rolante..."
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Tempo de exibição (dias)</label>
                <div className={styles.daysInput}>
                  <Clock size={16} />
                  <input 
                    type="number" 
                    min="1" 
                    max="30"
                    value={newAviso.dias}
                    onChange={e => setNewAviso({...newAviso, dias: e.target.value})}
                    required
                  />
                  <span>dias</span>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowAddModal(false)} className={styles.cancelBtn}>
                  Cancelar
                </button>
                <button type="submit" className={styles.confirmBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Criando..." : "Criar Aviso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
