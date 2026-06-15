"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  Gift,
  Loader2,
  ShieldCheck,
  Star,
} from "lucide-react";
import toast from "react-hot-toast";

import LawyerDashboardShell from "../components/LawyerDashboardShell";
import { useLawyerSession } from "../LawyerSessionContext";
import styles from "./page.module.css";

const QUESTIONS = [
  {
    id: "q1",
    label:
      "Design e padronizacao visual: como voce avalia a nova apresentacao das telas refatoradas?",
  },
  {
    id: "q2",
    label:
      "Facilidade de uso: as novas rotas ficaram mais claras para encontrar e usar as ferramentas?",
  },
  {
    id: "q3",
    label:
      "Velocidade: como voce percebe o carregamento e a resposta das telas atualizadas?",
  },
  {
    id: "q4",
    label:
      "Estabilidade: a plataforma parece mais consistente, sem travamentos ou comportamentos inesperados?",
  },
  {
    id: "q5",
    label:
      "Seguranca e confianca: as mudancas transmitem mais seguranca para lidar com dados juridicos sensiveis?",
  },
  {
    id: "q6",
    label:
      "Qualidade geral: considerando a experiencia completa, qual sua nota para a atualizacao da plataforma?",
  },
  {
    id: "q7",
    label:
      "Qualidade da IA: Redator, Triagem, Jurisprudencia e ferramentas inteligentes ficaram mais uteis e confiaveis?",
  },
  {
    id: "q8",
    label:
      "Cartao digital interativo: o novo cartao digital ficou profissional, util e facil de compartilhar?",
  },
  {
    id: "q9",
    label:
      "Organizacao das rotas: separar as ferramentas em telas proprias melhorou sua rotina dentro do painel?",
  },
  {
    id: "q10",
    label:
      "Recomendacao: depois da atualizacao, o quanto voce recomendaria o Social Juridico para outro advogado?",
  },
];

function missingRatings(ratings) {
  return QUESTIONS.some((question) => ratings[question.id] === undefined);
}

export default function PesquisaAtualizacaoPage() {
  const { refreshProfile } = useLawyerSession();
  const [ratings, setRatings] = useState({});
  const [feedback, setFeedback] = useState("");
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [notAllowedMsg, setNotAllowedMsg] = useState("");

  useEffect(() => {
    async function checkEligibility() {
      try {
        const response = await fetch("/api/pesquisa/advogado/atualizacao", {
          cache: "no-store",
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          setNotAllowedMsg(data?.error || "Sessao invalida ou erro no servidor.");
          return;
        }

        if (!data?.canEvaluate) {
          setNotAllowedMsg(data?.reason || "Pesquisa indisponivel.");
        }
      } catch {
        setNotAllowedMsg("Erro ao verificar elegibilidade.");
      } finally {
        setChecking(false);
      }
    }

    void checkEligibility();
  }, []);

  function handleStarClick(questionId, value) {
    setRatings((current) => ({ ...current, [questionId]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (missingRatings(ratings)) {
      toast.error("Por favor, avalie todos os itens com estrelas.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/pesquisa/advogado/atualizacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ratings, feedback }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || "Erro ao enviar pesquisa.");
      }

      toast.success(data.message || "Pesquisa enviada com sucesso!");
      await refreshProfile();
      setSuccess(true);
    } catch (error) {
      toast.error(error.message || "Erro na comunicacao com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <LawyerDashboardShell
        activeRoute="pesquisa-atualizacao"
        title="Pesquisa de atualizacao"
        subtitle="Avalie a nova experiencia da plataforma e receba 4 Juris"
        icon={ClipboardCheck}
      >
        <section className={styles.stateCard}>
          <Loader2 className={styles.spin} size={28} />
          <h1>Carregando pesquisa</h1>
          <p>Verificando se voce pode responder esta rodada.</p>
        </section>
      </LawyerDashboardShell>
    );
  }

  if (notAllowedMsg) {
    return (
      <LawyerDashboardShell
        activeRoute="pesquisa-atualizacao"
        title="Pesquisa de atualizacao"
        subtitle="Avalie a nova experiencia da plataforma e receba 4 Juris"
        icon={ClipboardCheck}
      >
        <section className={styles.stateCard}>
          <ShieldCheck size={32} />
          <h1>Aviso</h1>
          <p>{notAllowedMsg}</p>
          <Link href="/dashboard/advogado/oportunidade" className={styles.backBtn}>
            Voltar ao painel
          </Link>
        </section>
      </LawyerDashboardShell>
    );
  }

  if (success) {
    return (
      <LawyerDashboardShell
        activeRoute="pesquisa-atualizacao"
        title="Pesquisa de atualizacao"
        subtitle="Avalie a nova experiencia da plataforma e receba 4 Juris"
        icon={ClipboardCheck}
      >
        <section className={styles.stateCard}>
          <CheckCircle2 size={36} />
          <h1>Muito obrigado!</h1>
          <p>
            Sua opiniao ajuda a ajustar a plataforma para a rotina real da
            advocacia.
          </p>
          <strong>4 Juris foram adicionados a sua conta.</strong>
          <Link href="/dashboard/advogado/oportunidade" className={styles.backBtn}>
            Voltar ao painel
          </Link>
        </section>
      </LawyerDashboardShell>
    );
  }

  return (
    <LawyerDashboardShell
      activeRoute="pesquisa-atualizacao"
      title="Pesquisa de atualizacao"
      subtitle="Avalie a nova experiencia da plataforma e receba 4 Juris"
      icon={ClipboardCheck}
    >
      <div className={styles.page}>
        <section className={styles.hero} aria-labelledby="survey-title">
          <div>
            <span className={styles.eyebrow}>
              <Gift size={16} aria-hidden="true" />
              Recompensa de 4 Juris
            </span>
            <h1 id="survey-title">Como ficou o novo Social Juridico?</h1>
            <p>
              Avalie design, seguranca, velocidade, estabilidade, facilidade de
              uso, qualidade da IA e cartao digital interativo.
            </p>
          </div>
          <div className={styles.heroBadge}>
            <strong>{Object.keys(ratings).length}/{QUESTIONS.length}</strong>
            <span>itens avaliados</span>
          </div>
        </section>

        <section className={styles.formCard}>
          <form onSubmit={handleSubmit}>
            <div className={styles.questionGrid}>
              {QUESTIONS.map((question, index) => (
                <div key={question.id} className={styles.questionBlock}>
                  <div className={styles.questionTitle}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{question.label}</strong>
                  </div>
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleStarClick(question.id, star)}
                        className={`${styles.starBtn} ${
                          ratings[question.id] >= star ? styles.active : ""
                        }`}
                        aria-label={`Nota ${star} para ${question.label}`}
                      >
                        <Star
                          fill={
                            ratings[question.id] >= star
                              ? "currentColor"
                              : "none"
                          }
                          size={24}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.feedbackSection}>
              <label className={styles.feedbackLabel} htmlFor="feedback">
                Feedback final
              </label>
              <textarea
                id="feedback"
                className={styles.textarea}
                placeholder="Conte o que melhorou, o que ainda incomoda, quais telas precisam de ajuste ou que recurso voce gostaria de ver agora..."
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                maxLength={2500}
              />
              <small>{feedback.length}/2500 caracteres</small>
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={loading || missingRatings(ratings)}
            >
              {loading ? (
                <>
                  <Loader2 className={styles.spin} size={18} /> Enviando...
                </>
              ) : (
                "Enviar pesquisa e ganhar 4 Juris"
              )}
            </button>
          </form>
        </section>
      </div>
    </LawyerDashboardShell>
  );
}
