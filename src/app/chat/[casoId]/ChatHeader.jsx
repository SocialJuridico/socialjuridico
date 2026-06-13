"use client";

import { ArrowLeft, Scale, ShieldCheck, Video, WalletCards } from "lucide-react";
import Link from "next/link";

import styles from "./Chat.module.css";

function initials(name) {
  return String(name || "SJ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusLabel(conversation) {
  if (conversation.mode === "NEGOTIATION") {
    return conversation.interestStatus === "HIRED"
      ? "Negociação concluída"
      : "Em negociação";
  }

  const labels = {
    CONTRATADO: "Atendimento contratado",
    EM_ANDAMENTO: "Caso em andamento",
    FECHADO: "Caso finalizado",
    CANCELADO: "Caso cancelado",
  };
  return labels[conversation.caseStatus] || "Atendimento jurídico";
}

export default function ChatHeader({
  context,
  videoStarting,
  onRequestVideo,
}) {
  const { conversation, currentUser, partner, navigation } = context;
  const insufficientBalance =
    currentUser.role === "LAWYER" && Number(currentUser.balance || 0) < 2;

  return (
    <header className={styles.chatHeader}>
      <div className={styles.headerIdentity}>
        <Link
          href={navigation.backHref}
          className={styles.headerBack}
          aria-label="Voltar ao painel"
        >
          <ArrowLeft size={21} />
        </Link>

        <span className={styles.partnerAvatar} aria-hidden="true">
          {partner?.avatar ? (
            <img src={partner.avatar} alt="" />
          ) : partner?.name ? (
            initials(partner.name)
          ) : (
            <Scale size={19} />
          )}
        </span>

        <div className={styles.headerCopy}>
          <strong>{partner?.name || "Conversa jurídica"}</strong>
          <span>{conversation.caseTitle}</span>
          <small>
            <ShieldCheck size={12} />
            {statusLabel(conversation)}
          </small>
        </div>
      </div>

      <div className={styles.headerActions}>
        {currentUser.role === "LAWYER" && (
          <span className={styles.balanceChip} title="Saldo de Juris">
            <WalletCards size={15} />
            <b>{Number(currentUser.balance || 0)}</b>
            <span>Juris</span>
          </span>
        )}

        {conversation.canStartVideo && (
          <button
            type="button"
            className={styles.videoButton}
            onClick={onRequestVideo}
            disabled={videoStarting || insufficientBalance}
            title={
              insufficientBalance
                ? "São necessários 2 Juris para iniciar"
                : "Iniciar videochamada por 2 Juris"
            }
          >
            <Video size={18} />
            <span>{videoStarting ? "Criando..." : "Videochamada"}</span>
            <em>2 Juris</em>
          </button>
        )}
      </div>
    </header>
  );
}
