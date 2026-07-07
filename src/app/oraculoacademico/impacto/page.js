import { TrendingUp } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Impacto Acadêmico" };

const IMPACT_POINTS = [
  {
    title: "Experiência prática desde a graduação",
    text: "Estudantes constroem histórico de atuação supervisionada antes mesmo de concluir o curso ou prestar o Exame da OAB.",
  },
  {
    title: "Ponte entre academia e advocacia",
    text: "Estagiários encontram um caminho estruturado para transição até a atuação plena como advogado.",
  },
  {
    title: "Rede de supervisores engajados",
    text: "Advogados que atuam como padrinhos ampliam sua rede e contribuem diretamente com a formação de novos profissionais.",
  },
];

export default function ImpactoPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <TrendingUp size={15} aria-hidden="true" />
            Impacto Acadêmico
          </span>
          <h1 className={styles.heroTitle}>
            Formando profissionais mais preparados para a advocacia.
          </h1>
          <p className={styles.heroSubtitle}>
            O Oráculo Acadêmico existe para reduzir a distância entre a
            formação em Direito e a prática profissional responsável.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.grid}>
          {IMPACT_POINTS.map((item) => (
            <div key={item.title} className={styles.card}>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardText}>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.prose}>
          <h2>Um programa em construção</h2>
          <p>
            O Oráculo Acadêmico está em fase de validação (MVP). Conforme o
            programa amadurece, passaremos a publicar aqui métricas de
            participação, aprovação e impacto na formação dos estudantes
            envolvidos.
          </p>
        </div>
      </section>
    </main>
  );
}
