"use client";
import React, { useState } from "react";
import {
  CheckCircle2,
  FileText,
  MessageSquare,
  Scale,
  Shield,
  LayoutDashboard,
  PlusCircle,
  Bell,
  User,
  Briefcase,
  Star,
  Sparkles,
  X,
  Menu,
} from "lucide-react";
import styles from "./OnboardingModal.module.css";

export default function OnboardingModal({
  role = "CLIENT",
  initialCompleted = false,
  redirectHref,
  onComplete,
}) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(initialCompleted);
  const [dismissed, setDismissed] = useState(false);

  const stepsByRole = {
    LAWYER: [
      {
        title: "Perfil profissional",
        desc: "Confirme seu nome, OAB e telefone.",
        icon: Scale,
      },
      {
        title: "Configurar meios de pagamento",
        desc: "Verifique seu método de recebimento.",
        icon: Shield,
      },
      {
        title: "Preferências do painel",
        desc: "Ative notificações e preferências do redator IA.",
        icon: MessageSquare,
      },
    ],
    CLIENT: [
      {
        title: "Dados do cliente",
        desc: "Complete seu nome e telefone.",
        icon: Shield,
      },
      {
        title: "Enviar documentos",
        desc: "Adicione documentos essenciais ao caso.",
        icon: FileText,
      },
      {
        title: "Como funciona",
        desc: "Veja como acompanhar o andamento.",
        icon: MessageSquare,
      },
    ],
  };

  const steps = stepsByRole[role === "LAWYER" ? "LAWYER" : "CLIENT"];
  const isLawyer = role === "LAWYER";

  const navItems = isLawyer
    ? [
        { key: "painel", label: "Painel", icon: LayoutDashboard },
        { key: "casos", label: "Casos", icon: Briefcase },
        { key: "notificacoes", label: "Notificações", icon: Bell },
        { key: "perfil", label: "Meu Perfil", icon: User },
      ]
    : [
        { key: "painel", label: "Painel", icon: LayoutDashboard },
        { key: "novo", label: "Novo Caso", icon: PlusCircle },
        { key: "notificacoes", label: "Notificações", icon: Bell },
        { key: "perfil", label: "Meu Perfil", icon: User },
      ];

  const previewByRole = {
    LAWYER: [
      {
        navActive: "perfil",
        kicker: "Configuração inicial",
        headline: "Finalize perfil e identidade profissional",
        cards: [
          {
            label: "Status OAB",
            value: "Verificar",
            description: "Atualize o registro profissional",
            tone: "gold",
            icon: Scale,
          },
          {
            label: "Contato",
            value: "Completar",
            description: "Telefone e e-mail de atendimento",
            tone: "blue",
            icon: User,
          },
          {
            label: "Confiança",
            value: "Alta",
            description: "Perfil pronto e mais credibilidade",
            tone: "green",
            icon: Shield,
          },
        ],
        feed: [
          {
            title: "Perfil",
            text: "Adicione seus dados para aparecer melhor no painel.",
          },
          {
            title: "OAB",
            text: "Confirme informações para liberar recursos jurídicos.",
          },
          {
            title: "Credibilidade",
            text: "Perfil completo melhora resposta de clientes.",
          },
        ],
      },
      {
        navActive: "painel",
        kicker: "Financeiro ativo",
        headline: "Configure recebimentos e acelere conversões",
        cards: [
          {
            label: "Recebimento",
            value: "Ativar",
            description: "Configure formas de pagamento",
            tone: "gold",
            icon: Star,
          },
          {
            label: "Juris",
            value: "+20",
            description: "Créditos para uso no painel",
            tone: "blue",
            icon: Sparkles,
          },
          {
            label: "Assinaturas",
            value: "OK",
            description: "Fluxo de cobrança ativo",
            tone: "green",
            icon: Shield,
          },
        ],
        feed: [
          {
            title: "Pagamento",
            text: "Defina método padrão para receber sem fricção.",
          },
          {
            title: "Planos",
            text: "Escolha como escalar sua operação jurídica.",
          },
          {
            title: "Previsão",
            text: "Acompanhe entradas no painel financeiro.",
          },
        ],
      },
      {
        navActive: "notificacoes",
        kicker: "Produtividade e IA",
        headline: "Ative alertas e mantenha seu fluxo no ritmo",
        cards: [
          {
            label: "Notificações",
            value: "Ligadas",
            description: "Alertas em tempo real",
            tone: "gold",
            icon: Bell,
          },
          {
            label: "Redator IA",
            value: "Pronto",
            description: "Minutas e apoio automático",
            tone: "blue",
            icon: Sparkles,
          },
          {
            label: "Tempo médio",
            value: "-32%",
            description: "Fluxo mais rápido e estável",
            tone: "green",
            icon: CheckCircle2,
          },
        ],
        feed: [
          {
            title: "Alertas",
            text: "Receba atualizações de caso e respostas sem atraso.",
          },
          {
            title: "Automação",
            text: "Use IA para tarefas repetitivas e minutas.",
          },
          {
            title: "Foco",
            text: "Organize sua rotina com menos interrupções.",
          },
        ],
      },
    ],
    CLIENT: [
      {
        navActive: "perfil",
        kicker: "Primeiro acesso",
        headline: "Complete seus dados para iniciar com segurança",
        cards: [
          {
            label: "Cadastro",
            value: "Quase lá",
            description: "Finalize seus dados básicos",
            tone: "gold",
            icon: Shield,
          },
          {
            label: "Contato",
            value: "Completar",
            description: "Telefone para retorno rápido",
            tone: "blue",
            icon: User,
          },
          {
            label: "Acesso",
            value: "Seguro",
            description: "Ambiente protegido e confiável",
            tone: "green",
            icon: CheckCircle2,
          },
        ],
        feed: [
          {
            title: "Perfil",
            text: "Confirme nome e telefone para atendimento mais rápido.",
          },
          {
            title: "Privacidade",
            text: "Seus dados seguem as diretrizes de segurança da plataforma.",
          },
          {
            title: "Próximo passo",
            text: "Após isso você já pode abrir e acompanhar casos.",
          },
        ],
      },
      {
        navActive: "novo",
        kicker: "Novo caso",
        headline: "Envie documentos e detalhe o contexto jurídico",
        cards: [
          {
            label: "Casos",
            value: "3 abertos",
            description: "Acompanhe suas solicitações",
            tone: "gold",
            icon: Briefcase,
          },
          {
            label: "Documentos",
            value: "8 anexos",
            description: "Arquivos organizados por caso",
            tone: "blue",
            icon: FileText,
          },
          {
            label: "Checklist",
            value: "Em dia",
            description: "Pendências sob controle",
            tone: "green",
            icon: CheckCircle2,
          },
        ],
        feed: [
          {
            title: "Documento",
            text: "Anexe arquivos para acelerar a análise inicial.",
          },
          {
            title: "Descrição",
            text: "Explique o cenário com clareza para melhor orientação.",
          },
          {
            title: "Organização",
            text: "Mantenha tudo centralizado no seu caso.",
          },
        ],
      },
      {
        navActive: "painel",
        kicker: "Acompanhamento contínuo",
        headline: "Veja atualizações e converse sem sair do painel",
        cards: [
          {
            label: "Atualizações",
            value: "2 novas",
            description: "Novidades do seu caso",
            tone: "gold",
            icon: Bell,
          },
          {
            label: "Mensagens",
            value: "5",
            description: "Converse sem sair do painel",
            tone: "blue",
            icon: MessageSquare,
          },
          {
            label: "Status",
            value: "Ativo",
            description: "Acompanhamento em andamento",
            tone: "green",
            icon: CheckCircle2,
          },
        ],
        feed: [
          {
            title: "Atualização",
            text: "Seu caso recebeu retorno do advogado responsável.",
          },
          {
            title: "Mensagem",
            text: "Converse direto na plataforma com histórico completo.",
          },
          {
            title: "Transparência",
            text: "Acompanhe o andamento sem precisar buscar rota manual.",
          },
        ],
      },
    ],
  };

  const currentPreview =
    previewByRole[isLawyer ? "LAWYER" : "CLIENT"][step] ||
    previewByRole[isLawyer ? "LAWYER" : "CLIENT"][0];

  const premiumToolsByRole = {
    LAWYER: [
      {
        key: "pro",
        title: "Plano PRO",
        desc: "IA avançada, triagem prioritária e relatórios financeiros.",
        price: "R$ 10,99 / primeiro mês",
        icon: Star,
      },
      {
        key: "redator",
        title: "Redator IA Avançado",
        desc: "Gere minutas e peças com qualidade profissional.",
        price: "Inclusa no Plano Start e Pro",
        icon: Sparkles,
      },
      {
        key: "triagem",
        title: "Triagem Prioritária",
        desc: "Atenda clientes com prioridade e workflow otimizado.",
        price: "Inclusa no Plano Start e Pro",
        icon: Bell,
      },
    ],
    CLIENT: [
      {
        key: "priority",
        title: "Atendimento Prioritário",
        desc: "Respostas mais rápidas e suporte preferencial.",
        price: "Gratuito",
        icon: Bell,
      },
      {
        key: "assinatura",
        title: "Assinatura Digital",
        desc: "Assine e valide documentos com segurança.",
        price: "Gratuito para clientes com casos ativos",
        icon: Shield,
      },
      //   {
      //     key: "redator_client",
      //     title: "Redator IA (Caso)",
      //     desc: "Resumos e orientações automáticas sobre seu caso.",
      //     price: "R$ 19/mês",
      //     icon: FileText,
      //   },
    ],
  };

  const premiumTools = premiumToolsByRole[isLawyer ? "LAWYER" : "CLIENT"];

  async function finish() {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setCompleted(true);
        if (typeof onComplete === "function") {
          await onComplete();
        }
        if (redirectHref) {
          window.location.href = redirectHref;
        }
      } else {
        alert(json.message || "Erro ao marcar onboarding concluído");
      }
    } catch (e) {
      console.error(e);
      alert("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  if (completed || dismissed) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <button
          type="button"
          className={styles.closeBtn}
          aria-label="Fechar onboarding"
          onClick={() => setDismissed(true)}
        >
          <X size={18} />
        </button>

        <div className={styles.header}>
          <div className={styles.badge}>
            {isLawyer ? "Fluxo do Advogado" : "Fluxo do Cliente"}
          </div>
          <h2 className={styles.title}>
            {isLawyer
              ? "Comece com o painel do advogado"
              : "Comece com a jornada do cliente"}
          </h2>
          <p className={styles.subtitle}>{steps[step].desc}</p>
        </div>

        <div className={styles.layout}>
          <section className={styles.mainColumn}>
            <div className={styles.stepList}>
              {steps.map((s, i) => {
                const Icon = s.icon || CheckCircle2;
                return (
                  <button
                    key={s.title}
                    type="button"
                    className={`${styles.stepCard} ${i === step ? styles.activeStep : ""}`}
                    onClick={() => setStep(i)}
                  >
                    <span className={styles.stepIcon}>
                      <Icon size={16} />
                    </span>
                    <span className={styles.stepText}>
                      <strong>
                        {i + 1}. {s.title}
                      </strong>
                      <span>{s.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className={styles.previewColumn}>
            <div className={styles.previewHeader}>
              <span className={styles.previewEyebrow}>Demonstração visual</span>
              <strong>
                {isLawyer ? "Visão do advogado" : "Visão do cliente"}
              </strong>
            </div>

            <div className={styles.previewShell}>
              <div className={styles.previewTopBar}>
                <div className={styles.previewBrand}>
                  <span className={styles.brandMark} />
                  <span>SocialJurídico</span>
                </div>
                <div className={styles.previewUserPill}>
                  <span>{isLawyer ? "Advogado" : "Cliente"}</span>
                  <div className={styles.previewAvatar}>
                    {isLawyer ? "AJ" : "CL"}
                  </div>
                </div>
              </div>

              <div className={styles.previewWorkspace}>
                <aside className={styles.previewSidebar}>
                  <div className={styles.sidebarMenuButton}>
                    <Menu size={14} />
                  </div>
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={`${styles.previewNavItem} ${item.key === currentPreview.navActive ? styles.previewNavItemActive : ""}`}
                      >
                        <Icon size={14} />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </aside>

                <section className={styles.previewContent}>
                  <div className={styles.previewHero}>
                    <div>
                      <p className={styles.previewKicker}>
                        {currentPreview.kicker}
                      </p>
                      <h3>{currentPreview.headline}</h3>
                    </div>
                    <div className={styles.previewAccent}>
                      {step + 1}/{steps.length}
                    </div>
                  </div>

                  <div className={styles.demoCards}>
                    {currentPreview.cards.map((card) => {
                      const Icon = card.icon;
                      return (
                        <div
                          key={card.label}
                          className={`${styles.demoCard} ${styles[card.tone]}`}
                        >
                          <div className={styles.demoCardHeader}>
                            <Icon size={14} />
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color: "#eef3fb",
                                lineHeight: 1.15,
                              }}
                            >
                              {card.label}
                            </span>
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 11,
                              lineHeight: 1.35,
                              color: "#a8b3c7",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {card.description || card.value}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.premiumRow}>
                    {premiumTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <div key={tool.key} className={styles.premiumCard}>
                          <div className={styles.premiumCardHeader}>
                            <span className={styles.premiumIcon}>
                              <Icon size={16} />
                            </span>
                            <div className={styles.premiumMeta}>
                              <strong className={styles.premiumTitle}>
                                {tool.title}
                              </strong>
                              <span className={styles.premiumDesc}>
                                {tool.desc}
                              </span>
                            </div>
                          </div>

                          <div className={styles.premiumCardFooter}>
                            <div className={styles.premiumPrice}>
                              {tool.price}
                            </div>
                            <button
                              type="button"
                              className={styles.primaryBtn}
                              onClick={() => {
                                try {
                                  // armazenar preferência mínima para o checkout
                                  window.localStorage.setItem(
                                    "sj_selected_plan_type",
                                    tool.key === "pro" ? "PRO" : "ADDON",
                                  );
                                  window.localStorage.setItem(
                                    "sj_selected_billing",
                                    "MENSAL",
                                  );
                                } catch (e) {
                                  /* ignore */
                                }
                                // redirecionar para página de assinatura/checkout
                                window.location.href = "/assinatura";
                              }}
                            >
                              {tool.key === "pro" ? "Assinar PRO" : "Conhecer"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className={styles.previewFeed}>
                    {currentPreview.feed.map((item, index) => (
                      <div key={item.title} className={styles.feedItem}>
                        <span className={styles.feedIndex}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </aside>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerActions}>
            <button
              className={styles.secondaryBtn}
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Voltar
            </button>
            {step < steps.length - 1 ? (
              <button
                className={styles.primaryBtn}
                onClick={() =>
                  setStep((s) => Math.min(steps.length - 1, s + 1))
                }
              >
                Próximo
              </button>
            ) : (
              <button
                className={styles.primaryBtn}
                onClick={finish}
                disabled={loading}
              >
                {loading ? "Salvando..." : "Concluir onboarding"}
              </button>
            )}
          </div>
          <div className={styles.progress}>
            {step + 1} / {steps.length}
          </div>
        </div>
      </div>
    </div>
  );
}
