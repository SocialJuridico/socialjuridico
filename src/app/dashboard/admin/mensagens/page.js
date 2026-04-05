"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, ChevronRight, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./MensagensAdmin.module.css";

export default function AdminMensagensPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversas, setConversas] = useState([]);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/mensagens", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok || !data.success) {
          toast.error(data.message || "Falha ao carregar mensagens");
          if (res.status === 401 || res.status === 403) {
            router.replace("/dashboard/cliente");
          }
          return;
        }

        setConversas(data.data || []);
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar mensagens");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const executeDelete = async () => {
    if (!partnerToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin-chat?partnerId=${partnerToDelete}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Conversa excluída com sucesso!");
        setConversas(prev => prev.filter(c => c.userId !== partnerToDelete));
        setShowDeleteModal(false);
        setPartnerToDelete(null);
      } else {
        toast.error(data.message || "Erro ao excluir conversa");
      }
    } catch (err) {
      console.error("Erro delete conv:", err);
      toast.error("Erro de conexão ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Carregando mensagens...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1>
          <MessageSquare size={18} /> Mensagens Enviadas
        </h1>
      </header>

      {conversas.length === 0 ? (
        <div className={styles.emptyCard}>
          Você ainda não enviou mensagens para advogados.
        </div>
      ) : (
        <div className={styles.list}>
          {conversas.map((conv) => (
            <div
              key={conv.userId}
              className={styles.item}
              onClick={() => {
                window.location.href = `/chat/admin/${conv.userId}`;
              }}
            >
              <div className={styles.itemTop}>
                <div>
                  <p className={styles.name}>
                    {conv.lawyer?.name || "Advogado"}
                  </p>
                  <p className={styles.meta}>
                    {conv.lawyer?.email || "sem email"}
                    {conv.lawyer?.oab ? ` · OAB ${conv.lawyer.oab}` : ""}
                  </p>
                </div>
                <span className={styles.date}>
                  {conv.lastDate
                    ? new Date(conv.lastDate).toLocaleString("pt-BR")
                    : ""}
                </span>
              </div>

              <p className={styles.previewTitle}>
                {conv.lastTitle || "Mensagem"}
              </p>
              <p className={styles.previewText}>
                {conv.lastMessage || "Sem conteúdo"}
              </p>

              <div className={styles.itemFooter}>
                <span>{conv.totalMessages} mensagem(ns)</span>
                <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                   <button 
                      className={styles.deleteBtnInline}
                      onClick={(e) => {
                         e.stopPropagation();
                         setPartnerToDelete(conv.userId);
                         setShowDeleteModal(true);
                      }}
                      title="Excluir conversa inteira"
                   >
                      <Trash2 size={16} />
                   </button>
                   <span className={styles.openChat}>
                     Abrir chat <ChevronRight size={14} />
                   </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
               <Trash2 size={28} />
            </div>
            <h3>Excluir Conversa?</h3>
            <p>Deseja realmente apagar todas as mensagens enviadas e recebidas deste participante?</p>
            <div className={styles.modalActions}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className={styles.cancelBtn}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                onClick={executeDelete}
                className={styles.deleteBtn}
                disabled={isDeleting}
              >
                {isDeleting ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
