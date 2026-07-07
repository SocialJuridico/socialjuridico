import { HandHeart, Mail } from "lucide-react";

import styles from "../../components/marketing.module.css";

export const metadata = { title: "Seja uma Instituição Parceira" };

export default function InstituicaoParceriaPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <HandHeart size={15} aria-hidden="true" />
            Seja uma Instituição Parceira
          </span>
          <h1 className={styles.heroTitle}>
            Leve o Oráculo Acadêmico para seus alunos de Direito.
          </h1>
          <p className={styles.heroSubtitle}>
            Faculdades e cursos de Direito podem se tornar parceiros do
            programa, divulgando o cadastro aos seus alunos e acompanhando o
            impacto na formação prática deles.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.prose}>
          <h2>Como funciona a parceria</h2>
          <p>
            Não há custo para a instituição. A parceria consiste em divulgar
            o programa aos alunos elegíveis e, quando aplicável, indicar
            professores que possam atuar como supervisores.
          </p>

          <h2>Como iniciar contato</h2>
          <p>
            Entre em contato com a nossa equipe informando o nome da
            instituição, o curso de Direito responsável e um contato para
            conversarmos sobre a parceria.
          </p>
        </div>

        <div className={styles.ctaBanner}>
          <h2>Fale com a nossa equipe</h2>
          <p>Vamos conversar sobre como estruturar a parceria com o curso de Direito da sua instituição.</p>
          <a
            href="mailto:socialjuridico3@gmail.com?subject=Parceria%20institucional%20-%20Or%C3%A1culo%20Acad%C3%AAmico"
            className={styles.primaryBtn}
          >
            <Mail size={17} aria-hidden="true" />
            Falar com a equipe
          </a>
        </div>
      </section>
    </main>
  );
}
