import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileCheck2,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";

import ParticlesBackground from "./components/ParticlesBackground";
import styles from "./components/marketing.module.css";
import homeStyles from "./Home.module.css";

const VALUE_PROPS = [
  {
    icon: GraduationCap,
    title: "Prática jurídica real",
    text: "Estudantes atuam em casos reais, sob supervisão de advogados padrinhos.",
  },
  {
    icon: ShieldCheck,
    title: "Supervisão e auditoria",
    text: "Toda atuação é acompanhada por um supervisor e pode ser auditada pela nossa equipe.",
    accent: true,
  },
  {
    icon: FileCheck2,
    title: "Validação em duas etapas",
    text: "Documentos analisados pelo admin e aprovação de pelo menos um supervisor antes da ativação.",
  },
];

const STEPS = [
  {
    title: "Cadastro em 5 etapas",
    text: "Dados básicos, formação acadêmica com comprovante, experiência e interesses, indicação de supervisores e aceite dos termos.",
  },
  {
    title: "Convite aos supervisores",
    text: "Os advogados indicados recebem um e-mail para confirmar o papel de padrinho.",
  },
  {
    title: "Validação do documento",
    text: "Nossa equipe confere o comprovante de matrícula ou de inscrição de estagiário.",
  },
  {
    title: "Acesso liberado",
    text: "Assim que houver aprovação do supervisor e validação do admin, o Oráculo fica ativo.",
  },
];

const STATS = [
  { number: "5", label: "Etapas no cadastro, do dado básico à ativação" },
  { number: "1–3", label: "Advogados supervisores indicados por candidato" },
  { number: "100%", label: "Documentos validados antes da liberação" },
  { number: "24/7", label: "Convites e status acompanhados por e-mail" },
];

export default function OraculoAcademicoHomePage() {
  return (
    <main className={styles.page}>
      <ParticlesBackground />

      <div className={homeStyles.homeContent}>
        <section className={homeStyles.homeHero}>
          <div className={homeStyles.heroGrid}>
            <div className={homeStyles.heroCopy}>
              <span className={styles.eyebrow}>
                <GraduationCap size={15} aria-hidden="true" />
                Oráculo Acadêmico
              </span>

              <h1 className={styles.heroTitle}>
                Prática jurídica supervisionada para estudantes de Direito.
              </h1>

              <p className={styles.heroSubtitle}>
                Um programa do ecossistema Social Jurídico que conecta
                estudantes e estagiários a advogados supervisores, com
                validação de documentos e auditoria de segurança em cada
                etapa.
              </p>

              <div className={styles.heroActions}>
                <Link
                  href="/oraculoacademico/cadastro"
                  className={styles.primaryBtn}
                >
                  Quero participar
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link
                  href="/oraculoacademico/como-funciona"
                  className={styles.secondaryBtn}
                >
                  Como funciona
                </Link>
              </div>
            </div>

            <div className={homeStyles.heroVisual}>
              <div className={homeStyles.heroVisualCard}>
                <span className={homeStyles.heroVisualEyebrow}>
                  <ShieldCheck size={14} aria-hidden="true" />
                  Status do cadastro
                </span>

                <div className={homeStyles.heroVisualRow}>
                  <span className={homeStyles.heroVisualRowLabel}>
                    <FileCheck2 size={16} aria-hidden="true" />
                    Documento enviado
                  </span>
                  <span className={homeStyles.heroVisualRowValue}>OK</span>
                </div>

                <div className={homeStyles.heroVisualRow}>
                  <span className={homeStyles.heroVisualRowLabel}>
                    <Users size={16} aria-hidden="true" />
                    Supervisor aprovou
                  </span>
                  <span className={homeStyles.heroVisualRowValue}>OK</span>
                </div>

                <div className={homeStyles.heroVisualRow}>
                  <span className={homeStyles.heroVisualRowLabel}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    Validação do admin
                  </span>
                  <span className={homeStyles.heroVisualRowValue}>OK</span>
                </div>

                <div className={homeStyles.heroVisualRow}>
                  <span className={homeStyles.heroVisualRowLabel}>
                    <GraduationCap size={16} aria-hidden="true" />
                    Status final
                  </span>
                  <span className={homeStyles.heroVisualRowValue}>Ativo</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={homeStyles.statsBar}>
          {STATS.map((stat) => (
            <div key={stat.label} className={homeStyles.statItem}>
              <span className={homeStyles.statNumber}>{stat.number}</span>
              <span className={homeStyles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Por que o Oráculo Acadêmico</h2>
            <p className={styles.sectionSubtitle}>
              Um caminho estruturado entre a formação acadêmica e a
              advocacia, com segurança para estudantes, supervisores e
              instituições.
            </p>
          </div>

          <div className={styles.grid}>
            {VALUE_PROPS.map((item) => (
              <div key={item.title} className={styles.card}>
                <div
                  className={`${styles.cardIcon} ${
                    item.accent ? styles.cardIconAccent : ""
                  }`}
                >
                  <item.icon size={20} aria-hidden="true" />
                </div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardText}>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Como funciona, em resumo</h2>
            <p className={styles.sectionSubtitle}>
              Do cadastro à ativação, cada etapa existe para garantir que a
              prática aconteça com responsabilidade.
            </p>
          </div>

          <div className={styles.steps}>
            {STEPS.map((step, index) => (
              <div key={step.title} className={styles.step}>
                <div className={styles.stepNumber}>{index + 1}</div>
                <div className={styles.stepBody}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Para cada participante</h2>
          </div>

          <div className={styles.grid}>
            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <GraduationCap size={20} aria-hidden="true" />
              </div>
              <h3 className={styles.cardTitle}>Estudantes de Direito</h3>
              <p className={styles.cardText}>
                Ganhe experiência prática supervisionada e construa seu
                histórico com um advogado padrinho.
              </p>
              <Link
                href="/oraculoacademico/estudantes"
                className={styles.secondaryBtn}
                style={{ marginTop: 16 }}
              >
                Ver para estudantes
              </Link>
            </div>

            <div className={styles.card}>
              <div className={`${styles.cardIcon} ${styles.cardIconAccent}`}>
                <Users size={20} aria-hidden="true" />
              </div>
              <h3 className={styles.cardTitle}>Advogados supervisores</h3>
              <p className={styles.cardText}>
                Seja padrinho de um estudante e acompanhe sua atuação com
                total transparência.
              </p>
              <Link
                href="/oraculoacademico/supervisores"
                className={styles.secondaryBtn}
                style={{ marginTop: 16 }}
              >
                Ver para supervisores
              </Link>
            </div>

            <div className={styles.card}>
              <div className={styles.cardIcon}>
                <BookOpen size={20} aria-hidden="true" />
              </div>
              <h3 className={styles.cardTitle}>Instituições de ensino</h3>
              <p className={styles.cardText}>
                Ofereça aos seus alunos um caminho estruturado de prática
                jurídica supervisionada.
              </p>
              <Link
                href="/oraculoacademico/instituicoes"
                className={styles.secondaryBtn}
                style={{ marginTop: 16 }}
              >
                Ver para instituições
              </Link>
            </div>
          </div>
        </section>

        <div className={styles.ctaBanner}>
          <h2>Pronto para começar sua prática supervisionada?</h2>
          <p>
            O cadastro leva poucos minutos e seu acesso é liberado assim que
            seus documentos e supervisor forem validados.
          </p>
          <Link href="/oraculoacademico/cadastro" className={styles.primaryBtn}>
            Iniciar cadastro
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  );
}
