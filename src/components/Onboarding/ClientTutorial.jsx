"use client";
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  LayoutDashboard,
  PlusCircle,
  Bell,
  User,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Briefcase,
  MessageSquare,
  Globe,
} from "lucide-react";
import styles from "./ClientTutorial.module.css";

export default function ClientTutorial({
  activeTab,
  setActiveTab,
  onComplete,
}) {
  const [step, setStep] = useState(0); // 0: Boas-vindas, 1: Painel, 2: Novo Caso, 3: Notificações, 4: Meus Casos, 5: Conversas, 6: Links Úteis, 7: Perfil
  const [loading, setLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Sincroniza o passo do tutorial caso o usuário mude de aba manualmente no sidebar
  useEffect(() => {
    if (step === 0) return; // Não muda de aba se estiver no modal inicial de boas-vindas
    
    if (activeTab === "painel") {
      setStep(1);
    } else if (activeTab === "novo") {
      setStep(2);
    } else if (activeTab === "notificacoes") {
      setStep(3);
    } else if (activeTab === "meus-casos") {
      setStep(4);
    } else if (activeTab === "conversas") {
      setStep(5);
    } else if (activeTab === "links-uteis") {
      setStep(6);
    } else if (activeTab === "perfil") {
      setStep(7);
    }
  }, [activeTab]);

  // Função para finalizar o Onboarding no servidor e salvar localmente
  async function finishOnboarding(skipped = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        // Salva no localStorage para evitar exibir novamente nesta máquina
        localStorage.setItem("sj_client_tutorial_completed", "true");
        setIsDismissed(true);
        if (typeof onComplete === "function") {
          onComplete();
        }
      } else {
        console.error("Erro ao salvar onboarding no servidor:", json.message);
        // Mesmo com erro, permite fechar para não travar o usuário
        localStorage.setItem("sj_client_tutorial_completed", "true");
        setIsDismissed(true);
        if (typeof onComplete === "function") {
          onComplete();
        }
      }
    } catch (e) {
      console.error("Erro de conexão ao salvar onboarding:", e);
      localStorage.setItem("sj_client_tutorial_completed", "true");
      setIsDismissed(true);
      if (typeof onComplete === "function") {
        onComplete();
      }
    } finally {
      setLoading(false);
    }
  }

  // Avança para o próximo passo no tutorial contextual
  function handleNext() {
    if (step === 0) {
      setStep(1);
      setActiveTab("painel");
    } else if (step === 1) {
      setStep(2);
      setActiveTab("novo");
    } else if (step === 2) {
      setStep(3);
      setActiveTab("notificacoes");
    } else if (step === 3) {
      setStep(4);
      setActiveTab("meus-casos");
    } else if (step === 4) {
      setStep(5);
      setActiveTab("conversas");
    } else if (step === 5) {
      setStep(6);
      setActiveTab("links-uteis");
    } else if (step === 6) {
      setStep(7);
      setActiveTab("perfil");
    } else if (step === 7) {
      finishOnboarding(false);
    }
  }

  // Volta para o passo anterior
  function handleBack() {
    if (step === 1) {
      setStep(0);
    } else if (step === 2) {
      setStep(1);
      setActiveTab("painel");
    } else if (step === 3) {
      setStep(2);
      setActiveTab("novo");
    } else if (step === 4) {
      setStep(3);
      setActiveTab("notificacoes");
    } else if (step === 5) {
      setStep(4);
      setActiveTab("meus-casos");
    } else if (step === 6) {
      setStep(5);
      setActiveTab("conversas");
    } else if (step === 7) {
      setStep(6);
      setActiveTab("links-uteis");
    }
  }

  if (isDismissed) return null;

  // Passo 0: Modal de Boas-Vindas
  if (step === 0) {
    return (
      <div className={styles.overlay}>
        <div className={styles.welcomeModal}>
          <div className={styles.welcomeIcon}>
            <Sparkles size={32} />
          </div>
          <h2 className={styles.title}>Bem-vindo ao SocialJurídico!</h2>
          <p className={styles.desc}>
            Sua plataforma para gerenciar processos jurídicos de forma transparente, segura e conectada. Vamos fazer um tour rápido pelos recursos do seu painel?
          </p>

          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <LayoutDashboard size={18} />
              </span>
              <span className={styles.featureText}>
                Monitore propostas e advogados no Painel Geral
              </span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <PlusCircle size={18} />
              </span>
              <span className={styles.featureText}>
                Publique novos casos no mercado jurídico
              </span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <MessageSquare size={18} />
              </span>
              <span className={styles.featureText}>
                Converse no chat privado e consulte links úteis da OAB
              </span>
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => finishOnboarding(true)}
              disabled={loading}
            >
              Pular Tour
            </button>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleNext}
              disabled={loading}
            >
              Iniciar Tour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Passos 1 a 7: Banner/Card contextual no topo da aba ativa
  const tutorialDetailsByStep = {
    1: {
      title: "📊 Seu Painel Principal",
      desc: "Aqui no Painel, você tem uma visão geral dos seus casos. Quando um advogado manifestar interesse em seu caso, você poderá visualizar a proposta dele aqui, aceitar propostas e gerenciar os advogados ativos em cada processo.",
      indicator: "Passo 1 de 7",
      progress: 14,
      nextLabel: "Ir para Novo Caso",
    },
    2: {
      title: "📝 Como Cadastrar um Novo Caso",
      desc: "Precisa de ajuda jurídica? Clicando aqui, você digita um título curto, seleciona a área especializada (Consumidor, Família, Civil, etc.) e descreve seu problema nos fatos. Ao publicar, advogados cadastrados na plataforma poderão enviar propostas para te atender.",
      indicator: "Passo 2 de 7",
      progress: 28,
      nextLabel: "Ir para Notificações",
    },
    3: {
      title: "🔔 Central de Notificações",
      desc: "Fique por dentro de cada novidade. Aqui você recebe alertas de novas mensagens ou quando um advogado aceitar seu caso. E mais: você pode limpar sua central a qualquer momento clicando no ícone de lixeira (🗑️) no canto de cada cartão.",
      indicator: "Passo 3 de 7",
      progress: 42,
      nextLabel: "Ir para Meus Casos",
    },
    4: {
      title: "📂 Gerenciamento de Meus Casos",
      desc: "Esta aba é a sua pasta pessoal de processos. Aqui você visualiza detalhadamente todos os casos que já postou, confere o status de cada um (Aberto, Em Andamento, Concluído) e pode revisar as informações enviadas.",
      indicator: "Passo 4 de 7",
      progress: 57,
      nextLabel: "Ir para Minhas Conversas",
    },
    5: {
      title: "💬 Suas Mensagens e Negociações",
      desc: "O canal direto com os advogados. Aqui você conversa em tempo real sobre propostas, envia documentos e esclarece dúvidas. Cada chat é totalmente privado e seguro.",
      indicator: "Passo 5 de 7",
      progress: 71,
      nextLabel: "Ir para Links Úteis",
    },
    6: {
      title: "🔗 Links Úteis da Advocacia",
      desc: "Acesso rápido a portais essenciais, como consulta pública da OAB (ConfirmaAdv), Receita Federal, CNJ e tribunais. Tudo para facilitar suas consultas rápidas sem precisar sair da plataforma.",
      indicator: "Passo 6 de 7",
      progress: 85,
      nextLabel: "Ir para Meu Perfil",
    },
    7: {
      title: "👤 Mantenha seu Perfil Atualizado",
      desc: "No seu perfil, você pode atualizar suas informações cadastrais (nome, telefone de contato) e alterar sua senha. Dados atualizados são fundamentais para que o advogado contratado possa entrar em contato com facilidade.",
      indicator: "Passo 7 de 7",
      progress: 100,
      nextLabel: "Concluir Guia Didático",
    },
  };

  const currentStep = tutorialDetailsByStep[step];
  if (!currentStep) return null;

  return (
    <div className={styles.tutorialContainer}>
      <div className={styles.tutorialCard}>
        <div className={styles.cardHeader}>
          <span className={styles.stepIndicator}>{currentStep.indicator}</span>
          <button
            type="button"
            className={styles.skipTextBtn}
            onClick={() => finishOnboarding(true)}
          >
            Pular tour
          </button>
        </div>
        <h3 className={styles.cardTitle}>{currentStep.title}</h3>
        <p className={styles.cardDesc}>{currentStep.desc}</p>
        
        <div className={styles.cardFooter}>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBarFill}
              style={{ width: `${currentStep.progress}%` }}
            />
          </div>
          <div className={styles.cardActions}>
            <button
              type="button"
              className={`${styles.smBtn} ${styles.smBtnSecondary}`}
              onClick={handleBack}
            >
              Voltar
            </button>
            <button
              type="button"
              className={`${styles.smBtn} ${styles.smBtnPrimary}`}
              onClick={handleNext}
            >
              {currentStep.nextLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
