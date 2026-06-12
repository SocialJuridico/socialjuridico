"use client";

import {
  ExternalLink,
  FileLock2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Paperclip,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { SENSITIVE_ACCESS_PURPOSES } from "../../config/caseManagement";
import styles from "../../CasosAdmin.module.css";
import { formatCaseDate, isSafeExternalUrl } from "./drawerUtils";

export default function CaseSensitiveTab({
  sensitiveDetail,
  loading,
  onUnlock,
}) {
  const [purpose, setPurpose] = useState("SUPPORT");
  const [justification, setJustification] = useState("");

  const safeAttachments = useMemo(
    () =>
      (sensitiveDetail?.attachments || []).filter((attachment) =>
        isSafeExternalUrl(attachment.url),
      ),
    [sensitiveDetail],
  );

  function submitAccess(event) {
    event.preventDefault();
    onUnlock({ purpose, justification });
  }

  if (!sensitiveDetail) {
    return (
      <section className={styles.sensitiveAccessGate}>
        <span className={styles.sensitiveGateIcon}>
          <LockKeyhole size={24} aria-hidden="true" />
        </span>
        <span className={styles.drawerEyebrow}>Acesso controlado</span>
        <h3>Dados sensíveis protegidos</h3>
        <p>
          A descrição, os contatos completos, anexos e mídias não são carregados
          na listagem. Informe a finalidade e uma justificativa legítima. O acesso
          será registrado na auditoria.
        </p>

        <form className={styles.sensitiveAccessForm} onSubmit={submitAccess}>
          <label>
            <span>Finalidade do acesso</span>
            <select
              value={purpose}
              onChange={(event) => setPurpose(event.target.value)}
            >
              {SENSITIVE_ACCESS_PURPOSES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Justificativa</span>
            <textarea
              value={justification}
              onChange={(event) => setJustification(event.target.value)}
              placeholder="Explique por que os dados são necessários para esta atividade."
              maxLength={1000}
              required
            />
            <small>{justification.length}/1000</small>
          </label>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={loading || justification.trim().length < 10}
          >
            {loading ? (
              <LoaderCircle
                size={16}
                className={styles.spinning}
                aria-hidden="true"
              />
            ) : (
              <FileLock2 size={16} aria-hidden="true" />
            )}
            Registrar e liberar acesso
          </button>
        </form>
      </section>
    );
  }

  return (
    <div className={styles.drawerSectionStack}>
      <div className={styles.accessContextBanner}>
        <ShieldCheck size={16} aria-hidden="true" />
        <div>
          <strong>Acesso sensível auditado</strong>
          <span>
            Finalidade: {sensitiveDetail.accessContext?.purpose} · {formatCaseDate(
              sensitiveDetail.accessContext?.accessedAt,
            )}
          </span>
        </div>
      </div>

      <section className={styles.drawerPanel}>
        <h3>Descrição do caso</h3>
        <p className={styles.caseDescription}>
          {sensitiveDetail.description || "Descrição não informada."}
        </p>
      </section>

      <section className={styles.drawerPanel}>
        <div className={styles.drawerPanelHeader}>
          <h3>Contato do cliente</h3>
          <UserRound size={17} aria-hidden="true" />
        </div>
        <div className={styles.contactList}>
          <span>
            <UserRound size={14} aria-hidden="true" />
            {sensitiveDetail.client?.name || "Cliente"}
          </span>
          {sensitiveDetail.client?.email && (
            <span>
              <Mail size={14} aria-hidden="true" />
              {sensitiveDetail.client.email}
            </span>
          )}
          {sensitiveDetail.client?.phone && (
            <span>
              <Phone size={14} aria-hidden="true" />
              {sensitiveDetail.client.phone}
            </span>
          )}
        </div>
      </section>

      <section className={styles.drawerPanel}>
        <div className={styles.drawerPanelHeader}>
          <h3>Anexos e mídias</h3>
          <Paperclip size={17} aria-hidden="true" />
        </div>

        {safeAttachments.length ? (
          <div className={styles.attachmentList}>
            {safeAttachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Paperclip size={14} aria-hidden="true" />
                <span>{attachment.name}</span>
                <ExternalLink size={13} aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : (
          <p className={styles.mutedText}>Nenhum anexo com URL válida.</p>
        )}

        <div className={styles.mediaLinks}>
          {[
            ["Vídeo externo", sensitiveDetail.media?.videoLink],
            ["Arquivo de vídeo", sensitiveDetail.media?.videoUrl],
            ["Arquivo de áudio", sensitiveDetail.media?.audioUrl],
          ]
            .filter(([, url]) => isSafeExternalUrl(url))
            .map(([label, url]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label} <ExternalLink size={13} aria-hidden="true" />
              </a>
            ))}
        </div>
      </section>
    </div>
  );
}
