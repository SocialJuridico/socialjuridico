import { Users } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Para Supervisores" };

const RESPONSABILIDADES = [
  "Confirmar ou recusar o convite recebido por e-mail quando um candidato indicar você como padrinho.",
  "Acompanhar a atuação do candidato dentro dos limites definidos pelo programa (sem prometer resultado, sem captação irregular).",
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
            Seja padrinho de um futuro advogado.
          </h1>
          <p className={styles.heroSubtitle}>
            Advogados com OAB ativa podem apoiar a formação de estudantes,
            confirmando o papel de supervisor quando forem indicados por um
            candidato.
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
            Ao aceitar ser padrinho de um candidato, você contribui
            diretamente com a formação de um futuro colega de profissão,
            ampliando sua rede e fortalecendo o ecossistema jurídico. O
            candidato só é ativado na plataforma após sua aprovação e a
            validação de documentos pela nossa equipe.
          </p>
        </div>
      </section>
    </main>
  );
}
