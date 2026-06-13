"use client";

import {
  ExternalLink,
  Loader2,
  ShieldCheck,
  Video,
  WalletCards,
  X,
} from "lucide-react";

import styles from "./Chat.module.css";

export function VideoCostModal({
  open,
  balance,
  loading,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className={styles.modalBackdrop} role="presentation">
      <section
        className={styles.costModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-cost-title"
      >
        <span className={styles.costModalIcon}>
          <Video size={27} />
        </span>
        <h2 id="video-cost-title">Iniciar videochamada?</h2>
        <p>
          Uma sala privada será criada dentro do atendimento. O cliente receberá
          o convite no chat e uma notificação.
        </p>

        <div className={styles.costSummary}>
          <span>
            <WalletCards size={17} />
            Saldo atual
          </span>
          <strong>{Number(balance || 0)} Juris</strong>
        </div>
        <div className={styles.costSummary}>
          <span>
            <ShieldCheck size={17} />
            Custo da chamada
          </span>
          <strong>2 Juris</strong>
        </div>

        <small>
          A cobrança ocorre apenas na criação da sessão. Entrar novamente na mesma
          chamada não gera novo débito.
        </small>

        <footer>
          <button type="button" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.confirmVideoButton}
            onClick={onConfirm}
            disabled={loading || Number(balance || 0) < 2}
          >
            {loading ? (
              <Loader2 size={17} className={styles.spinner} />
            ) : (
              <Video size={17} />
            )}
            Confirmar por 2 Juris
          </button>
        </footer>
      </section>
    </div>
  );
}

export default function ChatVideoModal({ session, onClose }) {
  if (!session?.joinUrl) return null;
  const iframeUrl = `${session.joinUrl}#config.prejoinPageEnabled=false&config.disableDeepLinking=true`;

  return (
    <div className={styles.videoModalBackdrop} role="presentation">
      <section
        className={styles.videoModal}
        role="dialog"
        aria-modal="true"
        aria-label="Videochamada jurídica"
      >
        <header>
          <div>
            <span>
              <Video size={18} />
            </span>
            <div>
              <strong>Videochamada jurídica</strong>
              <small>Sala exclusiva para cliente e advogado</small>
            </div>
          </div>
          <nav>
            <a
              href={session.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir em nova janela"
            >
              <ExternalLink size={18} />
            </a>
            <button type="button" onClick={onClose} aria-label="Fechar chamada">
              <X size={20} />
            </button>
          </nav>
        </header>

        <iframe
          src={iframeUrl}
          title="Sala de videochamada do Social Jurídico"
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </section>
    </div>
  );
}
