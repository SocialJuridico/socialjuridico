import Link from "next/link";
import { ShieldCheck } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Segurança e Auditoria" };

export default function SegurancaAuditoriaPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <ShieldCheck size={15} aria-hidden="true" />
            Segurança e Auditoria
          </span>
          <h1 className={styles.heroTitle}>
            Cada etapa do programa existe para proteger quem participa.
          </h1>
          <p className={styles.heroSubtitle}>
            Documentos validados, supervisão obrigatória e possibilidade de
            auditoria a qualquer momento.
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.prose}>
          <h2>Validação de documentos</h2>
          <p>
            Todo cadastro exige o envio de um comprovante (matrícula
            atualizada ou inscrição de estagiário na OAB). O documento é
            armazenado em um bucket privado e só pode ser acessado pela
            equipe administrativa por meio de um link temporário, válido por
            poucos minutos.
          </p>

          <h2>Supervisão obrigatória</h2>
          <p>
            Nenhum Oráculo é ativado sem a aprovação de pelo menos um
            advogado supervisor. O supervisor confirma o convite recebido por
            e-mail e pode ser consultado a qualquer momento sobre a atuação
            do candidato que indicou.
          </p>

          <h2>Auditoria</h2>
          <p>
            As interações realizadas dentro do programa podem ser auditadas
            pela equipe do Social Jurídico para fins de segurança, qualidade
            e conformidade. Cadastros podem ser suspensos ou reprovados, com
            motivo registrado, a qualquer momento em que uma irregularidade
            for identificada.
          </p>

          <h2>Dados pessoais</h2>
          <p>
            O tratamento de dados pessoais segue a nossa{" "}
            <Link href="/oraculoacademico/privacidade">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
