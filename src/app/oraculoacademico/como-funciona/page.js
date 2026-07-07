import Link from "next/link";
import { ArrowRight, Workflow } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Como Funciona" };

const STEPS = [
  {
    title: "1. Cadastro em 5 etapas",
    text: "O candidato preenche dados básicos, perfil jurídico/acadêmico com comprovante (matrícula ou inscrição de estagiário), áreas de interesse e experiência, indica de 1 a 3 supervisores e aceita os termos do programa.",
  },
  {
    title: "2. Convite aos supervisores",
    text: "Cada advogado indicado recebe um e-mail de convite para atuar como Advogado Supervisor. Ele pode aceitar ou recusar; o cadastro segue pendente até que ao menos um confirme.",
  },
  {
    title: "3. Validação de documentos",
    text: "A equipe do Social Jurídico analisa o comprovante enviado e pode aprovar, rejeitar (com motivo) ou suspender o cadastro a qualquer momento.",
  },
  {
    title: "4. Confirmação de conta",
    text: "Ao final das 5 etapas, o candidato recebe um e-mail com o status do cadastro e um botão para confirmar a conta.",
  },
  {
    title: "5. Ativação",
    text: "Quando o documento estiver validado e pelo menos um supervisor tiver aprovado o convite, o acesso do Oráculo é liberado automaticamente.",
  },
];

export default function ComoFuncionaPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <Workflow size={15} aria-hidden="true" />
            Como Funciona
          </span>
          <h1 className={styles.heroTitle}>
            Do cadastro à prática supervisionada, passo a passo.
          </h1>
          <p className={styles.heroSubtitle}>
            O programa foi desenhado para garantir segurança jurídica e
            acadêmica em cada etapa, sem abrir mão da agilidade para quem
            quer começar a praticar.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.steps}>
          {STEPS.map((step, index) => (
            <div key={step.title} className={styles.step}>
              <div className={styles.stepNumber}>{index + 1}</div>
              <div className={styles.stepBody}>
                <h3>{step.title.replace(/^\d+\.\s*/, "")}</h3>
                <p>{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.ctaBanner}>
        <h2>Pronto para dar o primeiro passo?</h2>
        <p>
          Leve poucos minutos para preencher o cadastro completo e receber o
          status por e-mail.
        </p>
        <Link href="/oraculoacademico/cadastro" className={styles.primaryBtn}>
          Iniciar cadastro
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
