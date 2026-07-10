"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Search, Library, History, NotebookPen } from "lucide-react";

import shared from "../OraculoStudentDashboard.module.css";
import styles from "./LegalLibrary.module.css";
import {
  LEGAL_CATEGORY_LABELS,
  legalAccentColor,
} from "@/lib/oraculo/legalLibrary/legalLibraryFormat";

function BookCover({ collection }) {
  const cover = collection.cover_config || {};
  const accent = legalAccentColor(cover);
  const shortLabel = collection.short_title || cover.shortTitle || "";
  return (
    <div className={styles.bookCover} style={{ "--accent": accent }}>
      {shortLabel ? <span className={styles.bookCoverShort}>{shortLabel}</span> : <span />}
      <h3 className={styles.bookCoverTitle}>{collection.title}</h3>
    </div>
  );
}

export default function BibliotecaClient({
  collections,
  recentViews,
  notebookCount,
  search,
  query,
}) {
  const router = useRouter();
  const [term, setTerm] = useState(query || "");
  const [category, setCategory] = useState("ALL");

  const available = useMemo(
    () => collections.filter((c) => c.available),
    [collections],
  );

  const categories = useMemo(() => {
    const set = new Map();
    for (const c of collections) {
      if (!set.has(c.category)) {
        set.set(c.category, LEGAL_CATEGORY_LABELS[c.category] || c.category);
      }
    }
    return Array.from(set.entries());
  }, [collections]);

  const visibleCollections = useMemo(() => {
    if (category === "ALL") return collections;
    return collections.filter((c) => c.category === category);
  }, [collections, category]);

  function onSubmit(e) {
    e.preventDefault();
    const q = term.trim();
    router.push(q ? `/dashboard/oraculo/biblioteca?q=${encodeURIComponent(q)}` : "/dashboard/oraculo/biblioteca");
  }

  const hasSearch = Boolean(search);

  return (
    <main className={shared.page}>
      <section className={shared.hero}>
        <div>
          <span className={shared.eyebrow}>Estudo e pesquisa</span>
          <h1>Biblioteca Jurídica</h1>
          <p>
            Pesquise legislação, dispositivos e fontes jurídicas para apoiar sua
            análise acadêmica.
          </p>
        </div>
      </section>

      <form className={styles.searchForm} onSubmit={onSubmit} role="search">
        <input
          className={styles.searchInput}
          type="search"
          name="q"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar legislação, artigo ou termo jurídico…"
          aria-label="Buscar na Biblioteca Jurídica"
        />
        <button type="submit" className={styles.searchBtn} data-track="LEGAL_SEARCH_SUBMIT">
          <Search size={16} /> Buscar
        </button>
      </form>
      <p className={styles.searchHint}>
        Dica: pesquise por termo (“responsabilidade do fornecedor”) ou direto por
        artigo (“art 14 cdc”).
      </p>

      {hasSearch ? (
        <SearchResults search={search} />
      ) : (
        <>
          <section className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <strong>{available.length}</strong>
              <span>Livros disponíveis</span>
            </div>
            <div className={styles.summaryCard}>
              <strong>{recentViews.length}</strong>
              <span>Consultados recentemente</span>
            </div>
            <div className={styles.summaryCard}>
              <strong>{notebookCount}</strong>
              <span>Itens no Caderno</span>
            </div>
          </section>

          {categories.length > 1 && (
            <div className={styles.filterRow}>
              <button
                type="button"
                className={`${styles.filterChip} ${category === "ALL" ? styles.filterChipActive : ""}`}
                onClick={() => setCategory("ALL")}
              >
                Todas
              </button>
              {categories.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.filterChip} ${category === key ? styles.filterChipActive : ""}`}
                  onClick={() => setCategory(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <section className={shared.panel}>
            <div className={shared.panelHeader}>
              <h2>
                <Library size={18} aria-hidden="true" /> Minha Biblioteca
              </h2>
            </div>
            <div className={styles.bookGrid}>
              {visibleCollections.map((c) => (
                <article key={c.id} className={styles.bookCard}>
                  <BookCover collection={c} />
                  <div className={styles.bookBody}>
                    <span className={styles.bookCategory}>
                      {LEGAL_CATEGORY_LABELS[c.category] || c.category}
                    </span>
                    {c.available ? (
                      <Link
                        href={`/dashboard/oraculo/biblioteca/${c.slug}`}
                        className={styles.bookCta}
                      >
                        <BookOpen size={14} /> Abrir
                      </Link>
                    ) : (
                      <span className={styles.bookSoon}>Em breve</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {recentViews.length > 0 && (
            <section className={shared.panel}>
              <div className={shared.panelHeader}>
                <h2>
                  <History size={18} aria-hidden="true" /> Consultados recentemente
                </h2>
              </div>
              <div className={styles.recentList}>
                {recentViews.map((v) => (
                  <Link
                    key={v.legal_unit_id}
                    href={`/dashboard/oraculo/biblioteca/${v.collection_slug_snapshot}#unit-${v.legal_unit_id}`}
                    className={styles.recentItem}
                  >
                    <span>
                      {v.label_snapshot}
                      {v.document_title_snapshot ? ` — ${v.document_title_snapshot}` : ""}
                    </span>
                    <small>{new Date(v.viewed_at).toLocaleDateString("pt-BR")}</small>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function SearchResults({ search }) {
  const { query, results } = search;
  return (
    <section className={shared.panel}>
      <div className={shared.panelHeader}>
        <h2>
          <Search size={18} aria-hidden="true" /> Resultados para “{query}”
        </h2>
        <Link href="/dashboard/oraculo/biblioteca" className={styles.backLink}>
          Limpar busca
        </Link>
      </div>

      {results.length === 0 ? (
        <div className={shared.emptyState}>
          <NotebookPen size={26} aria-hidden="true" />
          <p>Nenhum dispositivo encontrado para sua pesquisa.</p>
          <small>
            Tente outros termos ou pesquise diretamente pelo número do artigo
            (ex.: “art 14 cdc”).
          </small>
        </div>
      ) : (
        <div className={shared.caseGrid}>
          {results.map((r) => (
            <article key={r.unitId} className={styles.resultCard}>
              <div className={styles.resultTop}>
                <span className={styles.resultLabel}>{r.label}</span>
                <span className={styles.resultCollection}>
                  {r.collectionShort || r.collectionTitle}
                </span>
              </div>
              {r.heading && <span className={styles.resultCollection}>{r.heading}</span>}
              <p className={styles.resultSnippet}>{r.snippet}…</p>
              <Link
                href={`/dashboard/oraculo/biblioteca/${r.collectionSlug}#unit-${r.unitId}`}
                className={styles.bookCta}
                style={{ alignSelf: "flex-start" }}
              >
                Abrir dispositivo
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
