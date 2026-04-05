"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Search, ChevronDown, ChevronUp } from "lucide-react";
import styles from "./Avaliacoes.module.css";

export default function AdminAvaliacoesPage() {
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const loadAvaliacoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/avaliacoes", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setAvaliacoes(data.data || []);
    } catch (e) {
      console.error("Erro ao carregar avaliações:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAvaliacoes();
  }, [loadAvaliacoes]);

  const filtered = avaliacoes.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.advogado_nome?.toLowerCase().includes(q) ||
      a.cliente_nome?.toLowerCase().includes(q) ||
      a.caso_titulo?.toLowerCase().includes(q)
    );
  });

  // Calcular estatísticas
  const totalAvaliacoes = avaliacoes.length;
  const mediaGeral =
    totalAvaliacoes > 0
      ? (avaliacoes.reduce((s, a) => s + (a.nota || 0), 0) / totalAvaliacoes).toFixed(1)
      : "—";

  const renderStars = (nota) =>
    [1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        size={14}
        fill={s <= nota ? "#d4af37" : "transparent"}
        color={s <= nota ? "#d4af37" : "rgba(255,255,255,0.2)"}
      />
    ));

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao Painel
        </Link>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            <Star size={22} fill="var(--color-gold)" color="var(--color-gold)" />
            Avaliações de Advogados
          </h1>
          <p className={styles.subtitle}>
            Todas as avaliações deixadas por clientes — com justificativas completas.
          </p>
        </div>
      </header>

      {/* STATS */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{totalAvaliacoes}</span>
          <span className={styles.statLabel}>Total de Avaliações</span>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValueRow}>
            <Star size={18} fill="#d4af37" color="#d4af37" />
            <span className={styles.statValue}>{mediaGeral}</span>
          </div>
          <span className={styles.statLabel}>Média Geral da Plataforma</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {avaliacoes.filter((a) => a.nota >= 4).length}
          </span>
          <span className={styles.statLabel}>Avaliações Positivas (4-5 ★)</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>
            {avaliacoes.filter((a) => a.nota <= 2).length}
          </span>
          <span className={styles.statLabel}>Avaliações Negativas (0-2 ★)</span>
        </div>
      </div>

      {/* SEARCH */}
      <div className={styles.searchWrap}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Buscar por advogado, cliente ou caso..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* LIST */}
      {loading ? (
        <div className={styles.loading}>Carregando avaliações...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {search ? "Nenhuma avaliação encontrada para essa busca." : "Ainda não há avaliações registradas."}
        </div>
      ) : (
        <div className={styles.list}>
          {filtered.map((av) => (
            <div key={av.id} className={styles.card}>
              <div
                className={styles.cardHeader}
                onClick={() => setExpandedId(expandedId === av.id ? null : av.id)}
              >
                {/* Nota */}
                <div className={styles.cardNota}>
                  <div className={styles.starsRow}>{renderStars(av.nota)}</div>
                  <span className={styles.notaNum}>{av.nota}/5</span>
                </div>

                {/* Info */}
                <div className={styles.cardInfo}>
                  <p className={styles.cardAdvogado}>
                    <strong>Advogado:</strong> {av.advogado_nome}
                  </p>
                  <p className={styles.cardCliente}>
                    <strong>Cliente:</strong> {av.cliente_nome}
                  </p>
                  <p className={styles.cardCaso}>Caso: {av.caso_titulo}</p>
                </div>

                {/* Data */}
                <div className={styles.cardDate}>
                  {new Date(av.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  <span className={styles.expandIcon}>
                    {expandedId === av.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </div>
              </div>

              {/* Justificativa (expandível) */}
              {expandedId === av.id && (
                <div className={styles.cardJustificativa}>
                  {av.justificativa ? (
                    <>
                      <p className={styles.justLabel}>Justificativa do cliente:</p>
                      <p className={styles.justText}>&ldquo;{av.justificativa}&rdquo;</p>
                    </>
                  ) : (
                    <p className={styles.justEmpty}>
                      Cliente não deixou justificativa.
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
