"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, X } from "lucide-react";

import { TRIAGE_QUESTIONS } from "@/lib/clientDashboard/caseIntentQuestions";
import styles from "../ClientDashboard.module.css";

export default function ClientIntentTriage({
  open,
  submitting,
  onCancel,
  onComplete,
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [prevOpen, setPrevOpen] = useState(open);

  // Reseta o wizard sempre que o modal transita de fechado -> aberto.
  // Ajuste de estado durante a renderização (não em um efeito) é o padrão
  // recomendado pelo React para reagir a mudanças de prop.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setStepIndex(0);
      setAnswers({});
    }
  }

  if (!open) return null;

  const question = TRIAGE_QUESTIONS[stepIndex];
  const isLastStep = stepIndex === TRIAGE_QUESTIONS.length - 1;
  const selectedValue = answers[question.id];

  function selectOption(value) {
    setAnswers((current) => ({ ...current, [question.id]: value }));
  }

  function goBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  function goNext() {
    if (!selectedValue) return;
    if (isLastStep) {
      onComplete(answers);
      return;
    }
    setStepIndex((current) => current + 1);
  }

  return (
    <div className={styles.modalOverlay} role="presentation">
      <section
        className={styles.mediumModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="triage-question-title"
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>Antes de publicar</span>
            <h2 id="triage-question-title">{question.question}</h2>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={onCancel}
            disabled={submitting}
            aria-label="Cancelar publicação"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.triageProgress} aria-hidden="true">
          {TRIAGE_QUESTIONS.map((item, index) => (
            <span
              key={item.id}
              className={`${styles.triageDot} ${
                index <= stepIndex ? styles.triageDotActive : ""
              }`}
            />
          ))}
        </div>

        <div className={styles.triageOptions} role="radiogroup">
          {question.options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selectedValue === option.value}
              className={`${styles.triageOption} ${
                selectedValue === option.value ? styles.triageOptionSelected : ""
              }`}
              onClick={() => selectOption(option.value)}
              disabled={submitting}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className={styles.triageActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={goBack}
            disabled={stepIndex === 0 || submitting}
          >
            <ArrowLeft size={15} aria-hidden="true" /> Voltar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={goNext}
            disabled={!selectedValue || submitting}
          >
            {submitting ? (
              <>
                <Loader2 size={15} className={styles.spinner} aria-hidden="true" />
                Publicando...
              </>
            ) : isLastStep ? (
              "Publicar solicitação"
            ) : (
              "Próxima"
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
