"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./page.module.css";
import Link from "next/link";

const QUESTIONS = [
  { id: "q1", label: "Velocidade e Estabilidade: Como você avalia a rapidez de carregamento das páginas e a estabilidade do sistema no dia a dia?" },
  { id: "q2", label: "Facilidade no Marketplace: O quão intuitivo é o processo de visualizar, filtrar e manifestar interesse em novos casos jurídicos?" },
  { id: "q3", label: "Qualidade do Redator IA 3.0: As petições e minutas geradas pela nossa IA atendem às suas expectativas técnicas e de linguagem?" },
  { id: "q4", label: "Personalidade da IA: O quão útil é a função de ajustar o tom da redação (Formal, Agressivo ou Conciliador) para suas peças?" },
  { id: "q5", label: "Segurança e Confiança: Qual o seu nível de confiança na plataforma para o armazenamento seguro de documentos e provas digitais sensíveis?" },
  { id: "q6", label: "Gestão de Prazos (Copilot): O sistema de alertas e a agenda inteligente auxiliam efetivamente na prevenção de perda de prazos processuais?" },
  { id: "q7", label: "Organização do CRM: Como você avalia a facilidade de gerenciar seus clientes e o histórico de interações dentro da plataforma?" },
  { id: "q8", label: "Experiência com Smart Docs: O processo de upload e a visualização de documentos (PDFs/Imagens) são rápidos e eficientes?" },
  { id: "q9", label: "Suporte e Atendimento: Caso tenha precisado de ajuda, como avalia a agilidade e a resolução de problemas pela nossa equipe?" },
  { id: "q10", label: "Valor Percebido (ROI): Considerando as ferramentas de IA e a captação de clientes, o quanto você sente que a plataforma se paga mensalmente?" },
];

export default function PesquisaSatisfacao() {
  const router = useRouter();
  const [ratings, setRatings] = useState({});
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [success, setSuccess] = useState(false);
  const [notAllowedMsg, setNotAllowedMsg] = useState(null);

  useEffect(() => {
    async function checkEligibility() {
      try {
        const res = await fetch("/api/pesquisa/advogado");
        if (res.ok) {
          const data = await res.json();
          if (!data.canEvaluate) {
            setNotAllowedMsg(data.reason);
          }
        } else {
          setNotAllowedMsg("Sessão inválida ou erro no servidor.");
        }
      } catch (err) {
        setNotAllowedMsg("Erro ao verificar elegibilidade.");
      } finally {
        setChecking(false);
      }
    }
    checkEligibility();
  }, []);

  const handleStarClick = (qId, value) => {
    setRatings(prev => ({ ...prev, [qId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all questions answered
    const missing = QUESTIONS.some(q => ratings[q.id] === undefined);
    if (missing) {
      toast.error("Por favor, avalie todos os itens com estrelas.");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...ratings, feedback };
      const res = await fetch("/api/pesquisa/advogado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Avaliação enviada com sucesso!");
        setSuccess(true);
      } else {
        toast.error(data.error || "Erro ao enviar avaliação.");
      }
    } catch (err) {
      toast.error("Erro na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', paddingTop: '100px' }}>
        <p>Carregando pesquisa...</p>
      </div>
    );
  }

  if (notAllowedMsg) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.successMessage}>
            <h2>Aviso</h2>
            <p>{notAllowedMsg}</p>
            <Link href="/dashboard/advogado" className={styles.backBtn}>Voltar ao Painel</Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.successMessage}>
            <h2>🎉 Muito Obrigado!</h2>
            <p>Sua avaliação é fundamental para continuarmos evoluindo o Social Jurídico.</p>
            <p style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>4 Juris foram adicionados à sua conta!</p>
            <Link href="/dashboard/advogado" className={styles.backBtn}>Voltar ao Painel</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pesquisa de Satisfação SocialJurídico v3.0</h1>
        <p>Instrução: Avalie cada item abaixo com uma nota de 1 a 5 estrelas,<br/>sendo 1 "Muito Insatisfeito" e 5 "Excelente".</p>
      </div>

      <div className={styles.formCard}>
        <form onSubmit={handleSubmit}>
          {QUESTIONS.map((q) => (
            <div key={q.id} className={styles.questionBlock}>
              <div className={styles.questionTitle}>{q.label}</div>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleStarClick(q.id, star)}
                    className={`${styles.starBtn} ${ratings[q.id] >= star ? styles.active : ""}`}
                  >
                    <Star fill={ratings[q.id] >= star ? "currentColor" : "none"} size={32} />
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className={styles.feedbackSection}>
            <label className={styles.feedbackLabel}>Feedback Adicional (Opcional)</label>
            <textarea
              className={styles.textarea}
              placeholder="Escreva aqui suas sugestões, críticas ou elogios..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitBtn} 
            disabled={loading || QUESTIONS.some(q => ratings[q.id] === undefined)}
          >
            {loading ? "Enviando..." : "Enviar Avaliação e Ganhar 4 Juris"}
          </button>
        </form>
      </div>
    </div>
  );
}
