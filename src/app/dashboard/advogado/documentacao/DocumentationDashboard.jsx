"use client";

import {
  AlertTriangle,
  BookOpen,
  FileText,
  Layers3,
  Library,
  ListChecks,
  Presentation,
  RefreshCw,
  Search,
} from "lucide-react";

import LawyerDashboardShell from "../components/LawyerDashboardShell";
import styles from "./Documentacao.module.css";
import PresentationFrame from "./PresentationFrame";
import { useDocumentation } from "./useDocumentation";

const TYPE_META = {
  ARTICLE: { label: "Artigo", icon: FileText },
  GUIDE: { label: "Guia", icon: ListChecks },
  PRESENTATION: { label: "Apresentação", icon: Presentation },
  MANUAL: { label: "Manual", icon: BookOpen },
  REFERENCE: { label: "Referência", icon: Library },
};

function formatDate(value) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

function DocumentationBlock({ block, index, documentSlug }) {
  if (!block || typeof block !== "object") return null;

  if (block.type === "heading") {
    return (
      <section className={styles.sectionBlock}>
        <span className={styles.sectionNumber}>{String(index + 1).padStart(2, "0")}</span>
        <div>
          {block.title && <h2>{block.title}</h2>}
          {block.text && <p>{block.text}</p>}
        </div>
      </section>
    );
  }
  if (block.type === "paragraph") {
    return <section className={styles.textBlock}>{block.title && <h3>{block.title}</h3>}<p>{block.text}</p></section>;
  }
  if (block.type === "list") {
    return (
      <section className={styles.textBlock}>
        {block.title && <h3>{block.title}</h3>}
        <ul>{(block.items || []).map((item, itemIndex) => <li key={`${block.id || index}-${itemIndex}`}>{item}</li>)}</ul>
      </section>
    );
  }
  if (block.type === "callout") {
    return <aside className={styles.callout}><Layers3 size={19} aria-hidden="true" /><div>{block.title && <strong>{block.title}</strong>}<p>{block.text}</p></div></aside>;
  }
  if (block.type === "quote") {
    return <blockquote className={styles.quote}>{block.title && <strong>{block.title}</strong>}<p>{block.text}</p></blockquote>;
  }
  if (block.type === "steps") {
    return (
      <section className={styles.textBlock}>
        {block.title && <h3>{block.title}</h3>}
        <ol className={styles.steps}>{(block.steps || []).map((step, stepIndex) => <li key={`${block.id || index}-step-${stepIndex}`}><span>{stepIndex + 1}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>
      </section>
    );
  }
  if (block.type === "table") {
    return (
      <section className={styles.textBlock}>
        {block.title && <h3>{block.title}</h3>}
        <div className={styles.tableWrap}><table><thead><tr>{(block.headers || []).map((header, headerIndex) => <th key={`${block.id || index}-header-${headerIndex}`}>{header}</th>)}</tr></thead><tbody>{(block.rows || []).map((row, rowIndex) => <tr key={`${block.id || index}-row-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${block.id || index}-cell-${rowIndex}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody></table></div>
      </section>
    );
  }
  if (block.type === "slide") {
    return (
      <article className={styles.slide}>
        <span className={styles.slideEyebrow}>{block.eyebrow || `Slide ${index + 1}`}</span>
        <h2>{block.title}</h2>
        {block.text && <p>{block.text}</p>}
        {(block.bullets || []).length > 0 && <ul>{block.bullets.map((bullet, bulletIndex) => <li key={`${block.id || index}-bullet-${bulletIndex}`}>{bullet}</li>)}</ul>}
      </article>
    );
  }
  if (block.type === "slide_image" && documentSlug) {
    return <PresentationFrame block={block} index={index} documentSlug={documentSlug} />;
  }
  return null;
}

function DocumentationRenderer({ document }) {
  const blocks = Array.isArray(document?.content_schema?.blocks) ? document.content_schema.blocks : [];
  return (
    <article className={styles.reader}>
      <header className={styles.readerHeader}>
        <span className={styles.eyebrow}>Conteúdo oficial · versão {document.content_version}</span>
        <h1>{document.title}</h1>
        {document.subtitle && <p className={styles.readerSubtitle}>{document.subtitle}</p>}
        <div className={styles.readerMeta}><span>Publicado em {formatDate(document.published_at)}</span><span>Atualizado em {formatDate(document.updated_at)}</span></div>
      </header>
      {document.summary && <p className={styles.summary}>{document.summary}</p>}
      <div className={document.content_type === "PRESENTATION" ? styles.presentationGrid : styles.articleFlow}>
        {blocks.map((block, index) => <DocumentationBlock key={block.id || `${block.type}-${index}`} block={block} index={index} documentSlug={document.slug} />)}
      </div>
    </article>
  );
}

export default function DocumentationDashboard() {
  const controller = useDocumentation();
  return (
    <LawyerDashboardShell activeRoute="documentacao" title="Documentação" subtitle="Guias, apresentações e materiais oficiais da plataforma" icon={BookOpen}>
      <div className={styles.page}>
        <section className={styles.hero}>
          <div><span className={styles.eyebrow}>Central de conhecimento</span><h2>Documentação do Social Jurídico</h2><p>Consulte materiais publicados e revisados pela administração, organizados para leitura clara em qualquer dispositivo.</p></div>
          <div className={styles.heroMetric}><Library size={20} aria-hidden="true" /><strong>{controller.items.length}</strong><span>material(is) disponível(is)</span></div>
        </section>
        {controller.error && <div className={styles.errorBanner} role="alert"><AlertTriangle size={18} aria-hidden="true" /><div><strong>Não foi possível atualizar o conteúdo</strong><p>{controller.error}</p></div><button type="button" onClick={controller.loadItems}><RefreshCw size={15} aria-hidden="true" /> Atualizar</button></div>}
        <div className={styles.workspace}>
          <aside className={styles.library}>
            <label className={styles.searchBox}><Search size={16} aria-hidden="true" /><input type="search" placeholder="Buscar na documentação..." value={controller.query} onChange={(event) => controller.setQuery(event.target.value)} /></label>
            {controller.loading ? <div className={styles.libraryLoading}><span className={styles.spinner} aria-hidden="true" />Carregando materiais...</div> : controller.items.length === 0 ? <div className={styles.emptyLibrary}><BookOpen size={24} aria-hidden="true" /><h3>Nenhuma documentação publicada</h3><p>Os materiais adicionados pela administração aparecerão aqui.</p></div> : <div className={styles.documentList}>{controller.items.map((item) => { const meta = TYPE_META[item.content_type] || TYPE_META.ARTICLE; const Icon = meta.icon; const active = controller.selectedSlug === item.slug; return <button key={item.id} type="button" className={active ? styles.documentCardActive : styles.documentCard} onClick={() => controller.setSelectedSlug(item.slug)}><span className={styles.documentIcon}><Icon size={17} aria-hidden="true" /></span><span className={styles.documentText}><strong>{item.title}</strong><small>{meta.label} · {formatDate(item.updated_at)}</small></span></button>; })}</div>}
          </aside>
          <section className={styles.readerPane}>
            {controller.loadingDocument ? <div className={styles.readerLoading}><span className={styles.spinner} aria-hidden="true" /><h3>Preparando o material</h3><p>Carregando a versão publicada com segurança.</p></div> : controller.selected ? <DocumentationRenderer document={controller.selected} /> : <div className={styles.readerEmpty}><BookOpen size={32} aria-hidden="true" /><h3>Selecione um material</h3><p>Escolha um item da biblioteca para iniciar a leitura.</p></div>}
          </section>
        </div>
      </div>
    </LawyerDashboardShell>
  );
}