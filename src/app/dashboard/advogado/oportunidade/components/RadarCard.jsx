"use client";

import {
  CalendarDays,
  Coins,
  ExternalLink,
  Loader2,
  MapPin,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import styles from "../Oportunidade.module.css";
import { formatOpportunityDate } from "../opportunityUtils";

export default function RadarCard({ item, controller }) {
  const busy = controller.busyId === item.id;
  const score = Number(item.score_intencao || 0);
  const location =
    [item.cidade, item.estado].filter(Boolean).join(" - ") ||
    "Local não informado";

  return (
    <article className={styles.radarCard}>
      <div className={styles.cardTop}>
        <div className={styles.badges}>
          <span className={styles.areaBadge}>{item.categoria}</span>
          <span className={styles.statusBadge}>{item.urgencia || "baixa"}</span>
        </div>
        {item.reportado && (
          <span className={styles.mediaBadge} title="Oportunidade sinalizada">
            <ShieldAlert size={12} aria-hidden="true" /> Em revisão
          </span>
        )}
      </div>

      <h3>{item.titulo}</h3>

      <div className={styles.cardMeta}>
        <span>
          <MapPin size={12} aria-hidden="true" /> {location}
        </span>
        <span>
          <CalendarDays size={12} aria-hidden="true" />
          {formatOpportunityDate(item.detectado_em || item.criado_em)}
        </span>
      </div>

      <p className={styles.radarExcerpt}>“{item.trecho_publico}”</p>

      {item.resumo_ia && (
        <p className={styles.radarSummary}>
          <Sparkles size={12} aria-hidden="true" /> {item.resumo_ia}
        </p>
      )}

      <footer className={styles.radarFooter}>
        <div className={styles.radarScore}>
          <span>Fonte: {item.fonte}</span>
          <strong>Intenção {score}%</strong>
        </div>

        <div className={styles.cardFooter}>
          <button
            type="button"
            className={styles.iconButton}
            onClick={() => controller.openReport(item)}
            disabled={item.reportado || controller.isDemo}
            title={
              item.reportado
                ? "Oportunidade já sinalizada"
                : "Reportar oportunidade"
            }
            aria-label="Reportar oportunidade"
          >
            <ShieldAlert size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => controller.requestAccess(item)}
            disabled={busy || item.reportado}
          >
            {busy ? (
              <>
                <Loader2
                  size={14}
                  className={styles.spinner}
                  aria-hidden="true"
                />
                Liberando
              </>
            ) : item.clicado ? (
              <>
                <ExternalLink size={14} aria-hidden="true" /> Abrir novamente
              </>
            ) : controller.plan === "START" ? (
              <>
                <Coins size={14} aria-hidden="true" /> Acessar por 1 Juri
              </>
            ) : (
              <>
                <ExternalLink size={14} aria-hidden="true" /> Acessar publicação
              </>
            )}
          </button>
        </div>
      </footer>
    </article>
  );
}
