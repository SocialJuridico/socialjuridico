"use client";

import {
  Loader2,
  Mic,
  Paperclip,
  Send,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import styles from "./Chat.module.css";
import { useVoiceRecorder } from "./useVoiceRecorder";

const ACCEPTED_FILES = [
  "image/*",
  "audio/*",
  "video/mp4",
  "video/webm",
  "application/pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".rtf",
  ".txt",
].join(",");

function formatSeconds(value) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function ChatComposer({
  canSend,
  sending,
  uploading,
  onSendText,
  onSendAttachment,
}) {
  const [text, setText] = useState("");
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const completeVoice = useCallback(
    async (file) => {
      await onSendAttachment(file);
    },
    [onSendAttachment],
  );

  const recorder = useVoiceRecorder({
    onComplete: completeVoice,
    onError: () => {
      toast.error("Não foi possível acessar ou utilizar o microfone.");
    },
  });

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 132)}px`;
  }, [text]);

  async function submit(event) {
    event?.preventDefault();
    if (!text.trim() || sending || uploading) return;
    const value = text;
    setText("");
    const sent = await onSendText(value);
    if (!sent) setText(value);
    textareaRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit(event);
    }
  }

  async function handleFiles(files) {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("O arquivo excede o limite de 20 MB.");
      return;
    }
    await onSendAttachment(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePaste(event) {
    const file = [...(event.clipboardData?.files || [])][0];
    if (!file) return;
    event.preventDefault();
    void handleFiles([file]);
  }

  if (!canSend) {
    return (
      <footer className={styles.readOnlyComposer}>
        <ShieldAlert size={18} />
        <div>
          <strong>Conversa somente para leitura</strong>
          <span>O status atual não permite novas mensagens.</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className={styles.composerArea}>
      <form className={styles.composer} onSubmit={submit}>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILES}
          className={styles.hiddenInput}
          onChange={(event) => void handleFiles(event.target.files)}
          disabled={uploading || sending || recorder.recording}
        />

        {!recorder.recording && (
          <button
            type="button"
            className={styles.composerIconButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || sending}
            aria-label="Anexar arquivo"
            title="Imagem, áudio, PDF, Word e outros documentos"
          >
            {uploading ? (
              <Loader2 size={21} className={styles.spinner} />
            ) : (
              <Paperclip size={21} />
            )}
          </button>
        )}

        {recorder.recording ? (
          <div className={styles.recordingBar}>
            <span className={styles.recordingDot} />
            <strong>{formatSeconds(recorder.seconds)}</strong>
            <span>Gravando mensagem de voz</span>
            <button
              type="button"
              onClick={recorder.cancel}
              aria-label="Cancelar gravação"
            >
              <Trash2 size={19} />
            </button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
            maxLength={5000}
            className={styles.composerInput}
            placeholder={uploading ? "Enviando arquivo..." : "Mensagem"}
            disabled={uploading}
            aria-label="Mensagem"
          />
        )}

        {recorder.recording ? (
          <button
            type="button"
            className={styles.sendButton}
            onClick={recorder.stopAndSend}
            disabled={uploading}
            aria-label="Enviar mensagem de voz"
          >
            <Send size={20} />
          </button>
        ) : text.trim() ? (
          <button
            type="submit"
            className={styles.sendButton}
            disabled={sending || uploading}
            aria-label="Enviar mensagem"
          >
            {sending ? (
              <Loader2 size={20} className={styles.spinner} />
            ) : (
              <Send size={20} />
            )}
          </button>
        ) : (
          <button
            type="button"
            className={styles.sendButton}
            onClick={recorder.start}
            disabled={sending || uploading}
            aria-label="Gravar mensagem de voz"
          >
            <Mic size={21} />
          </button>
        )}
      </form>
      <small className={styles.composerHint}>
        Enter envia · Shift+Enter cria uma linha · anexos protegidos por URL temporária
      </small>
    </footer>
  );
}
