import { Lock } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Política de Privacidade" };

export default function PrivacidadePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <Lock size={15} aria-hidden="true" />
            Política de Privacidade
          </span>
          <h1 className={styles.heroTitle}>
            Política de Privacidade do Oráculo Acadêmico
          </h1>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.prose}>
          <h2>1. Dados coletados</h2>
          <p>
            Coletamos os dados fornecidos no cadastro (nome, e-mail,
            WhatsApp, CPF, cidade, estado, dados acadêmicos), o documento
            comprobatório enviado, e os dados de contato dos supervisores
            indicados (nome, e-mail, número e UF da OAB).
          </p>

          <h2>2. Uso dos dados</h2>
          <p>
            Os dados são usados para viabilizar o cadastro, validar
            documentos, enviar convites de supervisor, notificar decisões
            (aprovação, rejeição ou suspensão) e permitir o acesso à conta.
          </p>

          <h2>3. Armazenamento de documentos</h2>
          <p>
            O documento enviado no cadastro é armazenado em um bucket de
            armazenamento privado, acessível apenas pela equipe
            administrativa por meio de links temporários.
          </p>

          <h2>4. Compartilhamento com supervisores</h2>
          <p>
            O nome do candidato e a relação indicada são compartilhados com o
            supervisor convidado, para que ele possa decidir sobre o
            convite.
          </p>

          <h2>5. Direitos do titular</h2>
          <p>
            Você pode solicitar acesso, correção ou exclusão dos seus dados a
            qualquer momento, entrando em contato com nossa equipe pelo
            e-mail socialjuridico3@gmail.com.
          </p>
        </div>
      </section>
    </main>
  );
}
