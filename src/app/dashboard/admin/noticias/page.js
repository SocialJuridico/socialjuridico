"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Search, RefreshCcw } from "lucide-react";

import { useAdminNews } from "./useAdminNews";
import TopicsPanel from "./TopicsPanel";
import styles from "./NoticiasAdmin.module.css";

const DEFAULT_COVER = "/noticias/image.png";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default function NoticiasAdminPage() {
  const {
    articles,
    loading,
    loadError,
    search,
    modal,
    uploading,
    saving,
    setSearch,
    openImageModal,
    closeModal,
    updateModalField,
    uploadImage,
    saveImage,
    removeImage,
    loadArticles,
  } = useAdminNews();

  const fileInputRef = useRef(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return articles;
    return articles.filter((a) =>
      [a.title, a.slug, a.category?.name]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(term)),
    );
  }, [articles, search]);

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <Link href="/dashboard/admin" className={styles.back}>
            <ArrowLeft size={16} /> Voltar ao painel
          </Link>
          <h1 className={styles.title}>Notícias — Imagens das matérias</h1>
          <p className={styles.subtitle}>
            Substitua a imagem de capa de qualquer matéria quando quiser.
          </p>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={loadArticles}
          disabled={loading}
        >
          <RefreshCcw size={16} /> Atualizar
        </button>
      </header>

      <TopicsPanel />

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar por título, slug ou categoria…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loadError && <p className={styles.error}>{loadError}</p>}

      {loading ? (
        <p className={styles.empty}>Carregando matérias…</p>
      ) : filtered.length === 0 ? (
        <p className={styles.empty}>Nenhuma matéria encontrada.</p>
      ) : (
        <div className={styles.grid}>
          {filtered.map((article) => (
            <div key={article.id} className={styles.card}>
              <div className={styles.cover}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.cover_image_url || DEFAULT_COVER}
                  alt={article.cover_image_alt || article.title}
                />
              </div>
              <div className={styles.cardBody}>
                <span className={styles.status} data-status={article.status}>
                  {article.status}
                </span>
                <h3 className={styles.cardTitle}>{article.title}</h3>
                <div className={styles.cardMeta}>
                  <span>{article.category?.name || "Sem categoria"}</span>
                  <span>·</span>
                  <span>{formatDate(article.published_at || article.updated_at)}</span>
                </div>
                <button
                  type="button"
                  className={styles.changeBtn}
                  onClick={() => openImageModal(article)}
                >
                  <ImagePlus size={16} /> Substituir imagem
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Imagem da matéria</h2>
            <p className={styles.modalSubtitle}>{modal.article.title}</p>

            <div className={styles.preview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={modal.cover_image_url || DEFAULT_COVER}
                alt={modal.cover_image_alt || modal.article.title}
              />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                e.target.value = "";
              }}
            />

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <ImagePlus size={16} />
                {uploading ? "Enviando…" : "Enviar nova imagem"}
              </button>
              {modal.cover_image_url && (
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={removeImage}
                  disabled={uploading}
                >
                  Usar imagem padrão
                </button>
              )}
            </div>

            <label className={styles.field}>
              <span>Texto alternativo (acessibilidade / SEO)</span>
              <input
                type="text"
                value={modal.cover_image_alt}
                onChange={(e) => updateModalField("cover_image_alt", e.target.value)}
                placeholder="Descreva a imagem"
              />
            </label>

            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                Cancelar
              </button>
              <button
                type="button"
                className={styles.saveBtn}
                onClick={saveImage}
                disabled={saving || uploading}
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}