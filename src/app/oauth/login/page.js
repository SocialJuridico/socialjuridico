import Link from "next/link";
import { Scale, ShieldCheck } from "lucide-react";
import OAuthLoginForm from "./OAuthLoginForm";
import styles from "../OAuth.module.css";

export const dynamic = "force-dynamic";

export default async function OAuthLoginPage({ searchParams }) {
  const params = await searchParams;
  const authorizationId =
    typeof params?.authorization_id === "string" ? params.authorization_id : "";

  if (!authorizationId) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.brand}>
            <Scale size={20} aria-hidden="true" />
            Social Jurídico
          </div>

          <section className={`${styles.card} ${styles.errorCard}`}>
            <ShieldCheck size={36} aria-hidden="true" />
            <h1>Solicitação inválida</h1>
            <p>O identificador da autorização não foi informado.</p>
            <Link href="/" className={styles.homeLink}>
              Voltar ao Social Jurídico
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.brand}>
          <Scale size={20} aria-hidden="true" />
          Social Jurídico
        </div>

        <section className={styles.card}>
          <OAuthLoginForm authorizationId={authorizationId} />
        </section>
      </div>
    </main>
  );
}
