"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Film,
  Loader2,
  Pencil,
  PlayCircle,
  RefreshCw,
  Save,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import styles from "./AdminTutorials.module.css";
import { useAdminTutorials } from "./useAdminTutorials";

export default function AdminTutorialsPage() {
  const controller = useAdminTutorials();

  if (controller.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.spinner} />
        <h1>Carregando tutoriais</h1>
        <p>Validando vídeos, rotas e publicações.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <Link href="/dashboard/admin" className={styles.backLink}>
            <ArrowLeft size={16} /> Voltar ao painel admin
          </Link>
          <span className={styles.eyebrow}>Ajuda contextual administrada</span>
          <h1>Tutoriais</h1>
          <p>Publique vídeos por perfil e rota, com controle de primeira visualização por versão.</p>
        </div>
        <button type="button" className={styles.secondaryButton} onClick={controller.load}>
          <RefreshCw size={16} /> Atualizar
        </button>
      </header>

      {controller.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} />
          <div><strong>Não foi possível atualizar os dados</strong><p>{controller.loadError}</p></div>
        </div>
      )}

      <section className={styles.summaryGrid}>
        <article><strong>{controller.summary?.total || 0}</strong><span>Total</span></article>
        <article><strong>{controller.summary?.published || 0}</strong><span>Publicados</span></article>
        <article><strong>{controller.summary?.draft || 0}</strong><span>Rascunhos</span></article>
      </section>

      <section className={styles.workspace}>
        <div className={styles.formColumn}>
          <div className={styles.sectionHeader}>
            <div><span className={styles.eyebrow}>{controller.editing ? "Edição" : "Novo vídeo"}</span><h2>{controller.editing ? "Editar tutorial" : "Cadastrar tutorial"}</h2></div>
            {controller.editing && <button type="button" onClick={controller.reset} aria-label="Cancelar edição"><X size={17} /></button>}
          </div>
          <div className={styles.form}>
            <label><span>Título</span><input value={controller.form.title} maxLength={180} onChange={(event) => controller.updateField("title", event.target.value)} /></label>
            <label><span>Descrição</span><textarea rows={4} maxLength={1200} value={controller.form.description} onChange={(event) => controller.updateField("description", event.target.value)} /></label>
            <div className={styles.formGrid}>
              <label><span>Público</span><select value={controller.form.audience} onChange={(event) => controller.updateField("audience", event.target.value)}><option value="LAWYER">Advogado</option><option value="CLIENT">Cliente</option></select></label>
              <label><span>Versão</span><input type="number" min="1" max="10000" value={controller.form.version} onChange={(event) => controller.updateField("version", Number(event.target.value))} /></label>
              <label className={styles.fieldWide}><span>Rota vinculada</span><select value={controller.form.routeKey} onChange={(event) => controller.updateField("routeKey", event.target.value)}>{controller.routes.map((route) => <option key={route.key} value={route.key}>{route.label}</option>)}</select></label>
              <label><span>Ordem</span><input type="number" min="0" max="100000" value={controller.form.sortOrder} onChange={(event) => controller.updateField("sortOrder", Number(event.target.value))} /></label>
              <label className={styles.checkField}><input type="checkbox" checked={controller.form.autoOpen} onChange={(event) => controller.updateField("autoOpen", event.target.checked)} /><span>Abrir automaticamente no primeiro acesso</span></label>
            </div>
            {!controller.editing && <label className={styles.fileField}><Upload size={18} /><span>{controller.form.file?.name || "Selecionar vídeo MP4 ou WebM"}</span><input type="file" accept="video/mp4,video/webm,.mp4,.webm" onChange={(event) => controller.updateField("file", event.target.files?.[0] || null)} /></label>}
            <button type="button" className={styles.saveButton} disabled={controller.saving} onClick={() => void controller.save()}>{controller.saving ? <Loader2 size={16} className={styles.spin} /> : <Save size={16} />}{controller.editing ? "Salvar alterações" : "Enviar tutorial"}</button>
          </div>
        </div>

        <div className={styles.listColumn}>
          <div className={styles.sectionHeader}><div><span className={styles.eyebrow}>Biblioteca</span><h2>Vídeos cadastrados</h2></div><span>{controller.items.length} item(ns)</span></div>
          {controller.items.length === 0 ? (
            <div className={styles.emptyState}><Film size={30} /><h3>Nenhum tutorial cadastrado</h3><p>Envie o primeiro vídeo e vincule-o a uma rota.</p></div>
          ) : (
            <div className={styles.list}>
              {controller.items.map((item) => {
                const busy = controller.busyId === item.id;
                return (
                  <article key={item.id} className={styles.card}>
                    <div className={styles.preview}>
                      {item.playback_url ? <video src={item.playback_url} controls preload="metadata" /> : <PlayCircle size={30} />}
                    </div>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}><h3>{item.title}</h3><span>{item.status}</span></div>
                      <p>{item.description || "Sem descrição."}</p>
                      <small>{item.audience} · {item.route_key} · versão {item.version}</small>
                      <div className={styles.cardActions}>
                        <button type="button" onClick={() => controller.edit(item)} disabled={busy}><Pencil size={14} /> Editar</button>
                        <button type="button" onClick={() => void controller.togglePublish(item)} disabled={busy}><Send size={14} /> {item.status === "PUBLISHED" ? "Retirar" : "Publicar"}</button>
                        <button type="button" className={styles.dangerButton} onClick={() => void controller.remove(item)} disabled={busy}><Trash2 size={14} /> Arquivar</button>
                      </div>
                    </div>
                    {busy && <Loader2 size={17} className={styles.spin} />}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
