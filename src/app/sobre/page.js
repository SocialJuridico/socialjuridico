import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Code2,
  HeartHandshake,
  Lightbulb,
  LockKeyhole,
  MessagesSquare,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import styles from "./Sobre.module.css";

export const metadata = {
  title: "Sobre o Social Jurídico",
  description:
    "Conheça a origem do Social Jurídico, uma plataforma criada a partir da experiência de uma comunidade ativa que aproxima pessoas e advogados.",
  alternates: {
    canonical: "/sobre",
  },
  openGraph: {
    title: "Sobre o Social Jurídico",
    description:
      "Da comunidade à plataforma: conheça a história e o propósito do Social Jurídico.",
    url: "/sobre",
    type: "website",
  },
};

const values = [
  {
    title: "Transparência",
    description:
      "Comunicamos de forma clara o papel da plataforma, os limites dos recursos e a responsabilidade de cada participante.",
    icon: BadgeCheck,
  },
  {
    title: "Responsabilidade",
    description:
      "Desenvolvemos tecnologia para um ambiente jurídico que exige cuidado, segurança e respeito às pessoas.",
    icon: ShieldCheck,
  },
  {
    title: "Tecnologia com propósito",
    description:
      "Cada funcionalidade deve resolver um problema real de clientes, advogados ou escritórios.",
    icon: Lightbulb,
  },
  {
    title: "Liberdade de escolha",
    description:
      "Clientes escolhem com quem conversar e advogados avaliam livremente as oportunidades disponíveis.",
    icon: HeartHandshake,
  },
  {
    title: "Proteção de dados",
    description:
      "Privacidade e segurança fazem parte da arquitetura, das políticas e da evolução contínua da plataforma.",
    icon: LockKeyhole,
  },
  {
    title: "Evolução contínua",
    description:
      "O produto evolui a partir das necessidades observadas na comunidade e da experiência de seus usuários.",
    icon: Sparkles,
  },
];

const timeline = [
  {
    label: "A comunidade",
    title: "Uma experiência construída ao longo de mais de sete anos",
    description:
      "O grupo Preciso de um Advogado reuniu milhares de pessoas em busca de informações e contato com profissionais do Direito.",
    icon: Network,
  },
  {
    label: "O problema",
    title: "Necessidades reais ficaram evidentes",
    description:
      "Clientes precisavam de um caminho mais organizado para apresentar suas demandas. Advogados precisavam de ferramentas para atender, acompanhar e gerenciar oportunidades.",
    icon: MessagesSquare,
  },
  {
    label: "A plataforma",
    title: "A experiência da comunidade ganhou estrutura tecnológica",
    description:
      "O Social Jurídico foi desenvolvido para reunir publicação de casos, comunicação, oportunidades e ferramentas profissionais em um único ambiente.",
    icon: Code2,
  },
  {
    label: "A evolução",
    title: "Um ecossistema em construção contínua",
    description:
      "A plataforma continua evoluindo com novos recursos para clientes, advogados, escritórios e futuras áreas profissionais.",
    icon: Sparkles,
  },
];

