"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CalendarClock,
  Edit3,
  Loader2,
  Megaphone,
  Plus,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import styles from "./Push.module.css";

const EMPTY_FORM = {
  id: "",
  title: "",
  message: "",
  severity: "INFO",
  cta_label: "",
  cta_url: "",
  starts_at: "",
  ends_at: "",
  is_active: true,
};

const SEVERITY_LABELS = {
  INFO: "Informativo",
  SUCCESS: "Novidade",
  WARNING: "Atenção",
  CRITICAL: "Urgente",
};

async function readJson(response) {
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.message || "Nao foi possivel concluir a operacao.");
  }
  return payload;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return "Nao informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function noticeStatus(notice) {
  if (!notice.is_active) return { label: "Pausado", className: styles.statusInactive };
  if (notice.expired) return { label: "Expirado", className: styles.statusExpired };
  if (notice.scheduled) return { label: "Agendado", className: styles.statusScheduled };
  if (notice.activeNow) return { label: "Publicado", className: styles.statusActive };
  return { label: "Indefinido", className: styles.statusInactive };
}

export default function AdminPushPage() {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const editing = Boolean(form.id);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/push", { cache: "no-store" });
      const payload = await readJson(response);
      setNotices(payload.notices || []);
    } catch (error) {
      toast.error(error.message || "Erro ao carregar avisos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  const summary = useMemo(() => {
    return notices.reduce(
      (acc, notice) => {
        acc.total += 1;
        if (notice.activeNow) acc.active += 1;
        if (notice.scheduled) acc.scheduled += 1;
        if (notice.expired) acc.expired += 1;
        return acc;
      },
      { total: 0, active: 0, scheduled: 0, expired: 0 },
    );
  }, [notices]);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function editNotice(notice) {
    setForm({
      id: notice.id,
      title: notice.title || "",
      message: notice.message || "",
      severity: notice.severity || "INFO",
      cta_label: notice.cta_label || "",
      cta_url: notice.cta_url || "",
      starts_at: toDateTimeLocal(notice.starts_at),
      ends_at: toDateTimeLocal(notice.ends_at),
      is_active: notice.is_active !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveNotice(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim() || !form.ends_at) {
      toast.error("Preencha titulo, mensagem e data final.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading(editing ? "Atualizando aviso..." : "Cadastrando aviso...");
    try {
      const response = await fetch("/api/admin/push", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await readJson(response);
      toast.success(payload.message || "Aviso salvo.", { id: toastId });
      setForm(EMPTY_FORM);
      await loadNotices();
    } catch (error) {
      toast.error(error.message || "Erro ao salvar aviso.", { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function toggleNotice(notice) {
    setBusyId(notice.id);
    try {
      const response = await fetch("/api/admin/push", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: notice.id, is_active: !notice.is_active }),
      });
      await readJson(response);
      await loadNotices();
    } catch (error) {
      toast.error(error.message || "Erro ao alterar status.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteNotice(notice) {
    const confirmed = window.confirm(`Apagar o aviso "${notice.title}"?`);
    if (!confirmed) return;

    setBusyId(notice.id);
    try {
      const response = await fetch(`/api/admin/push?id=${notice.id}`, {
        method: "DELETE",
      });
      const payload = await readJson(response);
      toast.success(payload.message || "Aviso apagado.");
      if (form.id === notice.id) setForm(EMPTY_FORM);
      await loadNotices();
    } catch (error) {
      toast.error(error.message || "Erro ao apagar aviso.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={15} /> Voltar ao admin
        </Link>
        <div className={styles.titleRow}>
          <span className={styles.titleIcon}><Megaphone size={22} /></span>
          <div>
            <span className={styles.eyebrow}>Avisos internos</span>
            <h1>Comunicados no dashboard do advogado</h1>
            <p>
              Cadastre mensagens temporarias para aparecerem logo abaixo do
              banner de boas-vindas na rota do dashboard dos advogados.
            </p>
          </div>
        </div>
      </header>

      <div className={styles.contentShell}>
        <section className={styles.summaryGrid} aria-label="Resumo dos avisos">
          <article><strong>{summary.total}</strong><span>Total</span></article>
          <article><strong>{summary.active}</strong><span>Publicados</span></article>
          <article><strong>{summary.scheduled}</strong><span>Agendados</span></article>
          <article><strong>{summary.expired}</strong><span>Expirados</span></article>
        </section>

        <section className={styles.formCard}>
          <header className={styles.formHeader}>
            <span className={styles.formIcon}>
              {editing ? <Edit3 size={19} /> : <Plus size={19} />}
            </span>
            <div>
              <span className={styles.formEyebrow}>
                {editing ? "Editar aviso" : "Novo aviso"}
              </span>
              <h2>{editing ? form.title : "Cadastrar comunicado interno"}</h2>
              <p>O aviso aparece somente enquanto estiver ativo e dentro do periodo definido.</p>
            </div>
          </header>

          <form onSubmit={saveNotice}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="title">Titulo</label>
                <input
                  id="title"
                  className={styles.input}
                  value={form.title}
                  maxLength={90}
                  onChange={(event) => updateForm("title", event.target.value)}
                  placeholder="Ex.: Nova atualização disponível"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="severity">Tipo</label>
                <select
                  id="severity"
                  className={styles.select}
                  value={form.severity}
                  onChange={(event) => updateForm("severity", event.target.value)}
                >
                  {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <div className={styles.labelRow}>
                  <label htmlFor="message">Mensagem</label>
                  <span>{form.message.length}/700</span>
                </div>
                <textarea
                  id="message"
                  className={styles.textarea}
                  value={form.message}
                  maxLength={700}
                  onChange={(event) => updateForm("message", event.target.value)}
                  placeholder="Escreva o aviso que sera exibido aos advogados."
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="starts_at">Mostrar a partir de</label>
                <input
                  id="starts_at"
                  className={styles.input}
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) => updateForm("starts_at", event.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="ends_at">Mostrar ate</label>
                <input
                  id="ends_at"
                  className={styles.input}
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(event) => updateForm("ends_at", event.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="cta_label">Texto do botao opcional</label>
                <input
                  id="cta_label"
                  className={styles.input}
                  value={form.cta_label}
                  maxLength={40}
                  onChange={(event) => updateForm("cta_label", event.target.value)}
                  placeholder="Ex.: Ver novidades"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="cta_url">Link do botao opcional</label>
                <input
                  id="cta_url"
                  className={styles.input}
                  value={form.cta_url}
                  maxLength={300}
                  onChange={(event) => updateForm("cta_url", event.target.value)}
                  placeholder="/dashboard/advogado/..."
                />
              </div>

              <label className={`${styles.toggleRow} ${styles.fullWidth}`}>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => updateForm("is_active", event.target.checked)}
                />
                <span>Aviso ativo</span>
              </label>
            </div>

            <footer className={styles.formFooter}>
              <p>
                Caso nao exista aviso ativo no periodo definido, nada sera
                exibido no dashboard do advogado.
              </p>
              {editing && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setForm(EMPTY_FORM)}
                  disabled={saving}
                >
                  Cancelar edição
                </button>
              )}
              <button type="submit" className={styles.primaryButton} disabled={saving}>
                {saving ? <Loader2 size={16} className={styles.spinning} /> : <Bell size={16} />}
                {editing ? "Salvar aviso" : "Cadastrar aviso"}
              </button>
            </footer>
          </form>
        </section>

        <section className={styles.listPanel}>
          <header className={styles.listHeader}>
            <div>
              <span className={styles.formEyebrow}>Avisos cadastrados</span>
              <h2>Publicações internas</h2>
            </div>
            <button type="button" onClick={loadNotices} disabled={loading}>
              {loading ? <Loader2 size={15} className={styles.spinning} /> : <CalendarClock size={15} />}
              Atualizar
            </button>
          </header>

          {loading ? (
            <div className={styles.emptyState}>
              <Loader2 size={22} className={styles.spinning} />
              <span>Carregando avisos...</span>
            </div>
          ) : notices.length === 0 ? (
            <div className={styles.emptyState}>
              <AlertTriangle size={22} />
              <span>Nenhum aviso interno cadastrado.</span>
            </div>
          ) : (
            <div className={styles.noticeList}>
              {notices.map((notice) => {
                const status = noticeStatus(notice);
                const busy = busyId === notice.id;
                return (
                  <article key={notice.id} className={styles.noticeCard}>
                    <div className={styles.noticeInfo}>
                      <span className={`${styles.statusBadge} ${status.className}`}>
                        {status.label}
                      </span>
                      <h3>{notice.title}</h3>
                      <p>{notice.message}</p>
                      <dl>
                        <div><dt>Tipo</dt><dd>{SEVERITY_LABELS[notice.severity] || notice.severity}</dd></div>
                        <div><dt>Inicio</dt><dd>{formatDateTime(notice.starts_at)}</dd></div>
                        <div><dt>Fim</dt><dd>{formatDateTime(notice.ends_at)}</dd></div>
                      </dl>
                    </div>
                    <div className={styles.noticeActions}>
                      <button type="button" onClick={() => editNotice(notice)} disabled={busy}>
                        <Edit3 size={15} /> Editar
                      </button>
                      <button type="button" onClick={() => toggleNotice(notice)} disabled={busy}>
                        {notice.is_active ? "Pausar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => deleteNotice(notice)}
                        disabled={busy}
                      >
                        <Trash2 size={15} /> Apagar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
