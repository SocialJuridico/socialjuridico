import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Para Estudantes" };

const REQUISITOS = [
  "Estar cursando Direito a partir do 8º período, ou ser estagiário inscrito na OAB.",
  "Ter um comprovante válido: matrícula atualizada ou inscrição de estagiário.",
  "Indicar de 1 a 3 advogados que aceitem ser seus supervisores (padrinhos).",
];

const BENEFICIOS = [
  "Experiência prática real, sempre sob supervisão de um advogado.",
  "Histórico de atuação supervisionada para levar à sua carreira.",
  "Acompanhamento e auditoria que garantem segurança para você e para o cliente.",
];

export default function EstudantesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <GraduationCap size={15} aria-hidden="true" />
            Para Estudantes
          </span>
          <h1 className={styles.heroTitle}>
            Comece sua prática jurídica com a supervisão certa.
          </h1>
          <p className={styles.heroSubtitle}>
            Se você é estudante ou estagiário de Direito, o Oráculo
            Acadêmico é o caminho para atuar em casos reais com o respaldo de
            um advogado supervisor.
          </p>
          <div className={styles.heroActions}>
            <Link href="/oraculoacademico/cadastro" className={styles.primaryBtn}>
              Fazer meu cadastro
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Requisitos para participar</h2>
        </div>
        <div className={styles.grid}>
          {REQUISITOS.map((text) => (
            <div key={text} className={styles.card}>
              <p className={styles.cardText}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>O que você ganha</h2>
        </div>
        <div className={styles.grid}>
          {BENEFICIOS.map((text) => (
            <div key={text} className={styles.card}>
              <p className={styles.cardText}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.ctaBanner}>
        <h2>Pronto para começar?</h2>
        <p>
          O cadastro tem 5 etapas e leva poucos minutos para ser concluído.
        </p>
        <Link href="/oraculoacademico/cadastro" className={styles.primaryBtn}>
          Iniciar cadastro
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
