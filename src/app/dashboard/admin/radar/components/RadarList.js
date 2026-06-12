import {
  Archive,
  Check,
  Clock3,
  Edit2,
  ExternalLink,
  Eye,
  MapPin,
  Trash2,
  X,
} from "lucide-react";

import {
  formatDate,
  getClickingLawyers,
  getUrgencyLabel,
} from "../utils/radarFormatters";
import styles from "../page.module.css";

function getExpirationLabel(publishedAt) {
  const approvedAt = new Date(publishedAt || 0);
  if (Number.isNaN(approvedAt.getTime())) return null;

  const expiresAt = new Date(approvedAt.getTime() + 5 * 24 * 60 * 60 * 1000);
  const remainingMs = expiresAt.getTime() - Date.now();

  if (remainingMs <= 0) {
    return "Expirada — aguardando limpeza automática";
  }

  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(remainingHours / 24);
  const hours = remainingHours % 24;

  if (days > 0) {
    return `Expira em ${days}d${hours ? ` ${hours}h` : ""}`;
  }

  return `Expira em ${remainingHours}h`;
}

export default function RadarList({
  items,
  loading,
  busy,
  onEdit,
  onApprove,
  onReject,
  onArchive,
  onDelete,
}) {
  if (loading) {
    return (
      <div className={styles.listState}>
        <span className={styles.spinner} aria-hidden="true" />
        <p>Carregando oportunidades do Radar...</p>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className={styles.emptyState}>
        <h2>Nenhuma oportunidade encontrada</h2>
        <p>Altere os filtros ou execute uma nova busca automática.</p>
      </div>
    );
  }

  return (
    <section className={styles.list} aria-label="Oportunidades do Radar">
      {items.map((item) => {
        const clickingLawyers = getClickingLawyers(item);
        const itemBusy = busy === item.id;
        const expirationLabel =
          item.status === "aprovado"
            ? getExpirationLabel(item.publicado_em)
            : null;

        return (
          <article key={item.id} className={styles.card}>
            <header className={styles.cardHeader}>
              <div className={styles.badges}>
                <span className={styles.badgeArea}>
                  {item.categoria || "Sem categoria"}
                </span>
                <span className={styles.badgeSource}>
                  {item.fonte || "Fonte não informada"}
                </span>
                {item.origem_automatica && (
                  <span className={styles.badgeAutomatic}>Automática</span>
                )}
                {item.reportado && (
                  <span className={styles.badgeReported}>Sinalizada</span>
                )}
              </div>
              <time dateTime={item.criado_em || undefined}>
                {formatDate(item.criado_em)}
              </time>
            </header>

            <h2 className={styles.cardTitle}>{item.titulo}</h2>

            <div className={styles.cardMeta}>
              <span>
                <MapPin size={14} />
                {item.cidade || "Local não informado"}
                {item.estado ? ` · ${item.estado}` : ""}
              </span>
              <span>
                Score <strong>{item.score_intencao ?? 0}%</strong>
              </span>
              <span>
                Urgência <strong>{getUrgencyLabel(item.urgencia)}</strong>
              </span>
              <span>
                <Eye size={14} />
                {item.cliques?.length || 0} clique(s)
              </span>
              {expirationLabel && (
                <span title={`Aprovada em ${formatDate(item.publicado_em)}`}>
                  <Clock3 size={14} />
                  <strong>{expirationLabel}</strong>
                </span>
              )}
            </div>

            {clickingLawyers.length > 0 && (
              <div className={styles.clickingLawyers}>
                <strong>Clicado por:</strong> {clickingLawyers.join(", ")}
              </div>
            )}

            {item.trecho_publico && (
              <blockquote className={styles.cardExcerpt}>
                {item.trecho_publico}
              </blockquote>
            )}
            {item.resumo_ia && (
              <div className={styles.cardAi}>
                <strong>Resumo IA:</strong> {item.resumo_ia}
              </div>
            )}
            {item.status === "rejeitado" && item.rejeitado_motivo && (
              <div className={styles.rejectedReason}>
                <strong>Motivo da rejeição:</strong> {item.rejeitado_motivo}
              </div>
            )}
            {item.reportado && item.reportado_motivos?.length > 0 && (
              <div className={styles.reportReasons}>
                <strong>Sinalizações:</strong>
                <ul>
                  {item.reportado_motivos.map((reason, index) => (
                    <li key={`${item.id}-${index}`}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            <footer className={styles.cardFooter}>
              <a
                href={item.url_original}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.originalLink}
              >
                Ver publicação original <ExternalLink size={13} />
              </a>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.neutralAction}
                  onClick={() => onEdit(item)}
                  disabled={itemBusy}
                >
                  <Edit2 size={14} /> Editar
                </button>
                {item.status === "pendente" && (
                  <>
                    <button
                      type="button"
                      className={styles.approveAction}
                      onClick={() => onApprove(item.id)}
                      disabled={itemBusy}
                    >
                      <Check size={14} /> Aprovar
                    </button>
                    <button
                      type="button"
                      className={styles.rejectAction}
                      onClick={() => onReject(item.id)}
                      disabled={itemBusy}
                    >
                      <X size={14} /> Rejeitar
                    </button>
                  </>
                )}
                {item.status === "aprovado" && (
                  <button
                    type="button"
                    className={styles.rejectAction}
                    onClick={() => onDelete(item)}
                    disabled={itemBusy}
                  >
                    <Trash2 size={14} /> Apagar
                  </button>
                )}
                {item.status !== "arquivado" && (
                  <button
                    type="button"
                    className={styles.archiveAction}
                    onClick={() => onArchive(item.id)}
                    disabled={itemBusy}
                  >
                    <Archive size={14} /> Arquivar
                  </button>
                )}
              </div>
            </footer>
          </article>
        );
      })}
    </section>
  );
}
