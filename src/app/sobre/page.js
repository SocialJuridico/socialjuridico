import styles from './Sobre.module.css';
import { Scale, ShieldCheck, Zap, Heart, Award, Globe } from 'lucide-react';

export const metadata = {
  title: "Sobre Nós | SocialJurídico",
  description: "Conheça a missão e a história do SocialJurídico, a revolução no acesso à justiça.",
};

export default function Sobre() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        
        {/* Header */}
        <header className={styles.header}>
          <span className={styles.badge}>Nossa História</span>
          <h1 className={styles.title}>
            Democratizando o acesso à <br />
            <span className={styles.highlight}>justiça no Brasil.</span>
          </h1>
          <p className={styles.subtitle}>
            Nascemos com o propósito de quebrar as barreiras entre cidadãos e o direito, usando tecnologia de ponta para criar conexões éticas e eficientes.
          </p>
        </header>

        {/* Story Section */}
        <div className={styles.storyGrid}>
          <div className={styles.imagePlaceholder}>
            <Scale size={80} color="var(--color-gold)" strokeWidth={1} />
          </div>
          <div className={styles.storyContent}>
            <h2>Como tudo começou</h2>
            <p>
              O SocialJurídico surgiu da observação de uma lacuna crítica: a dificuldade de milhares de brasileiros em encontrar auxílio jurídico qualificado e, ao mesmo tempo, o desafio de advogados em encontrar casos relevantes de forma ética.
            </p>
            <p>
              Acreditamos que a tecnologia não deve substituir o advogado, mas sim potencializar sua capacidade de ajudar. Criamos um ecossistema onde a transparência e a agilidade são os pilares fundamentais.
            </p>
            <p>
              Hoje, somos uma das plataformas que mais cresce no setor, unindo tradição jurídica com a inovação digital que o século XXI exige.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>+15k</span>
            <span className={styles.statLabel}>Usuários Ativos</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>+5k</span>
            <span className={styles.statLabel}>Advogados</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>+10k</span>
            <span className={styles.statLabel}>Casos Resolvidos</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNumber}>24/7</span>
            <span className={styles.statLabel}>Disponibilidade</span>
          </div>
        </div>

        {/* Values */}
        <section className={styles.values}>
          <h2>Nossos Valores</h2>
          <div className={styles.valuesGrid}>
            <div className={styles.valueCard}>
              <div className={styles.iconWrapper}>
                <ShieldCheck size={28} />
              </div>
              <h3>Ética Inegociável</h3>
              <p>Atuamos em total conformidade com as diretrizes da OAB, garantindo um ambiente profissional e respeitoso para todos.</p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.iconWrapper}>
                <Zap size={28} />
              </div>
              <h3>Agilidade Digital</h3>
              <p>Reduzimos a burocracia do primeiro contato, permitindo que soluções cheguem mais rápido a quem precisa.</p>
            </div>
            <div className={styles.valueCard}>
              <div className={styles.iconWrapper}>
                <Award size={28} />
              </div>
              <h3>Excelência</h3>
              <p>Buscamos a perfeição em cada pixel da nossa plataforma e em cada processo de conexão que realizamos.</p>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
