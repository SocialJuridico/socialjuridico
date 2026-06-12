"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Eye,
  ImageOff,
  MonitorSmartphone,
  X,
} from "lucide-react";

import styles from "../AdvogadoMesAdmin.module.css";

const STATUS_LABELS = {
  active: "Publicado",
  scheduled: "Agendado",
  inactive: "Pausado",
  expired: "Encerrado",
  missing: "Não configurado",
};

function resolvePublicationStatus(config, now = Date.now()) {
  if (!String(config?.image_url || "").trim()) return "missing";
  if (config?.is_active !== true) return "inactive";

  const startsAt = config.starts_at ? new Date(config.starts_at).getTime() : null;
  const endsAt = config.ends_at ? new Date(config.ends_at).getTime() : null;

  if (startsAt && startsAt > now) return "scheduled";
  if (endsAt && endsAt <= now) return "expired";
  return "active";
}

function safeDestination(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;

  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default function AdvogadoMesPreview({ config }) {
  const [imageFailed, setImageFailed] = useState(false);
  const publicationStatus = resolvePublicationStatus(config);
  const destination = safeDestination(config.link_url);

  useEffect(() => {
    setImageFailed(false);
  }, [config.image_url]);

  return (
    <aside className={styles.previewCard} aria-labelledby="preview-title">
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>Visualização responsiva</span>
          <h2 id="preview-title">Prévia do popup</h2>
          <p>Simulação aproximada da experiência após o login.</p>
        </div>
        <span
          className={`${styles.statusBadge} ${styles[`status_${publicationStatus}`]}`}
        >
          <Eye size={12} aria-hidden="true" />
          {STATUS_LABELS[publicationStatus] || "Pausado"}
        </span>
      </div>

      <div className={styles.previewViewport}>
        <div className={styles.previewBackdrop}>
          <div className={styles.previewModal}>
            <span className={styles.previewClose} aria-hidden="true">
              <X size={14} />
            </span>

            {config.image_url && !imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.image_url}
                alt={config.alt_text || "Prévia do Advogado do Mês"}
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className={styles.previewEmpty}>
                <ImageOff size={30} aria-hidden="true" />
                <strong>
                  {imageFailed
                    ? "A imagem não pôde ser carregada"
                    : "Nenhuma imagem informada"}
                </strong>
                <span>
                  {imageFailed
                    ? "Confira a URL ou envie um novo arquivo."
                    : "O conteúdo aparecerá aqui durante a configuração."}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <dl className={styles.previewMeta}>
        <div>
          <dt>
            <MonitorSmartphone size={13} aria-hidden="true" /> Exibição
          </dt>
          <dd>Uma vez por sessão e por versão publicada</dd>
        </div>
        <div>
          <dt>Texto alternativo</dt>
          <dd>{config.alt_text || "Ainda não informado"}</dd>
        </div>
        <div>
          <dt>Destino</dt>
          <dd>
            {config.link_url
              ? destination || "Destino inválido — não será publicado"
              : "Imagem sem ação de clique"}
          </dd>
        </div>
      </dl>

      {destination && (
        <a
          href={destination}
          target={destination.startsWith("/") ? undefined : "_blank"}
          rel={destination.startsWith("/") ? undefined : "noopener noreferrer"}
          className={styles.previewLink}
        >
          <ExternalLink size={14} aria-hidden="true" />
          Testar destino configurado
        </a>
      )}
    </aside>
  );
}
