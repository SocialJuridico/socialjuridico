"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./Push.module.css";

export default function AdminPushPage() {
  const [targetMode, setTargetMode] = useState("TODOS");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [advogados, setAdvogados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (targetMode === "ADVOGADO_ESPECIFICO" && advogados.length === 0) {
      fetchUsers("/api/admin/advogados", setAdvogados);
    } else if (targetMode === "CLIENTE_ESPECIFICO" && clientes.length === 0) {
      fetchUsers("/api/admin/clientes", setClientes);
    }
  }, [targetMode, advogados.length, clientes.length]);

  const fetchUsers = async (url, setter) => {
    setLoadingUsers(true);
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setter(data.data || []);
      }
    } catch (e) {
      toast.error("Erro ao carregar lista de usuários.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Preencha o título e a mensagem.");
      return;
    }
    if ((targetMode === "ADVOGADO_ESPECIFICO" || targetMode === "CLIENTE_ESPECIFICO") && !targetId) {
      toast.error("Selecione um destinatário específico.");
      return;
    }

    setLoading(true);
    const notificationPromise = fetch("/api/admin/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetMode, targetId, title, message })
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setTitle("");
      setMessage("");
      return data;
    });

    toast.promise(notificationPromise, {
      loading: "Enviando Push Notification...",
      success: "Notificação disparada com sucesso!",
      error: (err) => err.message || "Erro ao disparar notificação."
    });

    try {
      await notificationPromise;
    } catch (err) {
      // manipulado pelo toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <Link href="/dashboard/admin" className={styles.backBtn}>
            <ArrowLeft size={16} /> Voltar
          </Link>
          <div>
            <h1>Disparar Push Notification</h1>
            <p>Envie mensagens PWA diretamente para os aparelhos dos usuários.</p>
          </div>
        </div>
      </header>

      <form className={styles.formCard} onSubmit={handleSend}>
        <div className={styles.formGroup}>
          <label>Público Alvo</label>
          <select 
            className={styles.select} 
            value={targetMode} 
            onChange={(e) => {
              setTargetMode(e.target.value);
              setTargetId("");
            }}
          >
            <option value="TODOS">Todos os Usuários do Sistema</option>
            <option value="TODOS_ADVOGADOS">Apenas Advogados</option>
            <option value="TODOS_CLIENTES">Apenas Clientes</option>
            <option value="ADVOGADO_ESPECIFICO">Um Advogado Específico</option>
            <option value="CLIENTE_ESPECIFICO">Um Cliente Específico</option>
          </select>
        </div>

        {targetMode === "ADVOGADO_ESPECIFICO" && (
          <div className={styles.formGroup}>
            <label>Selecione o Advogado</label>
            <select 
              className={styles.select}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">-- Escolha um advogado --</option>
              {advogados.map(adv => (
                <option key={adv.id} value={adv.id}>{adv.name} ({adv.email})</option>
              ))}
            </select>
          </div>
        )}

        {targetMode === "CLIENTE_ESPECIFICO" && (
          <div className={styles.formGroup}>
            <label>Selecione o Cliente</label>
            <select 
              className={styles.select}
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">-- Escolha um cliente --</option>
              {clientes.map(cli => (
                <option key={cli.id} value={cli.id}>{cli.name} ({cli.email})</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.formGroup}>
          <label>Título da Notificação</label>
          <input
            type="text"
            className={styles.input}
            placeholder="Ex: Novo Benefício Disponível!"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label>Corpo da Metragem</label>
          <textarea
            className={styles.textarea}
            placeholder="Digite o texto que aparecerá na notificação push do usuário..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={180}
            required
          />
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          <Send size={18} />
          {loading ? "Enviando..." : "Disparar Push"}
        </button>
      </form>
    </div>
  );
}
