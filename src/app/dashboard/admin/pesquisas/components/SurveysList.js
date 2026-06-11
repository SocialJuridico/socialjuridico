"use client";

import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Scale,
} from "lucide-react";
import { useRef } from "react";
import toast from "react-hot-toast";
import { SURVEY_TABS } from "../config/surveyQuestions";
import SurveyStars from "./SurveyStars";
import styles from "../Pesquisas.module.css";

function sanitizeFileName(value) {
  return String(value || "usuario")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "usuario";
}

function formatDate(value) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export default function SurveysList({
  tab,
  items,
  questions,
  expandedId,
  onToggle,
  calculateAverage,
}) {
  const cardRefs = useRef(new Map());
  const isLawyerTab = tab === SURVEY_TABS.LAWYERS;

  async function downloadCard(item, userName) {
    const card = cardRefs.current.get(item.id);
    if (!card) return;

    const toastId = toast.loading("Gerando imagem...");

    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(card, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#0d0f14",
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `Avaliacao_SocialJuridico_${sanitizeFileName(userName)}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem gerada com sucesso.", { id: toastId });
    } catch (error) {
      console.error("[Admin/Pesquisas] Erro ao gerar PNG:", error);
      toast.error("Não foi possível gerar a imagem.", { id: toastId });
    }
  }

  if (!items.length) {
    return (
      <div className={styles.emptyState}>
        Nenhuma avaliação registrada nesta categoria.
      </div>
    );
  }

  return (
    <section className={styles.grid} aria-live="polite">
      {items.map((item) => {
        const user = isLawyerTab ? item.advogados : item.clientes;
        const userName = user?.name || "Usuário anônimo";
        const userEmail = user?.email || "E-mail não informado";
        const average = calculateAverage(item, questions);
        const expanded = expandedId === item.id;

        return (
          <article key={item.id} className={styles.cardWrapper}>
            <div
              className={`${styles.card} ${styles.cardCapture}`}
              ref={(node) => {
                if (node) cardRefs.current.set(item.id, node);
                else cardRefs.current.delete(item.id);
              }}
            >
              <time className={styles.date} dateTime={item.created_at || undefined}>
                {formatDate(item.created_at)}
              </time>

              <div className={styles.userInfo}>
                <h2 className={styles.userName}>
                  {isLawyerTab ? <Scale size={18} /> : <CheckCircle size={18} />}
                  {userName}
                </h2>
              </div>

              <div className={styles.averageScore}>
                <span className={styles.scoreText}>
                  Nota média: {average.toFixed(1)}
                </span>
                <SurveyStars value={average} />
              </div>

              {item.feedback ? (
                <blockquote className={styles.feedbackQuote}>
                  “{item.feedback}”
                </blockquote>
              ) : (
                <p className={styles.noFeedback}>Sem comentário textual.</p>
              )}

              {expanded && (
                <div className={styles.detailsList}>
                  <strong className={styles.detailsTitle}>Detalhamento das notas</strong>
                  {questions.map((question) => (
                    <div key={question.key} className={styles.detailItem}>
                      <span>{question.label}</span>
                      <SurveyStars value={item[question.key]} size={14} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className={styles.adminEmail} title={userEmail}>
              {userEmail}
            </p>

            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.detailsBtn}
                onClick={() => onToggle(item.id)}
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {expanded ? "Ocultar notas" : "Ver notas detalhadas"}
              </button>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={() => downloadCard(item, userName)}
              >
                <Download size={16} /> Salvar PNG
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
