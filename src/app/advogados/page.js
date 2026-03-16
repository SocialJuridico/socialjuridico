import styles from '../clientes/Marketing.module.css';
import { Briefcase, TrendingUp, Users, ArrowRight, CheckCircle, Award } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Para Advogados | SocialJurídico",
  description: "Aumente sua carteira de clientes de forma ética e eficiente. Receba notificações de novos casos reais.",
};

export default function ParaAdvogados() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        
        <header className={styles.hero}>
          <h1 className={styles.title}>
            Novos clientes todos os dias, <br />
            <span className={styles.highlight}>de forma ética e digital.</span>
          </h1>
          <p className={styles.subtitle}>
            Filtre casos por especialidade e região. Encontre quem realmente precisa do seu serviço e gerencie seus contatos em um só lugar.
          </p>
        </header>

        <div className={styles.features}>
          <div className={styles.card}>
            <div className={styles.iconBox}>
              <Briefcase size={32} />
            </div>
            <h3>Demanda Qualificada</h3>
            <p>Acesse casos já triados e prontos para atendimento. Menos burocracia na prospecção inicial.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.iconBox}>
              <TrendingUp size={32} />
            </div>
            <h3>Marketing Ético</h3>
            <p>Esteja presente onde o cliente procura, respeitando integralmente o Código de Ética e Disciplina da OAB.</p>
          </div>

          <div className={styles.card}>
            <div className={styles.iconBox}>
              <Award size={32} />
            </div>
            <h3>Diferenciação</h3>
            <p>Construa sua reputação digital com avaliações reais e selos de verificação de OAB.</p>
          </div>
        </div>

        <section className={styles.ctaRow}>
          <h2>Seja um Advogado Parceiro</h2>
          <p>Potencialize seu escritório com a tecnologia do SocialJurídico.</p>
          <Link href="/cadastro" className={styles.btn}>
            Cadastrar como Advogado
            <ArrowRight size={20} />
          </Link>
        </section>

      </div>
    </main>
  );
}