export default function SobrePage() {
  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        aria-labelledby="about-hero-title"
      >
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroContent}>
          <h1 id="about-hero-title" className={styles.title}>
            Da comunidade à plataforma:
            <span className={styles.highlight}>
              {" "}
              uma nova forma de aproximar pessoas e advogados.
            </span>
          </h1>

          <p className={styles.subtitle}>
            O Social Jurídico nasceu da experiência de uma comunidade
            ativa e evoluiu para uma plataforma criada para organizar
            conexões, oportunidades, atendimentos e ferramentas jurídicas.
          </p>

          <div className={styles.heroActions}>
            <Link
              prefetch={false}
              href="/cadastro"
              className={styles.primaryAction}
            >
              Publicar meu caso
              <ArrowRight size={19} aria-hidden="true" />
            </Link>

            <Link
              prefetch={false}
              href="/sou-advogado"
              className={styles.secondaryAction}
            >
              Conhecer a plataforma para advogados
            </Link>
          </div>

          <div className={styles.heroTrust}>
            <span>
              <UsersRound size={16} aria-hidden="true" />
              Comunidade com mais de 16 mil membros
            </span>

            <span className={styles.trustDivider} aria-hidden="true" />

            <span>
              <Scale size={16} aria-hidden="true" />
              Mais de sete anos de história
            </span>
          </div>
        </div>
      </section>

      <section
        className={styles.originSection}
        aria-labelledby="origin-title"
      >
        <div className={styles.originGrid}>
          <div className={styles.communityVisual}>
            <div className={styles.imageFrame}>
              <Image
                src="/community/preciso-de-um-advogado.webp"
                alt="Comunidade Preciso de um Advogado, origem do Social Jurídico"
                fill
                sizes="(max-width: 900px) 100vw, 50vw"
                className={styles.communityImage}
                priority
              />
            </div>

            <div className={styles.communityStats}>
              <div>
                <strong>7+</strong>
                <span>anos de comunidade</span>
              </div>

              <div>
                <strong>16 mil+</strong>
                <span>membros no grupo</span>
              </div>
            </div>
          </div>

          <div className={styles.originContent}>
            <span className={styles.eyebrow}>Nossa origem</span>

            <h2 id="origin-title">
              O Social Jurídico surgiu de uma comunidade real
            </h2>

            <p>
              Antes de existir como plataforma, o projeto já existia como
              uma comunidade ativa no Facebook: o grupo{" "}
              <strong>Preciso de um Advogado</strong>.
            </p>

            <p>
              Durante mais de sete anos, a comunidade aproximou pessoas
              que precisavam compreender seus direitos e profissionais
              interessados em orientar e atender novas demandas.
            </p>

            <p>
              A convivência diária com essas histórias revelou problemas
              que não seriam resolvidos apenas com mais um grupo, mais uma
              rede social ou mais uma ferramenta isolada.
            </p>

            <p>
              Era necessário criar um ambiente próprio, organizado e
              preparado para atender tanto quem procura apoio jurídico
              quanto quem trabalha diariamente com o Direito.
            </p>
          </div>
        </div>
      </section>

      <section
        className={styles.timelineSection}
        aria-labelledby="timeline-title"
      >
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Nossa trajetória</span>

          <h2 id="timeline-title">
            Uma plataforma construída a partir de necessidades reais
          </h2>

          <p>
            A evolução do Social Jurídico acompanha os desafios observados
            na comunidade e na rotina dos profissionais.
          </p>
        </header>

        <div className={styles.timeline}>
          {timeline.map((item, index) => {
            const Icon = item.icon;

            return (
              <article className={styles.timelineItem} key={item.title}>
                <div className={styles.timelineMarker}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>

                <div className={styles.timelineCard}>
                  <div className={styles.timelineIcon} aria-hidden="true">
                    <Icon size={23} strokeWidth={1.8} />
                  </div>

                  <span className={styles.timelineLabel}>
                    {item.label}
                  </span>

                  <h3>{item.title}</h3>

                  <p>{item.description}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className={styles.purposeSection}
        aria-labelledby="purpose-title"
      >
        <div className={styles.purposeContent}>
          <div className={styles.purposeHeading}>
            <span className={styles.eyebrow}>Nosso propósito</span>

            <h2 id="purpose-title">
              Reduzir barreiras no primeiro contato com o universo
              jurídico
            </h2>
          </div>

          <div className={styles.purposeText}>
            <p>
              Para quem precisa de um advogado, o Social Jurídico oferece
              um caminho para apresentar a situação, receber manifestações
              de interesse e conversar com profissionais cadastrados.
            </p>

            <p>
              Para advogados, a plataforma reúne oportunidades, CRM,
              documentos, agenda, comunicação e ferramentas digitais em
              um único ambiente.
            </p>

            <p>
              A tecnologia não substitui a atuação jurídica. Ela organiza
              o caminho para que pessoas e profissionais possam se
              encontrar, conversar e decidir como avançar.
            </p>
          </div>
        </div>

        <div className={styles.audienceGrid}>
          <article className={styles.audienceCard}>
            <div className={styles.audienceIcon} aria-hidden="true">
              <UsersRound size={25} strokeWidth={1.8} />
            </div>

            <h3>Para pessoas que precisam de apoio jurídico</h3>

            <p>
              Um ambiente para relatar situações, receber interesse de
              profissionais e iniciar conversas com liberdade de escolha.
            </p>

            <Link href="/cadastro">
              Publicar um caso
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </article>

          <article className={styles.audienceCard}>
            <div className={styles.audienceIcon} aria-hidden="true">
              <BriefcaseBusiness size={25} strokeWidth={1.8} />
            </div>

            <h3>Para advogados e escritórios</h3>

            <p>
              Oportunidades, atendimento, organização de clientes,
              documentos, prazos e ferramentas profissionais.
            </p>

            <Link href="/sou-advogado">
              Conhecer os recursos
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </article>
        </div>
      </section>

      <section
        className={styles.numbersSection}
        aria-labelledby="numbers-title"
      >
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Uma história em crescimento</span>

          <h2 id="numbers-title">
            Da comunidade digital a um ecossistema jurídico
          </h2>
        </header>

        <div className={styles.numbersGrid}>
          <article className={styles.numberItem}>
            <strong>7+</strong>
            <span>Anos de experiência da comunidade</span>
          </article>

          <article className={styles.numberItem}>
            <strong>16 mil+</strong>
            <span>Membros no grupo Preciso de um Advogado</span>
          </article>

          <article className={styles.numberItem}>
            <strong>330+</strong>
            <span>Advogados cadastrados na plataforma</span>
          </article>

          <article className={styles.numberItem}>
            <strong>Diariamente</strong>
            <span>Novos casos e oportunidades são organizados</span>
          </article>
        </div>

        <p className={styles.numbersNotice}>
          Os números representam dados aproximados e podem crescer conforme
          novos usuários e profissionais ingressam na plataforma.
        </p>
      </section>

      <section
        className={styles.valuesSection}
        aria-labelledby="values-title"
      >
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Princípios</span>

          <h2 id="values-title">
            Valores que orientam o desenvolvimento da plataforma
          </h2>

          <p>
            Decisões de produto, comunicação e tecnologia devem respeitar
            os mesmos princípios.
          </p>
        </header>

        <div className={styles.valuesGrid}>
          {values.map((value) => {
            const Icon = value.icon;

            return (
              <article className={styles.valueCard} key={value.title}>
                <div className={styles.valueIcon} aria-hidden="true">
                  <Icon size={23} strokeWidth={1.8} />
                </div>

                <h3>{value.title}</h3>

                <p>{value.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className={styles.roleSection}
        aria-labelledby="role-title"
      >
        <div className={styles.roleContent}>
          <div className={styles.roleIcon} aria-hidden="true">
            <Scale size={29} strokeWidth={1.8} />
          </div>

          <div>
            <span className={styles.eyebrow}>O papel da plataforma</span>

            <h2 id="role-title">
              Tecnologia para facilitar conexões, não para substituir o
              advogado
            </h2>

            <p>
              O Social Jurídico não é escritório de advocacia e não presta
              consultoria, assessoria ou representação jurídica.
            </p>

            <p>
              A plataforma fornece tecnologia para publicação de casos,
              comunicação, organização e acesso a ferramentas. A orientação
              profissional, a contratação e a prestação do serviço jurídico
              são realizadas diretamente pelo advogado escolhido.
            </p>
          </div>
        </div>

        <div className={styles.roleChecks}>
          <span>
            <CheckCircle2 size={17} aria-hidden="true" />
            O cliente mantém liberdade de escolha
          </span>

          <span>
            <CheckCircle2 size={17} aria-hidden="true" />
            O advogado decide quais oportunidades avaliar
          </span>

          <span>
            <CheckCircle2 size={17} aria-hidden="true" />
            Honorários são definidos entre as partes
          </span>

          <span>
            <CheckCircle2 size={17} aria-hidden="true" />
            A plataforma não garante contratação ou resultado
          </span>
        </div>
      </section>

      <section
        className={styles.ctaSection}
        aria-labelledby="about-cta-title"
      >
        <div className={styles.ctaGlow} aria-hidden="true" />

        <div className={styles.ctaContent}>
          <h2 id="about-cta-title">
            Faça parte da próxima etapa dessa história
          </h2>

          <p>
            Publique seu caso gratuitamente ou conheça a plataforma criada
            para apoiar a rotina de advogados e escritórios.
          </p>

          <div className={styles.ctaActions}>
            <Link
              prefetch={false}
              href="/cadastro"
              className={styles.primaryAction}
            >
              Publicar meu caso
              <ArrowRight size={19} aria-hidden="true" />
            </Link>

            <Link
              prefetch={false}
              href="/sou-advogado"
              className={styles.secondaryAction}
            >
              Sou advogado
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}