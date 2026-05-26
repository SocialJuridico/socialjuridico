"use client";
import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Globe,
  Check,
  MessageSquare,
  Users,
  FileText,
  Search,
  User,
  Lock,
  ArrowRight,
  Shield,
  Zap,
  Gift,
  HelpCircle,
  Calculator,
  Calendar,
  BookOpen,
  PenTool,
  Award,
} from "lucide-react";
import styles from "./LawyerTutorial.module.css";

export default function LawyerTutorial({
  activeTab,
  setActiveTab,
  onComplete,
  profileData,
  setShowProModal,
}) {
  const [step, setStep] = useState(0); 
  // 0: Boas-vindas
  // 1: OS PLANOS & OS JURIS (Uso do Plano na lateral)
  // 2: Indique e Ganhe
  // 3: Oportunidades
  // 4: Minhas Mensagens
  // 5: Quero um Site
  // 6: Meus Casos
  // 7: Declarei Interesse
  // 8: Anúncios de Serviços
  // 9: Assinatura Digital
  // 10: CRM de Clientes
  // 11: IA Smart Docs
  // 12: Blindagem de Documentos
  // 13: Redator IA
  // 14: Agenda & Prazos
  // 15: Triagem IA
  // 16: Calculadora
  // 17: Jurisprudência
  // 18: Cartão Digital
  // 19: Meu Perfil

  const [loading, setLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Sync tutorial steps bidirectionally when the user clicks a tab manually on the sidebar
  useEffect(() => {
    if (step === 0 || step === 1) return; // Don't redirect tab in welcome or sidebar screens

    if (activeTab === "indicacoes") {
      setStep(2);
    } else if (activeTab === "oportunidades") {
      setStep(3);
    } else if (activeTab === "minhas-mensagens") {
      setStep(4);
    } else if (activeTab === "quero-site") {
      setStep(5);
    } else if (activeTab === "meus-casos") {
      setStep(6);
    } else if (activeTab === "declarei-interesse") {
      setStep(7);
    } else if (activeTab === "anuncios-PREPOSTOS" || activeTab === "anuncios-DILIGENCIAS" || activeTab === "anuncios-OUTROS") {
      setStep(8);
    } else if (activeTab === "assinatura") {
      setStep(9);
    } else if (activeTab === "crm") {
      setStep(10);
    } else if (activeTab === "docs") {
      setStep(11);
    } else if (activeTab === "blindagem") {
      setStep(12);
    } else if (activeTab === "redator") {
      setStep(13);
    } else if (activeTab === "agenda") {
      setStep(14);
    } else if (activeTab === "triagem") {
      setStep(15);
    } else if (activeTab === "calculadora") {
      setStep(16);
    } else if (activeTab === "juris") {
      setStep(17);
    } else if (activeTab === "cartao-visitas") {
      setStep(18);
    } else if (activeTab === "perfil") {
      setStep(19);
    }
  }, [activeTab]);

  // Mark onboarding complete on server and in localStorage
  async function finishOnboarding(skipped = false) {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        localStorage.setItem("sj_lawyer_tutorial_completed", "true");
        setIsDismissed(true);
        if (typeof onComplete === "function") {
          onComplete();
        }
      } else {
        console.error("Erro ao salvar onboarding no servidor:", json.message);
        localStorage.setItem("sj_lawyer_tutorial_completed", "true");
        setIsDismissed(true);
        if (typeof onComplete === "function") {
          onComplete();
        }
      }
    } catch (e) {
      console.error("Erro de conexão ao salvar onboarding:", e);
      localStorage.setItem("sj_lawyer_tutorial_completed", "true");
      setIsDismissed(true);
      if (typeof onComplete === "function") {
        onComplete();
      }
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (step === 0) {
      setStep(1);
    } else if (step === 1) {
      setStep(2);
      setActiveTab("indicacoes");
    } else if (step === 2) {
      setStep(3);
      setActiveTab("oportunidades");
    } else if (step === 3) {
      setStep(4);
      setActiveTab("minhas-mensagens");
    } else if (step === 4) {
      setStep(5);
      setActiveTab("quero-site");
    } else if (step === 5) {
      setStep(6);
      setActiveTab("meus-casos");
    } else if (step === 6) {
      setStep(7);
      setActiveTab("declarei-interesse");
    } else if (step === 7) {
      setStep(8);
      setActiveTab("anuncios-PREPOSTOS");
    } else if (step === 8) {
      setStep(9);
      setActiveTab("assinatura");
    } else if (step === 9) {
      setStep(10);
      setActiveTab("crm");
    } else if (step === 10) {
      setStep(11);
      setActiveTab("docs");
    } else if (step === 11) {
      setStep(12);
      setActiveTab("blindagem");
    } else if (step === 12) {
      setStep(13);
      setActiveTab("redator");
    } else if (step === 13) {
      setStep(14);
      setActiveTab("agenda");
    } else if (step === 14) {
      setStep(15);
      setActiveTab("triagem");
    } else if (step === 15) {
      setStep(16);
      setActiveTab("calculadora");
    } else if (step === 16) {
      setStep(17);
      setActiveTab("juris");
    } else if (step === 17) {
      setStep(18);
      setActiveTab("cartao-visitas");
    } else if (step === 18) {
      setStep(19);
      setActiveTab("perfil");
    } else if (step === 19) {
      finishOnboarding(false);
    }
  }

  function handleBack() {
    if (step === 1) {
      setStep(0);
    } else if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
      setActiveTab("indicacoes");
    } else if (step === 4) {
      setStep(3);
      setActiveTab("oportunidades");
    } else if (step === 5) {
      setStep(4);
      setActiveTab("minhas-mensagens");
    } else if (step === 6) {
      setStep(5);
      setActiveTab("quero-site");
    } else if (step === 7) {
      setStep(6);
      setActiveTab("meus-casos");
    } else if (step === 8) {
      setStep(7);
      setActiveTab("declarei-interesse");
    } else if (step === 9) {
      setStep(8);
      setActiveTab("anuncios-PREPOSTOS");
    } else if (step === 10) {
      setStep(9);
      setActiveTab("assinatura");
    } else if (step === 11) {
      setStep(10);
      setActiveTab("crm");
    } else if (step === 12) {
      setStep(11);
      setActiveTab("docs");
    } else if (step === 13) {
      setStep(12);
      setActiveTab("blindagem");
    } else if (step === 14) {
      setStep(13);
      setActiveTab("redator");
    } else if (step === 15) {
      setStep(14);
      setActiveTab("agenda");
    } else if (step === 16) {
      setStep(15);
      setActiveTab("triagem");
    } else if (step === 17) {
      setStep(16);
      setActiveTab("calculadora");
    } else if (step === 18) {
      setStep(17);
      setActiveTab("juris");
    } else if (step === 19) {
      setStep(18);
      setActiveTab("cartao-visitas");
    }
  }

  if (isDismissed) return null;

  // Welcome Step (Step 0)
  if (step === 0) {
    return (
      <div className={styles.overlay}>
        <div className={styles.welcomeModal}>
          <div className={styles.welcomeIcon}>
            <Sparkles size={34} />
          </div>
          <h2 className={styles.title}>Painel do Advogado: Tour Completo</h2>
          <p className={styles.desc}>
            Seja bem-vindo ao seu ambiente de trabalho digital. Preparamos este guia didático detalhado para lhe apresentar cada uma das seções do menu, ferramentas de Inteligência Artificial e o gerenciamento dos seus consumos e planos.
          </p>

          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <Globe size={18} />
              </span>
              <span className={styles.featureText}>
                <strong>Navegação Guiada:</strong> Explicaremos todas as seções e abas laterais passo a passo.
              </span>
            </div>
            <div className={styles.featureItem}>
              <span className={styles.featureIcon}>
                <Lock size={18} />
              </span>
              <span className={styles.featureText}>
                <strong>Ferramentas Premium:</strong> Entenda o funcionamento e utilidade dos recursos inteligentes, mesmo em planos Free.
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
              Pular Guia
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

  // Active steps details
  const stepInfo = {
    1: {
      title: "💳 OS PLANOS & OS JURIS (Uso do Plano)",
      desc: "Localizado no topo da barra lateral, este painel exibe o seu tipo de plano ativo (FREE, START ou PRO) e as suas barras de consumo (Redator IA, Clientes CRM, Triagem, Agenda e Armazenamento). O 'Juris' é a moeda de consumo para solicitações de Inteligência Artificial e blindagens na blockchain. Monitore-os e faça upgrade ou recargas avulsas clicando em 'Seja Premium'.",
      nextLabel: "Avançar: Indique e Ganhe",
      indicator: "Passo 1 de 19",
      progress: 5,
      isPremium: false,
    },
    2: {
      title: "🎁 Indique e Ganhe",
      desc: "Aqui você encontra o seu link exclusivo de indicação. Compartilhe o SocialJurídico com seus colegas de profissão: a cada cadastro que assinar um plano pago através do seu link, você acumula créditos (Juris) e recompensas exclusivas.",
      nextLabel: "Avançar: Oportunidades",
      indicator: "Passo 2 de 19",
      progress: 10,
      isPremium: false,
    },
    3: {
      title: "🔍 Oportunidades (Mercado de Casos)",
      desc: "Neste marketplace, clientes publicam relatos reais sobre suas dúvidas e litígios. Você pode aplicar filtros por Estado ou Especialidade jurídica para prospectar de forma ativa e ética. Manifeste interesse para se conectar ao cliente.",
      nextLabel: "Avançar: Minhas Mensagens",
      indicator: "Passo 3 de 19",
      progress: 15,
      isPremium: false,
    },
    4: {
      title: "💬 Minhas Mensagens (Chat Seguro)",
      desc: "Centralize todas as negociações e atendimentos em andamento. Quando o cliente aceita sua manifestação de interesse, um chat criptografado e privativo é aberto aqui para vocês conversarem e trocarem arquivos com segurança.",
      nextLabel: "Avançar: Quero um Site",
      indicator: "Passo 4 de 19",
      progress: 21,
      isPremium: false,
    },
    5: {
      title: "🌐 Quero um Site (Presença Digital)",
      desc: "Destaque seu escritório na internet. Clicando aqui, você pode solicitar a criação de um site profissional otimizado para o Google (SEO), desenvolvido especificamente para advogados aumentarem sua autoridade digital e captação de clientes.",
      nextLabel: "Avançar: Meus Casos",
      indicator: "Passo 5 de 19",
      progress: 26,
      isPremium: false,
    },
    6: {
      title: "💼 Meus Casos",
      desc: "Sua pasta digital de processos e atendimentos ativos. Acompanhe a lista de casos que você assumiu na plataforma e gerencie o histórico de andamentos e propostas vinculadas.",
      nextLabel: "Avançar: Declarei Interesse",
      indicator: "Passo 6 de 19",
      progress: 31,
      isPremium: false,
    },
    7: {
      title: "✅ Declarei Interesse",
      desc: "Monitore o status de todas as manifestações de interesse que você enviou. Acompanhe se os clientes já visualizaram seu perfil, se as propostas estão abertas ou se foram aceitas.",
      nextLabel: "Avançar: Anúncios de Serviços",
      indicator: "Passo 7 de 19",
      progress: 36,
      isPremium: false,
    },
    8: {
      title: "📣 Anúncios de Serviços",
      desc: "Encontre ou publique serviços de apoio profissional. O menu divide-se em subcategorias: PREPOSTOS (parcerias para audiências), DILIGÊNCIAS (cargas, cópias e protocolos) e OUTROS serviços de correspondência jurídica.",
      nextLabel: "Avançar: Assinatura Digital",
      indicator: "Passo 8 de 19",
      progress: 42,
      isPremium: false,
    },
    9: {
      title: "🖊️ Assinatura Digital",
      desc: "Assine procurações, contratos de honorários e acordos de forma totalmente eletrônica. O sistema gera chaves de assinatura criptografadas com validade jurídica nacional ICP-Brasil. [Recurso Premium]",
      nextLabel: "Avançar: CRM de Clientes",
      indicator: "Passo 9 de 19",
      progress: 47,
      isPremium: true,
    },
    10: {
      title: "📊 Meus Clientes (CRM)",
      desc: "Gerencie sua carteira de clientes profissionalmente. Organize o funil de atendimento por etapas (Intake, Contrato, Ação, Execução), anote notas internas e controle os honorários a receber. [Recurso Premium]",
      nextLabel: "Avançar: IA Smart Docs",
      indicator: "Passo 10 de 19",
      progress: 52,
      isPremium: true,
    },
    11: {
      title: "📂 IA Smart Docs",
      desc: "Armazene os documentos de seus clientes e pastas de processos na nuvem de forma organizada, contando com a leitura inteligente da nossa IA para extração e indexação rápida de dados chaves. [Recurso Premium]",
      nextLabel: "Avançar: Blindagem de Documentos",
      indicator: "Passo 11 de 19",
      progress: 57,
      isPremium: true,
    },
    12: {
      title: "🛡️ Blindagem de Documentos",
      desc: "Garanta integridade jurídica inabalável para suas provas digitais (prints, áudios, PDFs). Registramos o hash do arquivo na blockchain pública para certificar autoria e data/hora temporal sem expor dados confidenciais. [Recurso Premium]",
      nextLabel: "Avançar: Redator IA",
      indicator: "Passo 12 de 19",
      progress: 63,
      isPremium: true,
    },
    13: {
      title: "✍️ Redator IA (Copilot Jurídico)",
      desc: "Nossa IA avançada ajuda você a redigir peças em minutos. Selecione a petição ou contrato, informe os fatos básicos do cliente, e a IA gera uma minuta jurídica estruturada e fundamentada pronta para revisão. [Recurso Premium]",
      nextLabel: "Avançar: Agenda e Prazos",
      indicator: "Passo 13 de 19",
      progress: 68,
      isPremium: true,
    },
    14: {
      title: "📅 Agenda & Prazos",
      desc: "Mantenha seus prazos processuais sob controle absoluto. Agende prazos fatais, audiências ou reuniões vinculadas diretamente a clientes e processos, com lembretes automáticos integrados. [Recurso Premium]",
      nextLabel: "Avançar: Triagem IA",
      indicator: "Passo 14 de 19",
      progress: 73,
      isPremium: true,
    },
    15: {
      title: "📋 Triagem IA & Diagnóstico",
      desc: "Ao atender um novo cliente, cole o relato confuso dele aqui. O sistema classifica a área jurídica correta, gera a estimativa inicial do valor de causa, avalia a viabilidade da ação e lista todos os documentos essenciais exigidos pelo tribunal. [Recurso Premium]",
      nextLabel: "Avançar: Calculadora",
      indicator: "Passo 15 de 19",
      progress: 78,
      isPremium: true,
    },
    16: {
      title: "🧮 Calculadora Jurídica",
      desc: "Realize cálculos complexos de forma simples e precisa: rescisórias trabalhistas (com aviso prévio, comissões, saldo), férias, horas extras judiciais, correções monetárias de débitos pelos índices atualizados e juros moratórios. [Recurso Premium]",
      nextLabel: "Avançar: Jurisprudência",
      indicator: "Passo 16 de 19",
      progress: 84,
      isPremium: true,
    },
    17: {
      title: "📖 Pesquisa de Jurisprudência",
      desc: "Buscas inteligentes e instantâneas em repositórios de julgados e súmulas de tribunais estaduais e superiores, trazendo resumos simplificados e conexões por IA para embasar sua peça jurídica. [Recurso Premium]",
      nextLabel: "Avançar: Cartão Digital",
      indicator: "Passo 17 de 19",
      progress: 89,
      isPremium: true,
    },
    18: {
      title: "🎴 Cartão Digital",
      desc: "Gere seu cartão de visitas digital profissional do SocialJurídico, completo com QR Code, dados de contato e especialidades, pronto para compartilhar via WhatsApp com novos potenciais clientes.",
      nextLabel: "Avançar: Meu Perfil",
      indicator: "Passo 18 de 19",
      progress: 94,
      isPremium: false,
    },
    19: {
      title: "👤 Meu Perfil & Assinaturas",
      desc: "Aqui você atualiza sua biografia profissional, valida sua OAB para obter o selo verificado, gerencia suas formas de pagamento e assinaturas de planos e, se precisar, pode reiniciar este guia didático a qualquer momento.",
      nextLabel: "Concluir Guia Didático",
      indicator: "Passo 19 de 19",
      progress: 100,
      isPremium: false,
    },
  };

  const currentStep = stepInfo[step];
  if (!currentStep) return null;

  return (
    <div className={styles.tutorialContainer}>
      <div className={styles.tutorialCard}>
        <div className={styles.cardHeader}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span className={styles.stepIndicator}>{currentStep.indicator}</span>
            {currentStep.isPremium && (
              <span className={styles.premiumBadge}>Premium</span>
            )}
          </div>
          <button
            type="button"
            className={styles.skipTextBtn}
            onClick={() => finishOnboarding(true)}
          >
            Pular Guia
          </button>
        </div>
        <h3 className={styles.cardTitle}>
          {currentStep.title}
        </h3>
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
