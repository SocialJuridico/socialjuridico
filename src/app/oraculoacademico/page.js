import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  FileSearch,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";

import ParticlesBackground from "./components/ParticlesBackground";
import styles from "./components/marketing.module.css";
import homeStyles from "./Home.module.css";

const PILLARS = [
  { icon: FileSearch, label: "Casos reais" },
  { icon: BookOpen, label: "Biblioteca jurídica" },
  { icon: BadgeCheck, label: "Supervisão identificada" },
  { icon: ShieldCheck, label: "Auditoria integral" },
];

const VALUE_PROPS = [
  {
    icon: FileSearch,
    title: "Casos reais triados",
    text: "Demandas reais recebidas pelo Social Jurídico e classificadas para o ambiente Oráculo.",
  },
  {
    icon: BookOpen,
    title: "Biblioteca Jurídica",
    text: "Legislação e bases de conhecimento para consulta durante a análise das demandas.",
    accent: true,
  },
  {
    icon: BadgeCheck,
    title: "Supervisão identificada",
    text: "Cada estudante atua vinculado a advogado supervisor identificado por sua OAB.",
  },
  {
    icon: ShieldCheck,
    title: "Auditoria integral",
    text: "Atendimentos e interações do Oráculo são preservados integralmente para rastreabilidade e auditoria.",
    accent: true,
  },
];

const STEPS = [
  {
    title: "O Social Jurídico recebe a demanda",
    text: "Casos chegam pela plataforma principal do Social Jurídico, publicados por quem busca orientação jurídica.",
  },
  {
    title: "A triagem classifica o caso",
    text: "Uma triagem interna avalia complexidade e adequação de cada demanda ao ambiente de prática supervisionada.",
  },
  {
    title: "Casos adequados chegam ao Oráculo",
    text: "Demandas classificadas como adequadas ficam disponíveis para análise dos estudantes do programa.",
  },
  {
    title: "O estudante analisa e consulta a Biblioteca Jurídica",
    text: "O estudante estuda o caso e pode consultar legislação e bases de conhecimento durante a análise.",
  },
  {
    title: "O supervisor permanece vinculado à atuação",
    text: "Cada estudante atua vinculado a um advogado supervisor identificado por sua OAB durante todo o programa.",
  },
  {
    title: "Toda a atividade é preservada para auditoria",
    text: "Interações e atividades ficam registradas, garantindo rastreabilidade e possibilidade de auditoria.",
  },
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
                Prática jurídica real para estudantes de Direito, com
                supervisão e auditoria.
              </h1>

              <p className={styles.heroSubtitle}>
                Estudantes analisam demandas reais recebidas pelo Social
                Jurídico, consultam uma biblioteca jurídica de apoio e atuam
                vinculados a um advogado supervisor — com toda a atividade
                preservada para auditoria.
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
                  <FileSearch size={14} aria-hidden="true" />
                  Caso em análise
                </span>

                <span className={homeStyles.heroVisualArea}>
                  Direito do Consumidor
                </span>

                <h3 className={homeStyles.heroVisualCaseTitle}>
                  Cobrança bancária não reconhecida
                </h3>

                <div className={homeStyles.heroVisualBlock}>
                  <span className={homeStyles.heroVisualBlockLabel}>
                    Fontes consultadas
                  </span>
                  <ul className={homeStyles.heroVisualSourceList}>
                    <li>CDC — Art. 6º</li>
                    <li>CDC — Art. 14</li>
                  </ul>
                </div>

                <div className={homeStyles.heroVisualBlock}>
                  <span className={homeStyles.heroVisualBlockLabel}>
                    Supervisão
                  </span>
                  <div className={homeStyles.heroVisualPersonRow}>
                    <BadgeCheck size={18} aria-hidden="true" />
                    <div>
                      <strong>Dr. Carlos Silva</strong>
                      <span>OAB/RS XXXXX</span>
                    </div>
                  </div>
                </div>

                <div className={homeStyles.heroVisualBlock}>
                  <span className={homeStyles.heroVisualBlockLabel}>
                    Auditoria
                  </span>
                  <div className={homeStyles.heroVisualStatusRow}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    Registro ativo
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={homeStyles.pillarsBar}>
          {PILLARS.map((pillar) => (
            <div key={pillar.label} className={homeStyles.pillarItem}>
              <pillar.icon size={16} aria-hidden="true" />
              {pillar.label}
            </div>
          ))}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Por que o Oráculo Acadêmico</h2>
            <p className={styles.sectionSubtitle}>
              Um ambiente de prática jurídica real, com pesquisa, supervisão
              identificada e rastreabilidade em cada etapa.
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
              Da demanda recebida pelo Social Jurídico até o registro
              auditável da atividade do estudante.
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
                Analise demandas reais, consulte bases jurídicas e desenvolva
                experiência prática em ambiente supervisionado e auditável.
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
              <h3 className={styles.cardTitle}>Advogado Supervisor</h3>
              <p className={styles.cardText}>
                Supervisione estudantes de Direito com sua OAB vinculada ao
                participante e rastreabilidade das atividades realizadas.
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
                Integre seus alunos a um ambiente digital de prática jurídica
                com demandas reais, supervisão e evidências de atividade.
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
          <h2>Pronto para analisar demandas reais com supervisão?</h2>
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
