"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookText, Clock3, FolderOpen, Radar } from "lucide-react";

import styles from "../OraculoStudentDashboard.module.css";

const CLAIM_STATUS_LABELS = {
  WAITING_CLIENT_ACCEPTANCE: "Aguardando cliente",
  ACCEPTED: "Aceito pelo cliente",
};

function useCountdown(targetIso) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [targetIso]);

  if (!targetIso) return null;
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return "há menos de 1h";
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
}

export default function CasosClient({
  available,
  claims,
  cooldown,
  canClaim,
  radarCases = [],
  radarAreas = [],
  radarSummary = { totalCases: 0, totalAreas: 0 },
}) {
  const router = useRouter();
  const [tab, setTab] = useState("reais");
  const [radarArea, setRadarArea] = useState("");
  const [radarSearch, setRadarSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [pendingId, setPendingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const cooldownLeft = useCountdown(cooldown?.active ? cooldown.nextAvailableAt : null);
  const cooldownActive = Boolean(cooldownLeft);

  const areas = useMemo(
    () => Array.from(new Set(available.map((c) => c.area))).sort(),
    [available],
  );

  const visibleCases = useMemo(
    () => (areaFilter ? available.filter((c) => c.area === areaFilter) : available),
    [available, areaFilter],
  );

  async function manifestar(caseId) {
    setPendingId(caseId);
    setFeedback(null);
    try {
      const res = await fetch("/api/oraculo/casos/manifestar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.success) {
        setFeedback({
          type: "error",
          text: payload?.message || "Não foi possível manifestar interesse.",
        });
      } else {
        setFeedback({ type: "success", text: payload.message });
        router.refresh();
      }
    } catch {
      setFeedback({ type: "error", text: "Falha de rede. Tente novamente." });
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Prática jurídica</span>
          <h1>Central de Casos</h1>
          <p>
            Casos reais de baixa intenção de contratação e casos de estudo do
            Radar Acadêmico para sua prática jurídica supervisionada.
          </p>
        </div>
      </section>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "reais"}
          className={`${styles.tab} ${tab === "reais" ? styles.tabActive : ""}`}
          onClick={() => setTab("reais")}
        >
          <FolderOpen size={15} aria-hidden="true" /> Casos Reais
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "radar"}
          className={`${styles.tab} ${tab === "radar" ? styles.tabActive : ""}`}
          onClick={() => setTab("radar")}
        >
          <Radar size={15} aria-hidden="true" /> Radar Acadêmico
        </button>
      </div>

      {feedback && (
        <div
          className={`${styles.feedback} ${
            feedback.type === "error" ? styles.feedbackError : styles.feedbackSuccess
          }`}
          role="status"
        >
          {feedback.text}
        </div>
      )}

      {tab === "reais" && (
        <>
          {cooldownActive && (
            <div className={styles.cooldownBanner}>
              <Clock3 size={16} aria-hidden="true" />
              <span>
                Você já manifestou interesse recentemente. Próxima manifestação
                em <strong>{cooldownLeft}</strong>.
              </span>
            </div>
          )}

          {claims.length > 0 && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.kicker}>Minhas manifestações</span>
                <h2>Aguardando resposta do cliente</h2>
              </div>
              <div className={styles.claimList}>
                {claims.map((claim) => (
                  <ClaimRow key={claim.id} claim={claim} />
                ))}
              </div>
            </section>
          )}

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.kicker}>Casos disponíveis</span>
              <h2>{visibleCases.length} caso(s) para análise</h2>
              {areas.length > 0 && (
                <select
                  className={styles.filterSelect}
                  value={areaFilter}
                  onChange={(event) => setAreaFilter(event.target.value)}
                  aria-label="Filtrar por área jurídica"
                >
                  <option value="">Todas as áreas</option>
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {visibleCases.length === 0 ? (
              <div className={styles.emptyState}>
                <FolderOpen size={26} aria-hidden="true" />
                <p>Nenhum caso disponível no momento.</p>
                <small>
                  Novos casos aparecem aqui conforme chegam ao Oráculo. Volte em
                  breve.
                </small>
              </div>
            ) : (
              <div className={styles.caseGrid}>
                {visibleCases.map((caso) => (
                  <article key={caso.id} className={styles.caseCard}>
                    <div className={styles.caseCardHead}>
                      <span className={styles.caseArea}>{caso.area}</span>
                      {caso.callTag && (
                        <span className={styles.callTag}>{caso.callTag}</span>
                      )}
                    </div>
                    <h3>{caso.titulo}</h3>
                    {caso.resumo && <p>{caso.resumo}</p>}
                    <div className={styles.caseMeta}>
                      {caso.uf ? <span>{caso.uf}</span> : null}
                      <span>Publicado {timeAgo(caso.createdAt)}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.caseCta}
                      disabled={!canClaim || cooldownActive || pendingId === caso.id}
                      onClick={() => manifestar(caso.id)}
                    >
                      {pendingId === caso.id
                        ? "Manifestando…"
                        : "Manifestar interesse"}
                    </button>
                  </article>
                ))}
              </div>
            )}

            {!canClaim && (
              <p className={styles.muted}>
                Seu vínculo acadêmico precisa estar ativo para manifestar
                interesse em casos.
              </p>
            )}
          </section>
        </>
      )}

      {tab === "radar" && (
        <RadarAcademicTab
          cases={radarCases}
          areas={radarAreas}
          summary={radarSummary}
          area={radarArea}
          setArea={setRadarArea}
          search={radarSearch}
          setSearch={setRadarSearch}
        />
      )}
    </main>
  );
}

