"use client";

import {
  Download,
  ExternalLink,
  File,
  FileText,
  ImageIcon,
  Video,
} from "lucide-react";

import {
  mediaKind,
  parseMediaMessage,
} from "@/lib/messages/messagePresentation";
import styles from "../Mensagens.module.css";

export default function MessageContent({ content }) {
  const media = parseMediaMessage(content);
  if (!media) {
    return <p className={styles.messageText}>{content}</p>;
  }

  const kind = mediaKind(media.fileType);

  if (kind === "IMAGE") {
    return (
      <a
        href={media.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.imageMessage}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.fileUrl} alt={media.fileName} loading="lazy" />
        <span>
          <ImageIcon size={14} aria-hidden="true" />
          {media.fileName}
        </span>
      </a>
    );
  }

  if (kind === "AUDIO") {
    return (
      <div className={styles.audioMessage}>
        <audio src={media.fileUrl} controls preload="metadata" />
        <span>{media.fileName}</span>
      </div>
    );
  }

  if (kind === "VIDEO") {
    return (
      <div className={styles.videoMessage}>
        <video src={media.fileUrl} controls preload="metadata" />
        <a href={media.fileUrl} target="_blank" rel="noopener noreferrer">
          <Video size={14} aria-hidden="true" />
          Abrir vídeo
        </a>
      </div>
    );
  }

  if (kind === "PDF") {
    return (
      <a
        href={media.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.fileMessage}
      >
        <span className={styles.fileMessageIcon}>
          <FileText size={20} aria-hidden="true" />
        </span>
        <span className={styles.fileMessageInfo}>
          <strong>{media.fileName}</strong>
          <small>
            Visualizar PDF <ExternalLink size={11} aria-hidden="true" />
          </small>
        </span>
      </a>
    );
  }

  return (
    <a
      href={media.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download
      className={styles.fileMessage}
    >
      <span className={styles.fileMessageIcon}>
        <File size={20} aria-hidden="true" />
      </span>
      <span className={styles.fileMessageInfo}>
        <strong>{media.fileName}</strong>
        <small>
          Baixar arquivo <Download size={11} aria-hidden="true" />
        </small>
      </span>
    </a>
  );
}
