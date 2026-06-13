"use client";

import {
  AlertTriangle,
  Bot,
  Loader2,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import ChatAssistantDrawer from "./ChatAssistantDrawer";
import ChatComposer from "./ChatComposer";
import ChatHeader from "./ChatHeader";
import ChatMessages from "./ChatMessages";
import ChatVideoModal, { VideoCostModal } from "./ChatVideoModal";
import styles from "./Chat.module.css";
import { useChatConversation } from "./useChatConversation";

function LoadingScreen() {
  return (
    <div className={styles.fullScreenState}>
      <span>
        <MessageCircle size={32} />
      </span>
      <Loader2 size={28} className={styles.spinner} />
      <strong>Carregando conversa segura</strong>
      <p>Validando participantes, histórico e permissões.</p>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className={styles.fullScreenState}>
      <span className={styles.errorStateIcon}>
        <AlertTriangle size={31} />
      </span>
      <strong>Não foi possível abrir a conversa</strong>
      <p>{message}</p>
      <div className={styles.stateActions}>
        <button type="button" onClick={onRetry}>
          <RefreshCw size={16} />
          Tentar novamente
        </button>
        <Link href="/">Voltar ao início</Link>
      </div>
    </div>
  );
}

export default function ChatPageClient() {
  const chat = useChatConversation();
  const [showVideoCost, setShowVideoCost] = useState(false);

  if (chat.loading && !chat.context) return <LoadingScreen />;
  if (chat.error && !chat.context) {
    return <ErrorScreen message={chat.error} onRetry={chat.reload} />;
  }
  if (!chat.context) return <LoadingScreen />;

  const { conversation, currentUser } = chat.context;

  function requestVideo() {
    if (Number(currentUser.balance || 0) < 2) {
      toast.error("São necessários 2 Juris para iniciar a videochamada.");
      return;
    }
    setShowVideoCost(true);
  }

  async function confirmVideo() {
    const session = await chat.startVideo();
    if (session) setShowVideoCost(false);
  }

  function openAssistant() {
    void chat.askAssistant({ scope: "GLOBAL" });
  }

  return (
    <div className={styles.chatApp}>
      <ChatHeader
        context={chat.context}
        videoStarting={chat.videoStarting}
        onRequestVideo={requestVideo}
      />

      {conversation.mode === "NEGOTIATION" && (
        <div className={styles.negotiationBanner}>
          <ShieldCheck size={15} />
          <span>
            Conversa de negociação vinculada à manifestação de interesse. Somente
            cliente e advogado participante possuem acesso.
          </span>
        </div>
      )}

      <ChatMessages
        messages={chat.messages}
        loadingOlder={chat.loadingOlder}
        hasMore={chat.pagination.hasMore}
        assistantLoading={chat.assistantLoading}
        videoJoiningId={chat.videoJoiningId}
        onLoadOlder={chat.loadOlder}
        onAnalyze={(messageId) =>
          void chat.askAssistant({ scope: "MESSAGE", messageId })
        }
        onJoinVideo={(sessionId) => void chat.joinVideo(sessionId)}
      />

      <ChatComposer
        canSend={conversation.canSend}
        sending={chat.sending}
        uploading={chat.uploading}
        onSendText={chat.sendText}
        onSendAttachment={chat.sendAttachment}
      />

      <button
        type="button"
        className={styles.assistantFloatingButton}
        onClick={openAssistant}
        disabled={chat.assistantLoading}
        aria-label={`Abrir ${currentUser.assistantName}`}
        title={currentUser.assistantName}
      >
        {chat.assistantLoading ? (
          <Loader2 size={23} className={styles.spinner} />
        ) : currentUser.role === "CLIENT" ? (
          <Sparkles size={23} />
        ) : (
          <Bot size={23} />
        )}
        <span>{currentUser.assistantName}</span>
      </button>

      <ChatAssistantDrawer
        open={chat.assistantOpen}
        loading={chat.assistantLoading}
        analysis={chat.analysis}
        assistantName={currentUser.assistantName}
        role={currentUser.role}
        onClose={chat.closeAssistant}
        onRefresh={openAssistant}
      />

      <VideoCostModal
        open={showVideoCost}
        balance={currentUser.balance}
        loading={chat.videoStarting}
        onCancel={() => setShowVideoCost(false)}
        onConfirm={() => void confirmVideo()}
      />

      <ChatVideoModal session={chat.activeVideo} onClose={chat.closeVideo} />
    </div>
  );
}
