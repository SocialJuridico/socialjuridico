"use client";

import {
  AlertTriangle,
  Archive,
  ChevronLeft,
  ChevronRight,
  FileKey2,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import styles from "../../smartdoc/SmartDoc.module.css";
import extras from "../DocumentProtectionExtras.module.css";
import ProtectedDocumentCard from "./ProtectedDocumentCard";

const DOCUMENT_TYPES = [
  "Contrato",
  "Procuração",
  "Prova Digital",
  "Notificação",
  "Outros",
];

export default function ProtectionDocumentsPanel({
  certificateId,
  collection,
  copyHash,
  currentRange,
  deleteDocument,
  deletingId,
  downloadCertificate,
  error,
  filters,
  items,
  load,
  loading,
  metrics,
  openDocument,
  openUpload,
  pagination,
  reload,
  setCollection,
  setFilters,
}) {
  const isLegacy = collection === "legacy";

  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <div>
          <span>{isLegacy ? "Acervo histórico" : "Arquivo protegido"}</span>
          <h2>{isLegacy ? "Registros do módulo legado" : "Documentos blindados"}</h2>
        </div>
        <div className={styles.filters}>
          <div className={extras.collectionTabs} aria-label="Origem dos registros">
            <button
              type="button"
              className={!isLegacy ? extras.activeTab : undefined}
              onClick={() => setCollection("current")}
            >
              <FileKey2 size={14} aria-hidden="true" /> Atuais
              <small>{metrics.protected || 0}</small>
            </button>
            <button
              type="button"
              className={isLegacy ? extras.activeTab : undefined}
              onClick={() => setCollection("legacy")}
            >
              <Archive size={14} aria-hidden="true" /> Legado
              <small>{metrics.legacy || 0}</small>
            </button>
          </div>

          <label className={styles.searchField}>
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              value={filters.search}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Buscar documento"
            />
          </label>
          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                type: event.target.value,
              }))
            }
            aria-label="Filtrar por categoria"
          >
            <option value="all">Todas</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.refresh}
            onClick={reload}
            aria-label="Atualizar documentos"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      {loading ? (
        <div className={styles.state}>
          <Loader2 className={styles.spin} size={30} aria-hidden="true" />
          <strong>
            {isLegacy ? "Carregando acervo legado..." : "Carregando blindagens..."}
          </strong>
          <span>
            {isLegacy
              ? "Recuperando os registros históricos vinculados ao advogado e ao escritório."
              : "Conferindo documentos, permissões e limites do plano."}
          </span>
        </div>
      ) : error ? (
        <div className={`${styles.state} ${styles.errorState}`}>
          <AlertTriangle size={30} aria-hidden="true" />
          <strong>Não foi possível carregar</strong>
          <span>{error}</span>
          <button
            type="button"
            className={styles.secondaryAction}
            onClick={reload}
          >
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className={styles.state}>
          {isLegacy ? (
            <Archive size={34} aria-hidden="true" />
          ) : (
            <ShieldCheck size={34} aria-hidden="true" />
          )}
          <strong>
            {isLegacy ? "Nenhum registro legado encontrado" : "Nenhum documento blindado"}
          </strong>
          <span>
            {isLegacy
              ? "Não existem blindagens históricas para os filtros selecionados."
              : "Registre o primeiro arquivo para iniciar a biblioteca segura."}
          </span>
          {!isLegacy && (
            <button
              type="button"
              className={styles.primaryAction}
              onClick={openUpload}
            >
              Nova blindagem
            </button>
          )}
        </div>
      ) : (
        <div className={styles.documentGrid}>
          {items.map((document) => (
            <ProtectedDocumentCard
              key={`${document.legacy ? "legacy" : "current"}-${document.id}`}
              certificateId={certificateId}
              copyHash={copyHash}
              deleteDocument={deleteDocument}
              deletingId={deletingId}
              document={document}
              downloadCertificate={downloadCertificate}
              openDocument={openDocument}
            />
          ))}
        </div>
      )}

      {!loading && !error && pagination.total > 0 && (
        <footer className={styles.pagination}>
          <span>{currentRange}</span>
          <div>
            <button
              type="button"
              onClick={() => load(pagination.page - 1)}
              disabled={pagination.page <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <strong>
              {pagination.page} / {pagination.totalPages}
            </strong>
            <button
              type="button"
              onClick={() => load(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}
