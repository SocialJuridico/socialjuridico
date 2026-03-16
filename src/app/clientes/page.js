import styles from './Marketing.module.css';
import { Search, ShieldCheck, Scale, ArrowRight, MessageSquare, Coins } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Para Clientes | SocialJurídico",
  description: "Resolva seus problemas jurídicos de forma gratuita e segura. Publique seu caso e receba propostas.",
};

export default function ParaClientes() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        
        <header className={styles.hero}>
          <h1 className={styles.title}>
            Justiça rápida e <br />
            <span className={styles.highlight}>100% gratuita para você.</span>
          </h1>
          <p className={styles.subtitle}>
            Esqueça as buscas intermináveis. No SocialJurídico, você descreve o seu problema e os melhores advogados vêm até você.
          </p>
        </header>

        <div className={styles.features}>
          <div className={styles.card}>
            <div className={styles.iconBox}>
              <Search size={32} />
            </div>
            <h3>Publique em Minutos</h3>
            <p>Conte o que aconteceu de forma simples. Nossa triagem automática organiza as informações para os especialistas.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.iconBox}>
              <Coins size={32} />
            </div>
            <h3>Custo Zero</h3>
            <p>O uso da plataforma para publicar casos e receber orientações iniciais é totalmente gratuito para o cidadão.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.iconBox}>
              <ShieldCheck size={32} />
            </div>
            <h3>Sigilo Total</h3>
            <p>Seus dados de contato só são liberados para o advogado que você escolher. Privacidade garantida pela LGPD.</p>
          </div>
        </div>

        <section className={styles.ctaRow}>
          <h2>Pronto para começar?</h2>
          <p>Não deixe seu problema para amanhã. Publique hoje mesmo.</p>
          <Link href="/cadastro" className={styles.btn}>
            Criar Conta Grátis
            <ArrowRight size={20} />
          </Link>
        </section>

      </div>
    </main>
  );
}