function RadarAcademicTab({
  cases,
  areas,
  summary,
  area,
  setArea,
  search,
  setSearch,
}) {
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return cases.filter((c) => {
      if (area && c.legalArea !== area) return false;
      if (
        needle &&
        !`${c.title} ${c.academicSummary} ${c.legalArea}`
          .toLowerCase()
          .includes(needle)
      ) {
        return false;
      }
      return true;
    });
  }, [cases, area, search]);

  return (
    <>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Radar Acadêmico</span>
          <p>
            Analise casos de estudo preparados a partir de situações jurídicas
            identificadas pelo Radar Jurídico. Estude o relato, identifique fatos
            e lacunas, treine um atendimento jurídico simulado e desenvolva sua
            análise.
          </p>
        </div>
      </section>

      <section className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <strong>{summary.totalCases}</strong>
          <span>Casos de estudo disponíveis</span>
        </div>
        <div className={styles.metricCard}>
          <strong>{summary.totalAreas}</strong>
          <span>Áreas jurídicas</span>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.kicker}>Casos de estudo</span>
          <h2>{visible.length} disponível(is)</h2>
          <input
            className={styles.filterSelect}
            placeholder="Buscar por título ou área"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Buscar caso de estudo"
          />
          {areas.length > 0 && (
            <select
              className={styles.filterSelect}
              value={area}
              onChange={(event) => setArea(event.target.value)}
              aria-label="Filtrar por área jurídica"
            >
              <option value="">Todas as áreas</option>
              {areas.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          )}
        </div>

        {visible.length === 0 ? (
          <div className={styles.emptyState}>
            <Radar size={26} aria-hidden="true" />
            <p>Nenhum caso de estudo disponível no Radar Acadêmico.</p>
            <small>
              Novos casos preparados a partir do Radar Jurídico aparecerão aqui.
            </small>
          </div>
        ) : (
          <div className={styles.caseGrid}>
            {visible.map((caso) => (
              <article key={caso.id} className={styles.caseCard}>
                <div className={styles.caseCardHead}>
                  <span className={styles.caseArea}>{caso.legalArea}</span>
                  <span className={styles.studyTag}>CASO DE ESTUDO</span>
                </div>
                <h3>{caso.title}</h3>
                {caso.academicSummary && <p>{caso.academicSummary}</p>}
                {caso.hasSimulatedInterview && (
                  <span className={styles.interviewTag}>
                    Atendimento jurídico simulado disponível
                  </span>
                )}
                <Link
                  href={`/dashboard/oraculo/casos/radar/${caso.id}`}
                  className={styles.caseCta}
                >
                  <BookText size={15} aria-hidden="true" /> Ver dossiê do caso
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ClaimRow({ claim }) {
  const left = useCountdown(claim.deadline);
  return (
    <div className={styles.claimRow}>
      <div>
        <strong>{claim.titulo}</strong>
        <small>{claim.area}</small>
      </div>
      <span className={styles.claimStatus}>
        {CLAIM_STATUS_LABELS[claim.status] || claim.status}
      </span>
      <span className={styles.claimDeadline}>
        {left ? `Cliente responde em ${left}` : "Prazo encerrado"}
      </span>
    </div>
  );
}
