"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Send,
  Trash2,
  Upload,
} from "lucide-react";

import styles from "./AdminDocumentation.module.css";
import { useAdminDocumentation } from "./useAdminDocumentation";

const STATUS_LABELS = {
  UPLOADED: "Aguardando análise",
  PROCESSING: "Processando",
  REVIEW: "Em revisão",
  PUBLISHED: "Publicado",
  FAILED: "Falhou",
  ARCHIVED: "Arquivado",
};

export default function AdminDocumentationPage() {
  const controller = useAdminDocumentation();

  if (controller.loading) {
    return (
      <main className={styles.loadingPage}>
        <span className={styles.spinner} />
        <h1>Carregando documentação</h1>
        <p>Validando publicações, arquivos e processamento.</p>
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
          <span className={styles.eyebrow}>Base de conhecimento administrada</span>
          <h1>Documentação</h1>
          <p>Envie PDFs, revise a estrutura gerada e publique materiais oficiais.</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryButton} onClick={controller.load}>
            <RefreshCw size={16} /> Atualizar
          </button>
          <label className={styles.primaryButton} aria-disabled={controller.uploading}>
            {controller.uploading ? <Loader2 size={16} className={styles.spin} /> : <Upload size={16} />}
            {controller.uploading ? "Analisando..." : "Enviar PDF"}
            <input
              type="file"
              accept="application/pdf,.pdf"
              disabled={controller.uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void controller.upload(file);
              }}
            />
          </label>
        </div>
      </header>

      {controller.loadError && (
        <div className={styles.warningBanner} role="alert">
          <AlertTriangle size={18} />
          <div><strong>Não foi possível atualizar os dados</strong><p>{controller.loadError}</p></div>
        </div>
      )}

      <section className={styles.summaryGrid}>
        <article><strong>{controller.summary?.total || 0}</strong><span>Total</span></article>
        <article><strong>{controller.summary?.review || 0}</strong><span>Em revisão</span></article>
        <article><strong>{controller.summary?.published || 0}</strong><span>Publicados</span></article>
        <article><strong>{controller.summary?.failed || 0}</strong><span>Com falha</span></article>
      </section>

      <section className={styles.workspace}>
        <div className={styles.listColumn}>
          <div className={styles.sectionHeader}><h2>Materiais cadastrados</h2><span>{controller.items.length} item(ns)</span></div>
          {controller.items.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={30} />
              <h3>A documentação está vazia</h3>
              <p>Envie o primeiro PDF para criar um rascunho estruturado.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {controller.items.map((item) => {
                const busy = controller.busyId === item.id;
                return (
                  <article
                    key={item.id}
                    className={controller.selected?.id === item.id ? styles.cardActive : styles.card}
                    onClick={() => controller.select(item)}
                  >
                    <span className={styles.cardIcon}><FileText size={18} /></span>
                    <div className={styles.cardBody}>
                      <div className={styles.cardTitle}>
                        <h3>{item.title}</h3>
                        <span>{STATUS_LABELS[item.status] || item.status}</span>
                      </div>
                      <p>{item.summary || item.source_file_name || "Material ainda sem resumo."}</p>
                      <small>{item.content_type} · versão {item.content_version}</small>
                      <div className={styles.cardActions}>
                        <button type="button" onClick={(event) => { event.stopPropagation(); void controller.process(item); }} disabled={busy || item.status === "PROCESSING"}><Play size={14} /> Processar</button>
                        <button type="button" onClick={(event) => { event.stopPropagation(); void controller.togglePublish(item); }} disabled={busy || !item.content_schema?.blocks?.length}><Send size={14} /> {item.status === "PUBLISHED" ? "Retirar" : "Publicar"}</button>
                        <button type="button" className={styles.dangerButton} onClick={(event) => { event.stopPropagation(); void controller.remove(item); }} disabled={busy}><Trash2 size={14} /> Arquivar</button>
                      </div>
                    </div>
                    {busy && <Loader2 size={17} className={styles.spin} />}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className={styles.editorColumn}>
          {!controller.selected || !controller.form ? (
            <div className={styles.emptyState}><BookOpen size={28} /><h3>Selecione um material</h3><p>Revise os dados antes da publicação.</p></div>
          ) : (
            <div className={styles.editor}>
              <div className={styles.sectionHeader}><h2>Revisão humana</h2><span>{controller.selected.status}</span></div>
              <label><span>Título</span><input value={controller.form.title} maxLength={180} onChange={(event) => controller.updateField("title", event.target.value)} /></label>
              <label><span>Subtítulo</span><input value={controller.form.subtitle} maxLength={260} onChange={(event) => controller.updateField("subtitle", event.target.value)} /></label>
              <label><span>Resumo</span><textarea value={controller.form.summary} maxLength={1200} rows={5} onChange={(event) => controller.updateField("summary", event.target.value)} /></label>
              <div className={styles.formGrid}>
                <label><span>Tipo</span><select value={controller.form.contentType} onChange={(event) => controller.updateField("contentType", event.target.value)}><option value="ARTICLE">Artigo</option><option value="GUIDE">Guia</option><option value="PRESENTATION">Apresentação</option><option value="MANUAL">Manual</option><option value="REFERENCE">Referência</option></select></label>
                <label><span>Público</span><select value={controller.form.targetAudience} onChange={(event) => controller.updateField("targetAudience", event.target.value)}><option value="LAWYER">Advogados</option><option value="BOTH">Ambos</option><option value="CLIENT">Clientes</option></select></label>
                <label><span>Ordem</span><input type="number" min="0" max="100000" value={controller.form.sortOrder} onChange={(event) => controller.updateField("sortOrder", Number(event.target.value))} /></label>
              </div>
              <div className={styles.schemaInfo}>{controller.selected.content_schema?.blocks?.length || 0} bloco(s) estruturado(s)</div>
              {controller.selected.processing_error && <div className={styles.processingError}><AlertTriangle size={16} />{controller.selected.processing_error}</div>}
              <button type="button" className={styles.saveButton} disabled={controller.busyId === controller.selected.id} onClick={() => void controller.save()}>{controller.busyId === controller.selected.id ? <Loader2 size={16} className={styles.spin} /> : null}Salvar revisão</button>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
