import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Para Instituições de Ensino" };

export default function InstituicoesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <BookOpen size={15} aria-hidden="true" />
            Para Instituições de Ensino
          </span>
          <h1 className={styles.heroTitle}>
            Ofereça aos seus alunos um caminho estruturado de prática
            jurídica.
          </h1>
          <p className={styles.heroSubtitle}>
            Integre seus alunos a um ambiente digital de prática jurídica com
            demandas reais, supervisão e evidências de atividade — sem custo
            para a instituição.
          </p>
          <div className={styles.heroActions}>
            <Link href="/oraculoacademico/instituicoes/parceria" className={styles.primaryBtn}>
              Seja uma instituição parceira
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Como sua instituição se beneficia</h2>
        </div>

        <div className={styles.grid}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Complemento ao NPJ</h3>
            <p className={styles.cardText}>
              Alunos que já participam do Núcleo de Prática Jurídica podem
              usar essa experiência como parte do cadastro no programa.
            </p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Rede de supervisores</h3>
            <p className={styles.cardText}>
              Conectamos alunos a advogados dispostos a atuar como
              supervisores, ampliando as oportunidades de prática.
            </p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Segurança institucional</h3>
            <p className={styles.cardText}>
              Documentos validados e atuação auditada reduzem o risco
              reputacional para a instituição e para o aluno.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
