"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./MensagensAdmin.module.css";

export default function AdminMensagensPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [conversas, setConversas] = useState([]);

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
            <button
              type="button"
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
                <span className={styles.openChat}>
                  Abrir chat <ChevronRight size={14} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
