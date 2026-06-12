import {
  ChevronDown,
  ChevronRight,
  Edit3,
  MessageSquare,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";

import { formatDate } from "../config";
import styles from "../AnunciantesAdmin.module.css";
import AdvertiserAdRow from "./AdvertiserAdRow";

export default function AdvertiserCard({
  advertiser,
  expanded,
  busyAction,
  onToggleExpanded,
  onEdit,
  onOpenSupport,
  onChangeStatus,
  onToggleFeatured,
  onArchiveAd,
  onRestoreAd,
}) {
  const activeAds = advertiser.ads.filter((ad) => ad.status === "ATIVO").length;
  const featuredAds = advertiser.ads.filter(
    (ad) => ad.status === "ATIVO" && ad.featured,
  ).length;
  const statusBusy = busyAction.endsWith(`:${advertiser.id}`);

  return (
    <article
      className={styles.advertiserCard}
      data-active={advertiser.active ? "true" : "false"}
    >
      <button
        type="button"
        className={styles.advertiserSummary}
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <span className={styles.expandIcon}>
          {expanded ? (
            <ChevronDown size={18} aria-hidden="true" />
          ) : (
            <ChevronRight size={18} aria-hidden="true" />
          )}
        </span>

        <span className={styles.companyAvatar}>
          {advertiser.companyName.slice(0, 2).toUpperCase()}
        </span>

        <span className={styles.companyIdentity}>
          <strong>{advertiser.companyName}</strong>
          <small>
            @{advertiser.username} · {advertiser.maskedWhatsapp}
          </small>
        </span>

        <span className={styles.accountStatus} data-active={advertiser.active}>
          {advertiser.active ? (
            <ShieldCheck size={14} aria-hidden="true" />
          ) : (
            <ShieldOff size={14} aria-hidden="true" />
          )}
          {advertiser.active ? "Ativa" : "Suspensa"}
        </span>

        <span className={styles.summaryMetric}>
          <strong>{activeAds}</strong>
          <small>ativos</small>
        </span>

        <span className={styles.summaryMetric}>
          <strong>{featuredAds}</strong>
          <small>destaques</small>
        </span>

        <span className={styles.summaryMetric}>
          <strong>{advertiser.support.messageCount}</strong>
          <small>mensagens</small>
        </span>
      </button>

      <div className={styles.cardActions}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => onOpenSupport(advertiser)}
          aria-label={`Abrir suporte de ${advertiser.companyName}`}
          title="Abrir suporte"
        >
          <MessageSquare size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={() => onEdit(advertiser)}
          aria-label={`Editar ${advertiser.companyName}`}
          title="Editar cadastro"
        >
          <Edit3 size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className={
            advertiser.active
              ? styles.dangerOutlineButton
              : styles.secondaryButton
          }
          onClick={() => onChangeStatus(advertiser)}
          disabled={statusBusy}
        >
          {advertiser.active ? (
            <ShieldOff size={15} aria-hidden="true" />
          ) : (
            <ShieldCheck size={15} aria-hidden="true" />
          )}
          {advertiser.active ? "Suspender" : "Reativar"}
        </button>
      </div>

      {expanded && (
        <div className={styles.advertiserDetails}>
          <div className={styles.detailBar}>
            <span>Cadastrado em {formatDate(advertiser.createdAt)}</span>
            <span>
              {advertiser.ads.length} anúncio(s) no histórico · última mensagem:{" "}
              {advertiser.support.lastMessageAt
                ? formatDate(advertiser.support.lastMessageAt)
                : "nenhuma"}
            </span>
          </div>

          {advertiser.ads.length ? (
            <div className={styles.adsList}>
              {advertiser.ads.map((ad) => (
                <AdvertiserAdRow
                  key={ad.id}
                  ad={ad}
                  advertiserActive={advertiser.active}
                  busyAction={busyAction}
                  onToggleFeatured={onToggleFeatured}
                  onArchive={onArchiveAd}
                  onRestore={onRestoreAd}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyAds}>
              Nenhum anúncio foi criado por este anunciante.
            </div>
          )}
        </div>
      )}
    </article>
  );
}
