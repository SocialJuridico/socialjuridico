import Link from "next/link";

import styles from "./page.module.css";

export default function PesquisaSatisfacaoEncerrada() {
  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <div className={styles.successMessage}>
          <h2>Pesquisa encerrada</h2>
          <p>
            Esta rodada anterior de pesquisa foi finalizada. As respostas ja
            enviadas continuam preservadas para consulta administrativa.
          </p>
          <p>
            A nova pesquisa sobre a atualizacao da plataforma esta disponivel
            para todos os advogados.
          </p>
          <Link href="/dashboard/advogado/pesquisa-atualizacao" className={styles.backBtn}>
            Responder nova pesquisa
          </Link>
        </div>
      </div>
    </div>
  );
}
