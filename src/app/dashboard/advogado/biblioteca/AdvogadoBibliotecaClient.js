"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Library, Search } from "lucide-react";

import LawyerDashboardShell from "../components/LawyerDashboardShell";
import panelStyles from "../dashboard/LawyerDashboardHome.module.css";
import styles from "../../oraculo/biblioteca/LegalLibrary.module.css";
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

export default function AdvogadoBibliotecaClient({ collections, search, query }) {
  const router = useRouter();
  const [term, setTerm] = useState(query || "");
  const [category, setCategory] = useState("ALL");

  const available = useMemo(() => collections.filter((c) => c.available), [collections]);

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
    router.push(
      q
        ? `/dashboard/advogado/biblioteca?q=${encodeURIComponent(q)}`
        : "/dashboard/advogado/biblioteca",
    );
  }

  const hasSearch = Boolean(search);

  return (
    <LawyerDashboardShell
      activeRoute="biblioteca"
      title="Biblioteca Jurídica"
      subtitle="Legislação organizada e pesquisável para apoiar sua atuação."
      icon={Library}
    >
      <div className={panelStyles.page}>
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
          <button type="submit" className={styles.searchBtn} data-track="LAWYER_LEGAL_SEARCH_SUBMIT">
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

            <section className={panelStyles.panel}>
              <div className={panelStyles.panelHeader}>
                <div>
                  <Library size={18} aria-hidden="true" /> <h3>Minha Biblioteca</h3>
                </div>
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
                          href={`/dashboard/advogado/biblioteca/${c.slug}`}
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
          </>
        )}
      </div>
    </LawyerDashboardShell>
  );
}

function SearchResults({ search }) {
  const { query, results } = search;
  return (
    <section className={panelStyles.panel}>
      <div className={panelStyles.panelHeader}>
        <div>
          <Search size={18} aria-hidden="true" /> <h3>Resultados para “{query}”</h3>
        </div>
        <Link href="/dashboard/advogado/biblioteca" className={styles.backLink}>
          Limpar busca
        </Link>
      </div>

      {results.length === 0 ? (
        <p className={panelStyles.emptyText}>
          Nenhum dispositivo encontrado para sua pesquisa. Tente outros termos ou
          pesquise diretamente pelo número do artigo (ex.: “art 14 cdc”).
        </p>
      ) : (
        <div className={styles.bookGrid}>
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
                href={`/dashboard/advogado/biblioteca/${r.collectionSlug}#unit-${r.unitId}`}
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
