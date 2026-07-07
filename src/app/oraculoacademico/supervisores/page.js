import { Users } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Para Supervisores" };

const RESPONSABILIDADES = [
  "Confirmar ou recusar o convite recebido por e-mail quando um candidato indicar você como supervisor.",
  "Permanecer vinculado ao candidato com sua OAB, dentro dos limites definidos pelo programa (sem prometer resultado, sem captação irregular).",
  "Estar disponível para orientar o candidato e, se necessário, ser consultado pela equipe do Social Jurídico.",
];

export default function SupervisoresPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <Users size={15} aria-hidden="true" />
            Para Supervisores
          </span>
          <h1 className={styles.heroTitle}>
            Seja o Advogado Supervisor de um futuro colega de profissão.
          </h1>
          <p className={styles.heroSubtitle}>
            Supervisione estudantes de Direito com sua OAB vinculada ao
            participante e rastreabilidade das atividades realizadas.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Como funciona o convite</h2>
          <p className={styles.sectionSubtitle}>
            Você recebe um e-mail quando um candidato te indica como
            supervisor. Não é necessário ter conta na plataforma — basta
            clicar no link do convite para aceitar ou recusar.
          </p>
        </div>

        <div className={styles.grid}>
          {RESPONSABILIDADES.map((text) => (
            <div key={text} className={styles.card}>
              <p className={styles.cardText}>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.prose}>
          <h2>Por que aceitar</h2>
          <p>
            Ao aceitar vincular sua OAB a um candidato como Advogado
            Supervisor, você contribui diretamente com a formação de um
            futuro colega de profissão, ampliando sua rede e fortalecendo o
            ecossistema jurídico. O candidato só é ativado na plataforma
            após sua aprovação e a validação de documentos pela nossa
            equipe.
          </p>
        </div>
      </section>
    </main>
  );
}
