import { ArrowLeft, Megaphone } from "lucide-react";
import Link from "next/link";
import styles from "../Push.module.css";

export default function CommunicationHeader() {
  return (
    <header className={styles.header}>
      <div>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} aria-hidden="true" />
          Voltar ao painel admin
        </Link>

        <div className={styles.titleRow}>
          <span className={styles.titleIcon}>
            <Megaphone size={22} aria-hidden="true" />
          </span>
          <div>
            <span className={styles.eyebrow}>Comunicação e marketing</span>
            <h1>Disparos administrativos</h1>
            <p>
              Envie notificações push e comunicados por e-mail para públicos da plataforma.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
