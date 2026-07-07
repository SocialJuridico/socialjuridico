import Link from "next/link";
import { FileText } from "lucide-react";

import styles from "../components/marketing.module.css";

export const metadata = { title: "Termos de Uso" };

export default function TermosPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>
            <FileText size={15} aria-hidden="true" />
            Termos de Uso
          </span>
          <h1 className={styles.heroTitle}>Termos de Uso do Oráculo Acadêmico</h1>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.prose}>
          <h2>1. Sobre o programa</h2>
          <p>
            O Oráculo Acadêmico é um programa do ecossistema Social Jurídico
            voltado a estudantes e estagiários de Direito sem OAB de
            advogado, destinado à prática jurídica supervisionada.
          </p>

          <h2>2. Cadastro e veracidade das informações</h2>
          <p>
            Ao se cadastrar, o candidato declara que as informações e os
            documentos enviados (comprovante de matrícula ou inscrição de
            estagiário) são verdadeiros. Informações falsas podem resultar em
            reprovação ou suspensão do cadastro.
          </p>

          <h2>3. Papel do supervisor</h2>
          <p>
            O candidato deve indicar de 1 a 3 advogados supervisores, que
            precisam confirmar o convite recebido por e-mail. O acesso à
            plataforma só é liberado após a aprovação de pelo menos um
            supervisor e a validação do documento pela nossa equipe.
          </p>

          <h2>4. Limites da atuação</h2>
          <p>
            O candidato não substitui a atuação de um advogado, não pode
            prometer resultado, captar cliente irregularmente ou se
            apresentar como advogado. Sua atuação se limita a informações
            gerais, apoio inicial e organização do relato do caso — ver{" "}
            <Link href="/oraculoacademico/pratica-juridica">
              Prática Jurídica Supervisionada
            </Link>
            .
          </p>

          <h2>5. Auditoria e suspensão</h2>
          <p>
            As interações do candidato podem ser auditadas a qualquer
            momento. O cadastro pode ser suspenso ou reprovado pela equipe do
            Social Jurídico, com motivo registrado e comunicado por e-mail.
          </p>

          <h2>6. Alterações destes termos</h2>
          <p>
            Estes termos podem ser atualizados conforme o programa evolui.
            Alterações relevantes serão comunicadas aos participantes ativos.
          </p>
        </div>
      </section>
    </main>
  );
}
