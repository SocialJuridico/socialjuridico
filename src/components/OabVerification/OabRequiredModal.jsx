"use client";

import { ShieldCheck, X } from "lucide-react";

import styles from "./OabRequiredModal.module.css";

const WHATSAPP_SUPORTE = "5515992653066";
const MENSAGEM_PADRAO =
  "Olá! Quero concluir a verificação da minha OAB para liberar todos os recursos da plataforma.";

function linkSuporte() {
  return `https://wa.me/${WHATSAPP_SUPORTE}?text=${encodeURIComponent(MENSAGEM_PADRAO)}`;
}

function textoContagem(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return null;
  if (daysLeft <= 0) {
    return "O prazo de carência terminou. Verifique sua OAB para reativar o acesso completo.";
  }
  const plural = daysLeft === 1 ? "dia" : "dias";
  return `Faltam ${daysLeft} ${plural} para verificar sua OAB antes que o acesso seja bloqueado.`;
}

export default function OabRequiredModal({ isOpen, onClose, daysLeft }) {
  if (!isOpen) return null;

  const contagem = textoContagem(daysLeft);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="oab-modal-title" onClick={onClose}>
      <div className={styles.card} onClick={(event) => event.stopPropagation()}>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
          <X size={18} aria-hidden="true" />
        </button>

        <div className={styles.icon}>
          <ShieldCheck size={28} aria-hidden="true" />
        </div>

        <h2 id="oab-modal-title" className={styles.title}>
          Verifique sua OAB para liberar este recurso
        </h2>

        <p className={styles.text}>
          O acesso às <strong>Oportunidades</strong> é exclusivo para advogados com a
          OAB verificada. A verificação confirma sua identidade e protege os casos
          publicados na plataforma.
        </p>

        <p className={styles.text}>
          Enquanto a OAB não for verificada, você continua com acesso limitado. Conclua
          a verificação com nosso suporte para liberar todos os benefícios.
        </p>

        {contagem && <p className={styles.countdown}>{contagem}</p>}

        <div className={styles.actions}>
          <a className={styles.primaryBtn} href={linkSuporte()} target="_blank" rel="noopener noreferrer">
            Verificar OAB no suporte
          </a>
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
