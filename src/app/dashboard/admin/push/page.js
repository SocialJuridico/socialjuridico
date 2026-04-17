"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Mail, Bell } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./Push.module.css";

export default function AdminPushPage() {
  // ═══ Tab state ═══
  const [activeTab, setActiveTab] = useState("push"); // "push" | "email"

  // ═══ Push state ═══
  const [targetMode, setTargetMode] = useState("TODOS");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ═══ Email state ═══
  const [emailTargetMode, setEmailTargetMode] = useState("EMAIL_TODOS_ADVOGADOS");
  const [emailTargetId, setEmailTargetId] = useState("");
  const [emailTitle, setEmailTitle] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  // ═══ Users lists ═══
  const [advogados, setAdvogados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [anunciantes, setAnunciantes] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch users para Push
  useEffect(() => {
    if (targetMode === "ADVOGADO_ESPECIFICO" && advogados.length === 0) {
      fetchUsers("/api/admin/advogados", setAdvogados);
    } else if (targetMode === "CLIENTE_ESPECIFICO" && clientes.length === 0) {
      fetchUsers("/api/admin/clientes", setClientes);
    }
  }, [targetMode, advogados.length, clientes.length]);

  // Fetch users para Email
  useEffect(() => {
    if (emailTargetMode === "EMAIL_ADVOGADO_ESPECIFICO" && advogados.length === 0) {
      fetchUsers("/api/admin/advogados", setAdvogados);
    } else if (emailTargetMode === "EMAIL_CLIENTE_ESPECIFICO" && clientes.length === 0) {
      fetchUsers("/api/admin/clientes", setClientes);
    } else if (emailTargetMode === "EMAIL_ANUNCIANTE_ESPECIFICO" && anunciantes.length === 0) {
      fetchAnunciantes();
    }
  }, [emailTargetMode, advogados.length, clientes.length, anunciantes.length]);

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

  const fetchAnunciantes = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/anunciantes");
      const data = await res.json();
      if (data.success) {
        setAnunciantes(data.data || []);
      }
    } catch (e) {
      toast.error("Erro ao carregar anunciantes.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // ═══ PUSH Submit ═══
  const handleSendPush = async (e) => {
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

  // ═══ EMAIL Submit ═══
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailTitle.trim() || !emailMessage.trim()) {
      toast.error("Preencha o título e a mensagem do email.");
      return;
    }
    const specificModes = ["EMAIL_ADVOGADO_ESPECIFICO", "EMAIL_CLIENTE_ESPECIFICO", "EMAIL_ANUNCIANTE_ESPECIFICO"];
    if (specificModes.includes(emailTargetMode) && !emailTargetId) {
      toast.error("Selecione um destinatário específico.");
      return;
    }

    setEmailLoading(true);
    const emailPromise = fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetMode: emailTargetMode,
        targetId: emailTargetId,
        title: emailTitle,
        message: emailMessage,
      })
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setEmailTitle("");
      setEmailMessage("");
      return data;
    });

    toast.promise(emailPromise, {
      loading: "Enviando emails...",
      success: (data) => data.message || "Emails enviados com sucesso!",
      error: (err) => err.message || "Erro ao enviar emails."
    });

    try {
      await emailPromise;
    } catch (err) {
      // manipulado pelo toast
    } finally {
      setEmailLoading(false);
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
            <h1>Comunicação & Marketing</h1>
            <p>Envie Push Notifications ou Emails para os usuários da plataforma.</p>
          </div>
        </div>
      </header>

      {/* ═══ TABS ═══ */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "push" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("push")}
        >
          <Bell size={16} />
          Push Notification
        </button>
        <button
          className={`${styles.tab} ${activeTab === "email" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("email")}
        >
          <Mail size={16} />
          Email
        </button>
      </div>

      {/* ═══════ ABA PUSH ═══════ */}
      {activeTab === "push" && (
        <form className={styles.formCard} onSubmit={handleSendPush}>
          <div className={styles.formCardHeader}>
            <Bell size={18} color="#d4af37" />
            <div>
              <h2>Disparar Push Notification</h2>
              <p>Envie mensagens PWA diretamente para os aparelhos dos usuários.</p>
            </div>
          </div>

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
            <label>Corpo da Mensagem</label>
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
      )}

      {/* ═══════ ABA EMAIL ═══════ */}
      {activeTab === "email" && (
        <form className={styles.formCard} onSubmit={handleSendEmail}>
          <div className={styles.formCardHeader}>
            <Mail size={18} color="#d4af37" />
            <div>
              <h2>Enviar Email</h2>
              <p>Envie emails com template profissional para os usuários da plataforma.</p>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Destinatários</label>
            <select
              className={styles.select}
              value={emailTargetMode}
              onChange={(e) => {
                setEmailTargetMode(e.target.value);
                setEmailTargetId("");
              }}
            >
              <option value="EMAIL_TODOS_ADVOGADOS">📧 Todos os Advogados</option>
              <option value="EMAIL_TODOS_CLIENTES">📧 Todos os Clientes</option>
              <option value="EMAIL_TODOS_ANUNCIANTES">📧 Todos os Anunciantes</option>
              <option value="EMAIL_ADVOGADO_ESPECIFICO">👤 Um Advogado Específico</option>
              <option value="EMAIL_CLIENTE_ESPECIFICO">👤 Um Cliente Específico</option>
              <option value="EMAIL_ANUNCIANTE_ESPECIFICO">👤 Um Anunciante Específico</option>
            </select>
          </div>

          {emailTargetMode === "EMAIL_ADVOGADO_ESPECIFICO" && (
            <div className={styles.formGroup}>
              <label>Selecione o Advogado</label>
              <select
                className={styles.select}
                value={emailTargetId}
                onChange={(e) => setEmailTargetId(e.target.value)}
                disabled={loadingUsers}
              >
                <option value="">-- Escolha um advogado --</option>
                {advogados.map(adv => (
                  <option key={adv.id} value={adv.id}>{adv.name} ({adv.email})</option>
                ))}
              </select>
            </div>
          )}

          {emailTargetMode === "EMAIL_CLIENTE_ESPECIFICO" && (
            <div className={styles.formGroup}>
              <label>Selecione o Cliente</label>
              <select
                className={styles.select}
                value={emailTargetId}
                onChange={(e) => setEmailTargetId(e.target.value)}
                disabled={loadingUsers}
              >
                <option value="">-- Escolha um cliente --</option>
                {clientes.map(cli => (
                  <option key={cli.id} value={cli.id}>{cli.name} ({cli.email})</option>
                ))}
              </select>
            </div>
          )}

          {emailTargetMode === "EMAIL_ANUNCIANTE_ESPECIFICO" && (
            <div className={styles.formGroup}>
              <label>Selecione o Anunciante</label>
              <select
                className={styles.select}
                value={emailTargetId}
                onChange={(e) => setEmailTargetId(e.target.value)}
                disabled={loadingUsers}
              >
                <option value="">-- Escolha um anunciante --</option>
                {anunciantes.map(anun => (
                  <option key={anun.id} value={anun.id}>{anun.nome_empresa || anun.username} ({anun.email || 'sem email'})</option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Título do Email</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Ex: Novidades na Plataforma Social Jurídico"
              value={emailTitle}
              onChange={(e) => setEmailTitle(e.target.value)}
              maxLength={100}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Mensagem do Email</label>
            <textarea
              className={styles.textareaLarge}
              placeholder="Digite a mensagem que será exibida no corpo do email. Use quebras de linha para formatar o texto..."
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={`${styles.submitBtn} ${styles.submitBtnEmail}`} disabled={emailLoading}>
            <Mail size={18} />
            {emailLoading ? "Enviando..." : "Enviar Email"}
          </button>
        </form>
      )}
    </div>
  );
}
