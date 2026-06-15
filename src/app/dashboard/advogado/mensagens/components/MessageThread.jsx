"use client";

import {
  ArrowLeft,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
  MapPin,
  MessageCircle,
  Mic,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import styles from "../Mensagens.module.css";
import MessageContent from "./MessageContent";

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function dateLabel(value) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function initials(value) {
  return (
    String(value || "Cliente")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "CL"
  );
}

function formatRecording(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(
    2,
    "0",
  )}`;
}

export default function MessageThread({ controller }) {
  const fileInputRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const conversation = controller.selectedConversation;

  const groups = useMemo(() => {
    const result = [];
    let currentLabel = null;

    for (const message of controller.messages) {
      const label = dateLabel(message.created_at);
      if (label !== currentLabel) {
        currentLabel = label;
        result.push({ label, messages: [] });
      }
      result[result.length - 1].messages.push(message);
    }

    return result;
  }, [controller.messages]);

  useEffect(() => {
    const area = messagesAreaRef.current;
    if (!area) return;
    area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
  }, [controller.messages, controller.selectedId]);

  if (!conversation) {
    return (
      <section className={styles.threadPanel}>
        <div className={styles.emptyThread}>
          <span className={styles.emptyThreadIcon}>
            <MessageCircle size={38} aria-hidden="true" />
          </span>
          <h2>Selecione uma conversa</h2>
          <p>
            Escolha um cliente na caixa de entrada para visualizar e responder às
            mensagens.
          </p>
        </div>
      </section>
    );
  }

  const location = [conversation.case?.city, conversation.case?.state]
    .filter(Boolean)
    .join(" - ");

  async function handleSubmit(event) {
    event.preventDefault();
    await controller.sendDraft();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void controller.sendDraft();
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await controller.uploadFile(file);
  }

  return (
    <section
      className={`${styles.threadPanel} ${
        controller.showThreadMobile ? styles.threadPanelMobileOpen : ""
      }`}
      aria-label={`Conversa com ${conversation.client?.name || "cliente"}`}
    >
      <header className={styles.threadHeader}>
        <button
          type="button"
          className={styles.mobileBack}
          onClick={() => controller.setShowThreadMobile(false)}
          aria-label="Voltar para conversas"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>

        <span className={styles.threadAvatar}>
          {conversation.client?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conversation.client.avatar} alt="" />
          ) : (
            initials(conversation.client?.name)
          )}
        </span>

        <div className={styles.threadIdentity}>
          <div className={styles.threadNameLine}>
            <h2>{conversation.client?.name || "Cliente"}</h2>
            <span
              className={`${styles.threadStatus} ${
                styles[`status_${conversation.status?.tone}`] || ""
              }`}
            >
              {conversation.status?.label || "Conversa"}
            </span>
          </div>
          <p>{conversation.case?.title || "Caso"}</p>
          <span>
            {conversation.case?.area || "Área não informada"}
            {location && (
              <>
                <i aria-hidden="true">•</i>
                <MapPin size={11} aria-hidden="true" /> {location}
              </>
            )}
          </span>
        </div>

        <a
          href={conversation.chatHref}
          className={styles.fullChatLink}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir conversa em tela cheia"
        >
          <ExternalLink size={15} aria-hidden="true" />
          <span>Abrir completa</span>
        </a>
      </header>

      <div className={styles.securityStrip}>
        <ShieldCheck size={14} aria-hidden="true" />
        A conversa é restrita aos participantes vinculados ao caso.
      </div>

      <div className={styles.messagesArea} ref={messagesAreaRef}>
        {controller.loadingThread ? (
          <div className={styles.threadLoading}>
            <Loader2 size={25} className={styles.spinner} aria-hidden="true" />
            <span>Carregando mensagens...</span>
          </div>
        ) : controller.threadError ? (
          <div className={styles.threadError} role="alert">
            <MessageCircle size={30} aria-hidden="true" />
            <strong>Não foi possível abrir a conversa</strong>
            <p>{controller.threadError}</p>
            <button type="button" onClick={controller.reloadThread}>
              <RefreshCw size={14} aria-hidden="true" /> Tentar novamente
            </button>
          </div>
        ) : groups.length === 0 ? (
          <div className={styles.emptyMessages}>
            <MessageCircle size={40} aria-hidden="true" />
            <strong>Nenhuma mensagem ainda</strong>
            <p>
              {conversation.mode === "NEGOTIATION"
                ? "Envie uma mensagem para iniciar a negociação com o cliente."
                : "Envie a primeira mensagem para iniciar o atendimento deste caso."}
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} className={styles.messageGroup}>
              <div className={styles.dateSeparator}>
                <span>{group.label}</span>
              </div>

              {group.messages.map((message) => {
                const own =
                  String(message.sender_id) ===
                  String(controller.profileData?.id || "");

                return (
                  <div
                    key={message.id}
                    className={`${styles.messageRow} ${
                      own ? styles.messageRowOwn : styles.messageRowOther
                    }`}
                  >
                    <div
                      className={`${styles.messageBubble} ${
                        own ? styles.messageBubbleOwn : styles.messageBubbleOther
                      }`}
                    >
                      <MessageContent content={message.content} />
                      <span className={styles.messageMeta}>
                        {formatTime(message.created_at)}
                        {own &&
                          (message.is_read ? (
                            <CheckCheck size={13} aria-label="Mensagem lida" />
                          ) : (
                            <Check size={13} aria-label="Mensagem enviada" />
                          ))}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <footer className={styles.composer}>
        <input
          ref={fileInputRef}
          type="file"
          className={styles.hiddenFileInput}
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/*,video/mp4,video/webm,text/plain"
          onChange={handleFileChange}
          disabled={controller.uploading || controller.sending}
        />

        {controller.isRecording ? (
          <div className={styles.recordingBar}>
            <span className={styles.recordingDot} aria-hidden="true" />
            <strong>{formatRecording(controller.recordingSeconds)}</strong>
            <span>Gravando mensagem de voz</span>
            <button
              type="button"
              onClick={controller.cancelRecording}
              aria-label="Cancelar gravação"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.finishRecording}
              onClick={controller.stopRecording}
              aria-label="Concluir e enviar gravação"
            >
              <Square size={15} fill="currentColor" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.composerForm}>
            <button
              type="button"
              className={styles.composerIconButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={controller.uploading || controller.sending}
              aria-label="Anexar arquivo"
            >
              {controller.uploading ? (
                <Loader2 size={19} className={styles.spinner} aria-hidden="true" />
              ) : (
                <Paperclip size={19} aria-hidden="true" />
              )}
            </button>

            <textarea
              value={controller.draft}
              onChange={(event) => controller.setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              rows={1}
              maxLength={5000}
              disabled={controller.uploading}
            />

            {controller.draft.trim() ? (
              <button
                type="submit"
                className={styles.sendButton}
                disabled={controller.sending || controller.uploading}
                aria-label="Enviar mensagem"
              >
                {controller.sending ? (
                  <Loader2 size={19} className={styles.spinner} aria-hidden="true" />
                ) : (
                  <Send size={19} aria-hidden="true" />
                )}
              </button>
            ) : (
              <button
                type="button"
                className={styles.composerIconButton}
                onClick={controller.startRecording}
                disabled={controller.uploading || controller.sending}
                aria-label="Gravar mensagem de voz"
              >
                <Mic size={19} aria-hidden="true" />
              </button>
            )}
          </form>
        )}
      </footer>
    </section>
  );
}
