import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  Gavel,
  MessageCircleMore,
  Radar,
  UserRoundSearch,
  Users,
  Video,
} from "lucide-react";

import styles from "./HowItWorks.module.css";

const clientSteps = [
  {
    icon: FileText,
    title: "Conte o que aconteceu",
    description:
      "Relate seu problema por texto, áudio ou vídeo, da forma que for mais confortável para você.",
  },
  {
    icon: UserRoundSearch,
    title: "Publique gratuitamente",
    description:
      "Seu caso fica disponível para que advogados cadastrados possam visualizar e demonstrar interesse.",
  },
  {
    icon: Video,
    title: "Escolha e converse",
    description:
      "Analise os contatos recebidos e converse por mensagens, áudio ou videochamada dentro da plataforma.",
  },
];

const lawyerSteps = [
  {
    icon: BriefcaseBusiness,
    title: "Crie seu perfil profissional",
    description:
      "Cadastre suas informações profissionais e áreas de atuação para apresentar seu trabalho na plataforma.",
  },
  {
    icon: Radar,
    title: "Acesse oportunidades",
    description:
      "Visualize casos publicados por clientes e oportunidades disponíveis no Radar Jurídico.",
  },
  {
    icon: MessageCircleMore,
    title: "Atenda e organize",
    description:
      "Converse com clientes e centralize contatos, documentos, histórico e atendimentos em um único ambiente.",
  },
];

function JourneyColumn({
  type,
  title,
  icon: HeaderIcon,
  steps,
  href,
  linkLabel,
}) {
  const isLawyer = type === "lawyer";

  return (
    <article
      className={`${styles.column} ${
        isLawyer ? styles.lawyerColumn : styles.clientColumn
      }`}
    >
      <header className={styles.columnHeader}>
        <div
          className={`${styles.columnIcon} ${
            isLawyer ? styles.lawyerIcon : styles.clientIcon
          }`}
          aria-hidden="true"
        >
          <HeaderIcon size={24} strokeWidth={1.8} />
        </div>

        <div>
          <span className={styles.columnEyebrow}>
            {isLawyer ? "Para profissionais" : "Para quem precisa de ajuda"}
          </span>

          <h3 className={styles.columnTitle}>{title}</h3>
        </div>
      </header>

      <ol className={styles.stepsList}>
        {steps.map((step, index) => {
          const StepIcon = step.icon;

          return (
            <li key={step.title} className={styles.stepItem}>
              <div
                className={`${styles.stepMarker} ${
                  isLawyer
                    ? styles.stepMarkerLawyer
                    : styles.stepMarkerClient
                }`}
                aria-hidden="true"
              >
                <span className={styles.stepNumber}>{index + 1}</span>
              </div>

              <div className={styles.stepContent}>
                <div className={styles.stepTitleRow}>
                  <StepIcon
                    size={18}
                    strokeWidth={1.8}
                    className={styles.stepIcon}
                    aria-hidden="true"
                  />

                  <h4 className={styles.stepTitle}>{step.title}</h4>
                </div>

                <p className={styles.stepDescription}>
                  {step.description}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <Link
        prefetch={false}
        href={href}
        className={`${styles.actionLink} ${
          isLawyer
            ? styles.lawyerAction
            : styles.clientAction
        }`}
      >
        {linkLabel}
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </article>
  );
}

export default function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className={styles.section}
      aria-labelledby="how-it-works-title"
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 id="how-it-works-title" className={styles.title}>
            Como funciona
            <span className={styles.titleHighlight}> na prática?</span>
          </h2>

          <p className={styles.subtitle}>
            Entenda como clientes publicam seus casos e como advogados
            encontram oportunidades e organizam seus atendimentos.
          </p>
        </header>

        <div className={styles.grid}>
          <JourneyColumn
            type="client"
            title="Para clientes"
            icon={Users}
            steps={clientSteps}
            href="/cadastro"
            linkLabel="Publicar meu caso gratuitamente"
          />

          <JourneyColumn
            type="lawyer"
            title="Para advogados"
            icon={Gavel}
            steps={lawyerSteps}
            href="/sou-advogado"
            linkLabel="Conhecer a plataforma para advogados"
          />
        </div>
      </div>
    </section>
  );
}