"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./page.module.css";
import Link from "next/link";

const QUESTIONS = [
  { id: "q1", text: "Facilidade de Cadastro: O quão simples e rápido foi o processo de criar sua conta e descrever o seu caso jurídico?" },
  { id: "q2", text: "Clareza nas Informações: Você sentiu que a plataforma explicou bem os seus direitos de forma simples e sem 'juridiquês'?" },
  { id: "q3", text: "Velocidade de Resposta: Após publicar seu caso, o quanto você ficou satisfeito com o tempo que levou para os advogados entrarem em contato?" },
  { id: "q4", text: "Confiança nos Profissionais: As avaliações e o histórico dos advogados ajudaram você a se sentir seguro para escolher o profissional ideal?" },
  { id: "q5", text: "Qualidade do Atendimento: Como você avalia a atenção e o profissionalismo do advogado que aceitou o seu caso?" },
  { id: "q6", text: "Uso do Chat Integrado: O quão fácil foi conversar com o advogado e enviar documentos através do chat seguro da plataforma?" },
  { id: "q7", text: "Transparência de Custos: O advogado foi claro ao explicar os valores e as etapas do seu processo?" },
  { id: "q8", text: "Segurança dos Seus Dados: Qual o seu nível de segurança em saber que suas informações pessoais e documentos estão protegidos pela plataforma?" },
  { id: "q9", text: "Acesso via Celular (PWA): Como foi sua experiência ao acessar a plataforma pelo smartphone para acompanhar o seu caso?" },
  { id: "q10", text: "Recomendação: O quanto você recomendaria o SocialJurídico para um amigo ou familiar que estivesse com um problema jurídico urgente?" },
];

export default function AvaliacaoClientePage() {
  const router = useRouter();
  const [ratings, setRatings] = useState({});
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isEligible, setIsEligible] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function checkEligibility() {
      try {
        const res = await fetch("/api/pesquisa/cliente");
        const data = await res.json();
        
        if (res.ok && data.canEvaluate) {
          setIsEligible(true);
        } else {
          setErrorMsg(data.reason || "Você não está elegível para avaliar no momento.");
        }
      } catch (err) {
        setErrorMsg("Erro ao verificar elegibilidade.");
      } finally {
        setIsChecking(false);
      }
    }
    checkEligibility();
  }, []);

  const handleRate = (qId, value) => {
    setRatings(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async () => {
    if (Object.keys(ratings).length < 10) {
      toast.error("Por favor, avalie todos os 10 itens antes de enviar.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/pesquisa/cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...ratings, feedback })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Obrigado pelo seu feedback!");
        setSubmitted(true);
      } else {
        toast.error(data.error || "Erro ao salvar avaliação.");
      }
    } catch (err) {
      toast.error("Falha na conexão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isChecking) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Carregando pesquisa...</h1>
        </div>
      </div>
    );
  }

  if (!isEligible && !submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard} style={{ textAlign: "center" }}>
          <h2 style={{ color: "var(--color-gold)", marginBottom: "15px" }}>Aviso</h2>
          <p>{errorMsg}</p>
          <Link href="/dashboard/cliente" className={styles.backBtn} style={{ marginTop: "20px" }}>
            Voltar ao Painel
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.successMessage}>
            <h2>Avaliação Enviada!</h2>
            <p>Muito obrigado por contribuir com a evolução do SocialJurídico. Sua opinião é fundamental para democratizarmos o acesso à justiça.</p>
            <Link href="/dashboard/cliente" className={styles.backBtn}>
              Voltar ao Painel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pesquisa de Experiência do Cliente</h1>
        <p>Sua opinião é fundamental para democratizarmos o acesso à justiça.</p>
        <p style={{ marginTop: 10, fontSize: '14px', color: '#999' }}>Avalie cada item abaixo de 1 a 5 estrelas.</p>
      </div>

      <div className={styles.formCard}>
        {QUESTIONS.map((q) => (
          <div key={q.id} className={styles.questionBlock}>
            <h3 className={styles.questionTitle}>{q.text}</h3>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`${styles.starBtn} ${ratings[q.id] >= star ? styles.active : ""}`}
                  onClick={() => handleRate(q.id, star)}
                >
                  <Star size={32} fill={ratings[q.id] >= star ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.feedbackSection}>
          <label className={styles.feedbackLabel}>Deixe um comentário (Opcional):</label>
          <textarea
            className={styles.textarea}
            placeholder="Como podemos melhorar ainda mais a sua experiência no SocialJurídico?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
        </div>

        <button 
          className={styles.submitBtn} 
          onClick={handleSubmit}
          disabled={isSubmitting || Object.keys(ratings).length < 10}
        >
          {isSubmitting ? "Enviando..." : "Enviar Minha Avaliação"}
        </button>
      </div>
    </div>
  );
}
