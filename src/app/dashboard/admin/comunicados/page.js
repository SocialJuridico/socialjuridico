"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  Send,
  Users,
  UserRound,
  Scale,
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./ComunicadosAdmin.module.css";

const INITIAL_FORM = {
  audience: "all-users",
  recipientId: "",
  title: "",
  message: "",
};

const AUDIENCE_OPTIONS = [
  { value: "single-lawyer", label: "Administrador -> advogado individual" },
  { value: "single-client", label: "Administrador -> cliente individual" },
  { value: "all-lawyers", label: "Administrador -> todos os advogados" },
  { value: "all-clients", label: "Administrador -> todos os clientes" },
  { value: "all-users", label: "Administrador -> todos os usuários" },
];

export default function AdminComunicadosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [clientes, setClientes] = useState([]);
  const [advogados, setAdvogados] = useState([]);

  const loadRecipients = useCallback(async () => {
    const res = await fetch("/api/admin/comunicados", { cache: "no-store" });
    const data = await res.json();

    if (!res.ok || !data.success) {
      toast.error(data.message || "Falha ao carregar destinatários");
      if (res.status === 401 || res.status === 403)
        router.replace("/dashboard/cliente");
      return;
    }

    setClientes(data.data?.clientes || []);
    setAdvogados(data.data?.advogados || []);
  }, [router]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadRecipients();
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar comunicados");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [loadRecipients]);

  const recipientOptions = useMemo(() => {
    if (form.audience === "single-lawyer") {
      return advogados.map((item) => ({
        value: item.id,
        label: `${item.name || "Advogado"} · ${item.email || "sem email"}`,
      }));
    }

    if (form.audience === "single-client") {
      return clientes.map((item) => ({
        value: item.id,
        label: `${item.name || "Cliente"} · ${item.email || "sem email"}`,
      }));
    }

    return [];
  }, [advogados, clientes, form.audience]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Título e mensagem são obrigatórios.");
      return;
    }

    if (
      (form.audience === "single-lawyer" ||
        form.audience === "single-client") &&
      !form.recipientId
    ) {
      toast.error("Selecione o destinatário.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao enviar comunicado");
        return;
      }

      toast.success(data.message || "Comunicado enviado");
      setForm(INITIAL_FORM);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar comunicado");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className={styles.loading}>Carregando comunicados...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1>
          <BellRing size={18} /> Comunicados
        </h1>
      </header>

      <div className={styles.infoGrid}>
        <article className={styles.infoCard}>
          <Users size={18} />
          <strong>{clientes.length}</strong>
          <span>Clientes disponíveis</span>
        </article>
        <article className={styles.infoCard}>
          <Scale size={18} />
          <strong>{advogados.length}</strong>
          <span>Advogados disponíveis</span>
        </article>
        <article className={styles.infoCard}>
          <UserRound size={18} />
          <strong>{clientes.length + advogados.length}</strong>
          <span>Usuários de negócio</span>
        </article>
      </div>

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Público do comunicado</label>
          <select
            value={form.audience}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                audience: e.target.value,
                recipientId: "",
              }))
            }
          >
            {AUDIENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {recipientOptions.length > 0 && (
          <div className={styles.formGroup}>
            <label>Destinatário</label>
            <select
              value={form.recipientId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, recipientId: e.target.value }))
              }
            >
              <option value="">Selecione</option>
              {recipientOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.formGroup}>
          <label>Título</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Ex: Atualização importante da plataforma"
          />
        </div>

        <div className={styles.formGroup}>
          <label>Mensagem</label>
          <textarea
            rows={6}
            value={form.message}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, message: e.target.value }))
            }
            placeholder="Digite o comunicado que será enviado na área de notificações do usuário."
          />
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.sendBtn} disabled={saving}>
            <Send size={16} /> {saving ? "Enviando..." : "Enviar comunicado"}
          </button>
        </div>
      </form>
    </div>
  );
}
