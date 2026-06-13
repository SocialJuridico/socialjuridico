"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import styles from "../../smartdoc/SmartDoc.module.css";
import ProtectedDocumentCard from "./ProtectedDocumentCard";

const DOCUMENT_TYPES = ["Contrato", "Procuração", "Prova Digital", "Notificação", "Outros"];

export default function ProtectionDocumentsPanel({
  copyHash,
  currentRange,
  deleteDocument,
  deletingId,
  error,
  filters,
  items,
  load,
  loading,
  openDocument,
  openUpload,
  pagination,
  reload,
  setFilters,
}) {
  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div><span>Arquivo protegido</span><h2>Documentos blindados</h2></div>
        <div className={styles.filters}>
          <label className={styles.searchField}>
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Buscar documento"
            />
          </label>
          <select
            value={filters.type}
            onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            aria-label="Filtrar por categoria"
          >
            <option value="all">Todas</option>
            {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <button type="button" className={styles.refresh} onClick={reload} aria-label="Atualizar documentos"><RefreshCw size={16} aria-hidden="true" /></button>
        </div>
      </header>

      {loading ? (
        <div className={styles.state}><Loader2 className={styles.spin} size={30} aria-hidden="true" /><strong>Carregando blindagens...</strong><span>Conferindo documentos, permissões e limites do plano.</span></div>
      ) : error ? (
        <div className={`${styles.state} ${styles.errorState}`}><AlertTriangle size={30} aria-hidden="true" /><strong>Não foi possível carregar</strong><span>{error}</span><button type="button" className={styles.secondaryAction} onClick={reload}>Tentar novamente</button></div>
      ) : items.length === 0 ? (
        <div className={styles.state}><ShieldCheck size={34} aria-hidden="true" /><strong>Nenhum documento blindado</strong><span>Registre o primeiro arquivo para iniciar a biblioteca segura.</span><button type="button" className={styles.primaryAction} onClick={openUpload}>Nova blindagem</button></div>
      ) : (
        <div className={styles.documentGrid}>
          {items.map((document) => (
            <ProtectedDocumentCard
              key={document.id}
              copyHash={copyHash}
              deleteDocument={deleteDocument}
              deletingId={deletingId}
              document={document}
              openDocument={openDocument}
            />
          ))}
        </div>
      )}

      {!loading && !error && pagination.total > 0 && (
        <footer className={styles.pagination}>
          <span>{currentRange}</span>
          <div>
            <button type="button" onClick={() => load(pagination.page - 1)} disabled={pagination.page <= 1} aria-label="Página anterior"><ChevronLeft size={17} aria-hidden="true" /></button>
            <strong>{pagination.page} / {pagination.totalPages}</strong>
            <button type="button" onClick={() => load(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} aria-label="Próxima página"><ChevronRight size={17} aria-hidden="true" /></button>
          </div>
        </footer>
      )}
    </section>
  );
}
