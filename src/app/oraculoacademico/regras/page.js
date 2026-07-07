import { ClipboardList } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Regras do Programa" };

const REGRAS = [
  "Não possuir OAB ativa como advogado.",
  "A atuação do Oráculo não substitui a atuação de um advogado.",
  "É proibido prometer resultado, captar cliente irregularmente ou se apresentar como advogado.",
  "A atuação se limita a informações gerais, apoio inicial e organização do relato do caso.",
  "Casos que exijam contratação, urgência, prazo ou prática de ato jurídico devem ser encaminhados a um advogado habilitado.",
  "As interações podem ser auditadas pelo Social Jurídico para fins de segurança, qualidade e compliance.",
  "É necessário ter pelo menos um Advogado Supervisor aprovando o convite para o acesso ser ativado.",
];

export default function RegrasPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <ClipboardList size={15} aria-hidden="true" />
            Regras do Programa
          </span>
          <h1 className={styles.heroTitle}>
            Os limites e compromissos de quem participa do Oráculo Acadêmico.
          </h1>
          <p className={styles.heroSubtitle}>
            Estas são as mesmas declarações que todo candidato aceita na
            última etapa do cadastro.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.steps}>
          {REGRAS.map((regra, index) => (
            <div key={regra} className={styles.step}>
              <div className={styles.stepNumber}>{index + 1}</div>
              <div className={styles.stepBody}>
                <p>{regra}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
