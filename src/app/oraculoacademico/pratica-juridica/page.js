import Link from "next/link";
import { Scale } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Prática Jurídica Supervisionada" };

export default function PraticaJuridicaPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <Scale size={15} aria-hidden="true" />
            Prática Jurídica Supervisionada
          </span>
          <h1 className={styles.heroTitle}>
            Atuação real, sempre sob a responsabilidade de um advogado.
          </h1>
          <p className={styles.heroSubtitle}>
            O Oráculo Acadêmico não substitui a atuação de um advogado — ele
            organiza a prática de estudantes dentro de limites claros de
            responsabilidade.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.prose}>
          <h2>O que é permitido</h2>
          <ul>
            <li>Prestar informações gerais e apoio inicial ao relato de um caso.</li>
            <li>Organizar documentos, prazos e histórico de atendimento.</li>
            <li>Acompanhar o supervisor em orientações e reuniões, quando aplicável.</li>
          </ul>

          <h2>O que não é permitido</h2>
          <ul>
            <li>Prometer resultado ou captar cliente de forma irregular.</li>
            <li>Apresentar-se como advogado ou substituir a atuação de um advogado.</li>
            <li>
              Conduzir sozinho casos que exijam contratação formal, urgência,
              prazo processual ou prática de ato jurídico — esses casos são
              sempre encaminhados a um advogado habilitado.
            </li>
          </ul>

          <h2>O papel do supervisor</h2>
          <p>
            Cada Oráculo tem pelo menos um advogado supervisor (&quot;padrinho&quot;)
            responsável por acompanhar sua atuação. O supervisor confirma o
            convite antes da ativação e pode ser consultado a qualquer momento
            pela equipe do Social Jurídico.
          </p>

          <h2>Auditoria</h2>
          <p>
            Todas as interações realizadas dentro do programa podem ser
            auditadas para fins de segurança, qualidade e conformidade —
            ver{" "}
            <Link href="/oraculoacademico/seguranca-auditoria">
              Segurança e Auditoria
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
