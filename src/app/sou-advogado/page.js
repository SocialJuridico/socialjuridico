import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  FileSignature,
  FileText,
  FolderKanban,
  MessagesSquare,
  Radar,
  ShieldCheck,
  Sparkles,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import Button from "@/components/Button";
import styles from "./page.module.css";

export const metadata = {
  title: "Plataforma para Advogados",
  description:
    "Acesse casos publicados, acompanhe oportunidades no Radar Jurídico e organize clientes, documentos e atendimentos no Social Jurídico.",
  alternates: {
    canonical: "/sou-advogado",
  },
};

export default function SouAdvogadoPage() {
  return (
    <div className={styles.container}>
      {/* HERO SECTION */}
      <section className={styles.hero} aria-labelledby="lawyer-hero-title">
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroContent}>
          <h1 id="lawyer-hero-title" className={styles.title}>
            Mais oportunidades e mais organização
            <span className={styles.highlight}> para sua advocacia.</span>
          </h1>

          <p className={styles.subtitle}>
            Encontre casos publicados, acompanhe oportunidades no Radar Jurídico
            e gerencie clientes, documentos e atendimentos em um único ambiente.
          </p>

          <div className={styles.ctaWrapper}>
            <Link
              prefetch={false}
              href="/cadastro?perfil=advogado"
              className={styles.primaryAction}
            >
              Criar meu perfil profissional
              <ArrowRight size={19} aria-hidden="true" />
            </Link>

            <Link
              prefetch={false}
              href="#planos"
              className={styles.secondaryAction}
            >
              Conhecer os planos
            </Link>
          </div>

          <div className={styles.heroTrust}>
            <span className={styles.trustItem}>
              <BadgeCheck size={16} aria-hidden="true" />
              Cadastro profissional
            </span>

            <span className={styles.trustDivider} aria-hidden="true" />

            <span className={styles.trustItem}>
              <ShieldCheck size={16} aria-hidden="true" />
              Ambiente organizado e seguro
            </span>
          </div>

          <div
            className={styles.heroHighlights}
            aria-label="Principais recursos para advogados"
          >
            <article className={styles.highlightItem}>
              <div className={styles.highlightIcon} aria-hidden="true">
                <BriefcaseBusiness size={21} strokeWidth={1.8} />
              </div>

              <div>
                <strong>Casos publicados</strong>
                <span>Acompanhe demandas de clientes na plataforma.</span>
              </div>
            </article>

            <article className={styles.highlightItem}>
              <div className={styles.highlightIcon} aria-hidden="true">
                <Radar size={21} strokeWidth={1.8} />
              </div>

              <div>
                <strong>Radar Jurídico</strong>
                <span>Consulte oportunidades organizadas diariamente.</span>
              </div>
            </article>

            <article className={styles.highlightItem}>
              <div className={styles.highlightIcon} aria-hidden="true">
                <BarChart3 size={21} strokeWidth={1.8} />
              </div>

              <div>
                <strong>Gestão integrada</strong>
                <span>Centralize clientes, documentos e atendimentos.</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA (MINI TUTORIAL) */}
      <section
        id="como-funciona"
        className={styles.section}
        aria-labelledby="lawyer-how-title"
      >
        <div className={styles.sectionHeader}>
          <h2 id="lawyer-how-title" className={styles.sectionTitle}>
            Como funciona para
            <span className={styles.sectionHighlight}> advogados</span>
          </h2>

          <p className={styles.sectionSubtitle}>
            Crie seu perfil, encontre oportunidades alinhadas à sua atuação e
            organize o relacionamento com seus clientes em um único ambiente.
          </p>
        </div>

        <div className={styles.stepsGrid}>
          <article className={styles.stepCard}>
            <div className={styles.stepTop}>
              <span className={styles.stepNumber}>01</span>

              <div className={styles.stepIcon} aria-hidden="true">
                <BriefcaseBusiness size={23} strokeWidth={1.8} />
              </div>
            </div>

            <h3>Crie seu perfil profissional</h3>

            <p>
              Informe seus dados profissionais, número de inscrição na OAB,
              áreas de atuação e informações relevantes sobre sua experiência.
            </p>
          </article>

          <article className={styles.stepCard}>
            <div className={styles.stepTop}>
              <span className={styles.stepNumber}>02</span>

              <div className={styles.stepIcon} aria-hidden="true">
                <Radar size={23} strokeWidth={1.8} />
              </div>
            </div>

            <h3>Encontre oportunidades</h3>

            <p>
              Consulte casos publicados por clientes e acompanhe novas
              oportunidades organizadas no Radar Jurídico.
            </p>
          </article>

          <article className={styles.stepCard}>
            <div className={styles.stepTop}>
              <span className={styles.stepNumber}>03</span>

              <div className={styles.stepIcon} aria-hidden="true">
                <MessagesSquare size={23} strokeWidth={1.8} />
              </div>
            </div>

            <h3>Converse e organize</h3>

            <p>
              Manifeste interesse, converse com o cliente e centralize
              mensagens, documentos, tarefas e histórico de atendimento.
            </p>
          </article>
        </div>

        <div className={styles.stepsNotice}>
          <ShieldCheck size={19} aria-hidden="true" />

          <p>
            A manifestação de interesse não garante contratação. A relação
            profissional e os honorários são definidos diretamente entre
            advogado e cliente.
          </p>
        </div>
      </section>

      {/* BENEFÍCIOS (RECURSOS PREMIUM) */}
      <section
        id="recursos"
        className={`${styles.section} ${styles.bgAlternate}`}
        aria-labelledby="lawyer-tools-title"
      >
        <div className={styles.sectionHeader}>
          <h2 id="lawyer-tools-title" className={styles.sectionTitle}>
            Tudo o que você precisa para
            <span className={styles.sectionHighlight}>
              {" "}
              atender e organizar sua advocacia
            </span>
          </h2>

          <p className={styles.sectionSubtitle}>
            O Social Jurídico reúne oportunidades, relacionamento com clientes,
            documentos e ferramentas profissionais em um único ambiente.
          </p>
        </div>

        <div className={styles.toolsGrid}>
          <article className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              <BriefcaseBusiness size={24} strokeWidth={1.8} />
            </div>

            <h3>Casos publicados</h3>

            <p>
              Visualize demandas publicadas por clientes e manifeste interesse
              nas oportunidades relacionadas à sua atuação.
            </p>
          </article>

          <article className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              <Radar size={24} strokeWidth={1.8} />
            </div>

            <h3>Radar Jurídico</h3>

            <p>
              Acompanhe oportunidades jurídicas organizadas diariamente e
              consulte as informações disponíveis conforme seu plano.
            </p>
          </article>

          <article className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              <FolderKanban size={24} strokeWidth={1.8} />
            </div>

            <h3>CRM Jurídico</h3>

            <p>
              Organize contatos, etapas de atendimento, histórico, documentos e
              informações importantes de cada cliente.
            </p>
          </article>

          <article className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              <CalendarDays size={24} strokeWidth={1.8} />
            </div>

            <h3>Agenda e prazos</h3>

            <p>
              Registre compromissos, tarefas e prazos para manter sua rotina
              profissional centralizada.
            </p>
          </article>

          <article className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              <FileSignature size={24} strokeWidth={1.8} />
            </div>

            <h3>Assinatura digital</h3>

            <p>
              Envie documentos para assinatura e acompanhe o processo dentro da
              própria plataforma.
            </p>
          </article>

          <article className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              <ShieldCheck size={24} strokeWidth={1.8} />
            </div>

            <h3>Notificação Extrajudicial Blindada</h3>

            <p>
              Crie notificações com recursos de rastreabilidade digital e
              registros relacionados ao envio e ao acesso.
            </p>
          </article>

          <article className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              <WandSparkles size={24} strokeWidth={1.8} />
            </div>

            <h3>Inteligência Artificial Jurídica</h3>

            <p>
              Utilize ferramentas de apoio para estruturar textos, documentos,
              análises e atividades da rotina profissional.
            </p>
          </article>

          <article className={styles.toolCard}>
            <div className={styles.toolIcon} aria-hidden="true">
              <MessagesSquare size={24} strokeWidth={1.8} />
            </div>

            <h3>Atendimento centralizado</h3>

            <p>
              Converse com clientes por mensagens, áudios, arquivos e
              videochamadas, mantendo o histórico organizado.
            </p>
          </article>
        </div>

        <div className={styles.toolsSummary}>
          <UsersRound size={20} aria-hidden="true" />

          <p>
            Os recursos disponíveis, limites de uso e acesso às oportunidades
            variam conforme o plano contratado.
          </p>
        </div>
      </section>

      {/* PLANOS */}
      <section
        id="planos"
        className={styles.section}
        aria-labelledby="lawyer-plans-title"
      >
        <div className={styles.sectionHeader}>
          <h2 id="lawyer-plans-title" className={styles.sectionTitle}>
            Escolha o plano que acompanha
            <span className={styles.sectionHighlight}>
              {" "}
              o momento da sua advocacia
            </span>
          </h2>

          <p className={styles.sectionSubtitle}>
            Tenha acesso a oportunidades e ferramentas profissionais em uma
            única assinatura, com condições pensadas para diferentes rotinas de
            atuação.
          </p>
        </div>

        <div className={styles.plansGrid}>
          <article className={styles.planCard}>
            <header className={styles.planHeader}>
              <div>
                <span className={styles.planCategory}>Para começar</span>
                <h3>Plano Start</h3>
              </div>

              <p className={styles.planDescription}>
                Para advogados que desejam acessar oportunidades e organizar os
                primeiros atendimentos dentro da plataforma.
              </p>
            </header>

            <div className={styles.priceBlock}>
              <span className={styles.priceCurrency}>R$</span>
              <strong className={styles.priceValue}>40,99</strong>
              <span className={styles.pricePeriod}>/mês</span>
            </div>

            <p className={styles.promotionalPrice}>
              Primeiro mês por <strong>R$ 10,99</strong>
            </p>

            <ul className={styles.planFeatures}>
              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Acesso aos casos disponíveis para o plano
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Oportunidades do Radar Jurídico
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                CRM para organização de clientes
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Agenda, tarefas e controle de prazos
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Chat e histórico de atendimento
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Ferramentas profissionais com limites do plano
              </li>
            </ul>

            <Link
              prefetch={false}
              href="/cadastro?perfil=advogado&plano=start"
              className={`${styles.planAction} ${styles.startAction}`}
            >
              Começar com o Start
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </article>

          <article className={`${styles.planCard} ${styles.planCardFeatured}`}>
            <div className={styles.featuredBadge}>Plano mais completo</div>

            <header className={styles.planHeader}>
              <div>
                <span className={styles.planCategory}>Mais recursos</span>
                <h3>Plano Pro</h3>
              </div>

              <p className={styles.planDescription}>
                Para profissionais que desejam ampliar o acesso às oportunidades
                e utilizar recursos avançados de gestão e produtividade.
              </p>
            </header>

            <div className={styles.priceBlock}>
              <span className={styles.priceCurrency}>R$</span>
              <strong className={styles.priceValue}>87,90</strong>
              <span className={styles.pricePeriod}>/mês</span>
            </div>

            <p className={styles.promotionalPrice}>
              Primeiro mês por <strong>R$ 10,99</strong>
            </p>

            <ul className={styles.planFeatures}>
              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Mais acesso aos casos e oportunidades disponíveis
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Radar Jurídico conforme os limites do plano
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                CRM Jurídico completo
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Inteligência Artificial Jurídica
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Assinatura e gestão de documentos
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Notificação Extrajudicial Blindada
              </li>

              <li>
                <CheckCircle2 size={17} aria-hidden="true" />
                Agenda, prazos e atendimento centralizado
              </li>
            </ul>

            <Link
              prefetch={false}
              href="/cadastro?perfil=advogado&plano=pro"
              className={`${styles.planAction} ${styles.proAction}`}
            >
              Começar com o Pro
              <Sparkles size={17} aria-hidden="true" />
            </Link>
          </article>
        </div>

        <div className={styles.plansNotice}>
          <ShieldCheck size={19} aria-hidden="true" />

          <p>
            Os limites, condições promocionais e recursos incluídos podem variar
            conforme as regras comerciais vigentes. Consulte os detalhes antes
            da contratação.
          </p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section
        className={styles.ctaFooter}
        aria-labelledby="lawyer-final-cta-title"
      >
        <div className={styles.ctaFooterGlow} aria-hidden="true" />

        <div className={styles.ctaFooterContent}>
          <h2 id="lawyer-final-cta-title">
            Centralize oportunidades, clientes e ferramentas
            <span className={styles.ctaHighlight}>
              {" "}
              em uma única plataforma
            </span>
          </h2>

          <p>
            Crie seu perfil profissional, conheça os planos disponíveis e
            descubra como o Social Jurídico pode apoiar sua rotina de
            atendimento e organização.
          </p>

          <div className={styles.ctaFooterActions}>
            <Link
              prefetch={false}
              href="/cadastro?perfil=advogado"
              className={styles.ctaFooterPrimary}
            >
              Criar meu perfil profissional
              <ArrowRight size={19} aria-hidden="true" />
            </Link>

            <Link
              prefetch={false}
              href="#planos"
              className={styles.ctaFooterSecondary}
            >
              Comparar planos
            </Link>
          </div>

          <div className={styles.ctaFooterTrust}>
            <span>
              <BadgeCheck size={16} aria-hidden="true" />
              Cadastro profissional
            </span>

            <span className={styles.ctaTrustDivider} aria-hidden="true" />

            <span>
              <ShieldCheck size={16} aria-hidden="true" />
              Você escolhe o plano antes de contratar
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
