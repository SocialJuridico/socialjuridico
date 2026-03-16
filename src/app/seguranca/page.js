import styles from '../clientes/Marketing.module.css';
import { Lock, ShieldCheck, HardDrive, RefreshCcw, UserCheck, Key } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Segurança e Tecnologia | SocialJurídico",
  description: "Entenda como protegemos seus dados e garantimos a validade jurídica de todas as conexões.",
};

export default function Seguranca() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        
        <header className={styles.hero}>
          <h1 className={styles.title}>
            Segurança de <br />
            <span className={styles.highlight}>classe mundial.</span>
          </h1>
          <p className={styles.subtitle}>
            Protegemos suas informações com os mesmos protocolos utilizados pelas maiores instituições financeiras e tecnológicas do mundo.
          </p>
        </header>

        <div className={styles.features}>
          <div className={styles.card}>
            <div className={styles.iconBox}>
              <Lock size={32} />
            </div>
            <h3>Criptografia Total</h3>
            <p>Seus dados são protegidos por criptografia de ponta a ponta (AES-256) em repouso e em trânsito.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.iconBox}>
              <UserCheck size={32} />
            </div>
            <h3>Verificação CNA</h3>
            <p>Validamos rigorosamente a inscrição de cada advogado junto ao Cadastro Nacional dos Advogados da OAB.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.iconBox}>
              <ShieldCheck size={32} />
            </div>
            <h3>Conformidade LGPD</h3>
            <p>Nossa infraestrutura foi desenhada para atender 100% dos requisitos da Lei Geral de Proteção de Dados.</p>
          </div>
        </div>

        <section className={styles.ctaRow}>
          <h2>Sua confiança é nossa prioridade</h2>
          <p>Dúvidas técnicas sobre nossa infraestrutura?</p>
          <Link href="/contato" className={styles.btn}>
            Falar com a equipe técnica
          </Link>
        </section>

      </div>
    </main>
  );
}
