"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, ExternalLink, Library } from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import panelStyles from "../../dashboard/LawyerDashboardHome.module.css";
import styles from "../../../oraculo/biblioteca/LegalLibrary.module.css";
import {
  buildLegalCitation,
  legalAccentColor,
} from "@/lib/oraculo/legalLibrary/legalLibraryFormat";

const STRUCTURAL = new Set([
  "TITLE",
  "BOOK",
  "PART",
  "CHAPTER",
  "SECTION",
  "SUBSECTION",
  "PREAMBLE",
]);

export default function AdvogadoLivroClient({
  collection,
  document: doc,
  version,
  units,
  tree,
  focusedUnitId,
}) {
  const accent = legalAccentColor(collection.cover_config);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function flash(message) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  useEffect(() => {
    const hash = window.location.hash?.replace("#", "");
    const targetId = hash?.startsWith("unit-") ? hash.slice(5) : focusedUnitId;
    if (!targetId) return;
    const el = window.document.getElementById(`unit-${targetId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusedUnitId]);

  function citationFor(unit) {
    return buildLegalCitation({
      officialTitle: doc?.official_title,
      documentShortName: doc?.short_title,
      unitLabel: unit.label,
    });
  }

  async function copyReference(unit) {
    const text = citationFor(unit);
    try {
      await navigator.clipboard.writeText(text);
      flash("Referência copiada.");
    } catch {
      flash(text);
    }
  }

  return (
    <LawyerDashboardShell
      activeRoute="biblioteca"
      title={collection.title}
      subtitle={doc?.official_title || "Biblioteca Jurídica"}
      icon={Library}
    >
      <div className={panelStyles.page}>
        <Link href="/dashboard/advogado/biblioteca" className={styles.backLink}>
          <ArrowLeft size={14} /> Biblioteca Jurídica
        </Link>

        <div className={styles.livroLayout}>
          <nav className={styles.toc} aria-label="Sumário">
            <h2 className={styles.tocTitle}>Sumário</h2>
            <TocTree nodes={tree} />
          </nav>

          <div className={styles.docMain}>
            <header className={styles.docHeader} style={{ borderColor: accent }}>
              <h1>{collection.title}</h1>
              <p>
                {doc?.official_title}
                {doc?.ementa ? ` — ${doc.ementa}` : ""}
              </p>
            </header>

            {units.map((u) =>
              STRUCTURAL.has(u.unit_type) ? (
                <div key={u.id} id={`unit-${u.id}`} className={styles.unitHeading}>
                  {u.label && <span className={styles.unitHeadingLabel}>{u.label}</span>}
                  {u.heading && <span className={styles.unitHeadingText}>{u.heading}</span>}
                </div>
              ) : (
                <article key={u.id} id={`unit-${u.id}`} className={styles.article}>
                  <p className={styles.articleLabel}>{u.label}</p>
                  <p className={styles.articleContent}>{u.content}</p>

                  <div className={styles.articleActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => copyReference(u)}
                      data-track="LAWYER_LEGAL_COPY_REFERENCE"
                    >
                      <Copy size={14} /> Copiar referência
                    </button>
                  </div>
                </article>
              ),
            )}

            <section className={styles.sourceBlock}>
              <span className={styles.sourceTitle}>Fonte oficial</span>
              <div className={styles.sourceGrid}>
                <div className={styles.sourceItem}>
                  <span>Norma</span>
                  <strong>{doc?.source_identifier || doc?.official_title}</strong>
                </div>
                <div className={styles.sourceItem}>
                  <span>Fonte</span>
                  <strong>{doc?.source_name || "—"}</strong>
                </div>
                <div className={styles.sourceItem}>
                  <span>Versão da Biblioteca</span>
                  <strong>{version?.version_number ?? "—"}</strong>
                </div>
                <div className={styles.sourceItem}>
                  <span>Última verificação</span>
                  <strong>
                    {version?.source_checked_at
                      ? new Date(version.source_checked_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </strong>
                </div>
              </div>
              {doc?.source_url && (
                <a
                  className={styles.sourceLink}
                  href={doc.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="LAWYER_LEGAL_VIEW_OFFICIAL_SOURCE"
                >
                  <ExternalLink size={13} style={{ verticalAlign: "-2px" }} /> Ver fonte oficial
                </a>
              )}
            </section>
          </div>
        </div>

        {toast && <div className={styles.feedbackToast}>{toast}</div>}
      </div>
    </LawyerDashboardShell>
  );
}

function TocTree({ nodes }) {
  if (!nodes?.length) return null;
  return (
    <>
      {nodes.map((n) => {
        const structural = STRUCTURAL.has(n.unit_type);
        return (
          <div key={n.id}>
            <a
              href={`#unit-${n.id}`}
              className={`${styles.tocLink} ${structural ? styles.tocStructural : styles.tocArticle}`}
            >
              {n.label}
              {structural && n.heading ? ` — ${n.heading}` : ""}
            </a>
            {n.children?.length ? <TocTree nodes={n.children} /> : null}
          </div>
        );
      })}
    </>
  );
}
