"use client";

import {
  Check,
  CheckCheck,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Play,
  Sparkles,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import styles from "./Chat.module.css";

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sem data" : date.toDateString();
}

function dateLabel(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function AttachmentContent({ attachment }) {
  if (!attachment) return <span>Arquivo indisponível</span>;

  if (attachment.kind === "IMAGE" && attachment.url) {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.imageAttachment}
      >
        <img src={attachment.url} alt={attachment.name || "Imagem enviada"} />
        <span>
          <ImageIcon size={14} />
          {attachment.name}
        </span>
      </a>
    );
  }

  if (attachment.kind === "AUDIO" && attachment.url) {
    return (
      <div className={styles.audioAttachment}>
        <Play size={16} aria-hidden="true" />
        <audio controls preload="metadata" src={attachment.url} />
      </div>
    );
  }

  if (attachment.kind === "VIDEO" && attachment.url) {
    return (
      <video
        controls
        preload="metadata"
        src={attachment.url}
        className={styles.videoAttachment}
      />
    );
  }

  return (
    <a
      href={attachment.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.fileAttachment} ${
        !attachment.url ? styles.fileUnavailable : ""
      }`}
      aria-disabled={!attachment.url}
    >
      <span>
        <FileText size={22} />
      </span>
      <div>
        <strong>{attachment.name || "Arquivo"}</strong>
        <small>
          {attachment.kind === "PDF"
            ? "Documento PDF"
            : attachment.kind === "DOCUMENT"
              ? "Documento"
              : "Arquivo anexado"}
        </small>
      </div>
      <Download size={17} />
    </a>
  );
}

function VideoInvite({ message, joining, onJoinVideo }) {
  const video = message.video;
  const ended = !video?.canJoin;

  return (
    <div className={styles.videoInviteCard}>
      <span className={styles.videoInviteIcon}>
        <Video size={22} />
      </span>
      <div>
        <strong>Videochamada jurídica</strong>
        <small>
          {ended
            ? "Esta sessão foi encerrada"
            : "Sala protegida disponível para os participantes"}
        </small>
      </div>
      {!ended && (
        <button
          type="button"
          onClick={() => onJoinVideo(video.sessionId)}
          disabled={joining}
        >
          {joining ? <Loader2 size={15} className={styles.spinner} /> : <Video size={15} />}
          Entrar
        </button>
      )}
    </div>
  );
}

function MessageContent({ message, joining, onJoinVideo }) {
  if (message.type === "ATTACHMENT") {
    return <AttachmentContent attachment={message.attachment} />;
  }
  if (message.type === "VIDEO_INVITE") {
    return (
      <VideoInvite
        message={message}
        joining={joining}
        onJoinVideo={onJoinVideo}
      />
    );
  }
  if (message.type === "LEGACY_VIDEO_INVITE") {
    return (
      <div className={styles.legacyVideoCard}>
        <Video size={18} />
        <div>
          <strong>Convite de videochamada legado</strong>
          <small>Este convite foi criado antes da nova governança.</small>
        </div>
        <a href={message.video?.url} target="_blank" rel="noopener noreferrer">
          Abrir
        </a>
      </div>
    );
  }
  if (message.type === "DELETED") {
    return <p className={styles.deletedMessage}>Mensagem removida</p>;
  }
  return <p className={styles.messageText}>{message.text}</p>;
}

function MessageBubble({
  message,
  assistantLoading,
  joining,
  onAnalyze,
  onJoinVideo,
}) {
  return (
    <div
      className={`${styles.messageRow} ${
        message.own ? styles.messageRowOwn : styles.messageRowOther
      }`}
    >
      <article
        className={`${styles.messageBubble} ${
          message.own ? styles.messageBubbleOwn : styles.messageBubbleOther
        } ${message.pending ? styles.messagePending : ""}`}
      >
        <MessageContent
          message={message}
          joining={joining}
          onJoinVideo={onJoinVideo}
        />
        <footer className={styles.messageMeta}>
          <time>{formatTime(message.createdAt)}</time>
          {message.own &&
            (message.pending ? (
              <Check size={13} />
            ) : message.read ? (
              <CheckCheck size={14} className={styles.readCheck} />
            ) : (
              <CheckCheck size={14} />
            ))}
        </footer>
      </article>

      {!message.own && message.type === "TEXT" && !message.pending && (
        <button
          type="button"
          className={styles.messageAiButton}
          onClick={() => onAnalyze(message.id)}
          disabled={assistantLoading}
          title="Analisar esta mensagem com a IA privada"
        >
          <Sparkles size={12} />
          Analisar
        </button>
      )}
    </div>
  );
}

export default function ChatMessages({
  messages,
  loadingOlder,
  hasMore,
  assistantLoading,
  videoJoiningId,
  onLoadOlder,
  onAnalyze,
  onJoinVideo,
}) {
  const viewportRef = useRef(null);
  const bottomRef = useRef(null);
  const nearBottomRef = useRef(true);
  const firstRenderRef = useRef(true);

  const groups = useMemo(() => {
    const result = [];
    let current = null;
    messages.forEach((message) => {
      const key = dateKey(message.createdAt);
      if (!current || current.key !== key) {
        current = {
          key,
          label: dateLabel(message.createdAt),
          messages: [],
        };
        result.push(current);
      }
      current.messages.push(message);
    });
    return result;
  }, [messages]);

  useEffect(() => {
    if (firstRenderRef.current || nearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: firstRenderRef.current ? "auto" : "smooth" });
      firstRenderRef.current = false;
    }
  }, [messages.length]);

  function handleScroll() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    nearBottomRef.current =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120;
  }

  return (
    <main
      ref={viewportRef}
      className={styles.messagesViewport}
      onScroll={handleScroll}
    >
      <div className={styles.messagesInner}>
        {hasMore && (
          <button
            type="button"
            className={styles.loadOlderButton}
            onClick={onLoadOlder}
            disabled={loadingOlder}
          >
            {loadingOlder && <Loader2 size={14} className={styles.spinner} />}
            Carregar mensagens anteriores
          </button>
        )}

        {!messages.length ? (
          <div className={styles.emptyConversation}>
            <span>
              <MessageCircle size={30} />
            </span>
            <h2>Conversa iniciada</h2>
            <p>
              As mensagens, documentos, áudios e chamadas ficarão organizados
              aqui.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.key} className={styles.messageGroup}>
              <div className={styles.dateDivider}>
                <span>{group.label}</span>
              </div>
              {group.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  assistantLoading={assistantLoading}
                  joining={videoJoiningId === message.video?.sessionId}
                  onAnalyze={onAnalyze}
                  onJoinVideo={onJoinVideo}
                />
              ))}
            </section>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </main>
  );
}
