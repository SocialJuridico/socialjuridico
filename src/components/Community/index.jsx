import { MessageSquare, Users, Facebook, Star } from 'lucide-react';
import Button from '../Button';
import styles from './Community.module.css';

const reviews = [
  {
    initials: 'AL',
    color: '#F06292', // Rosa
    name: 'Ana Laura',
    time: 'há 2 horas',
    text: '“Meu caso foi resolvido em 20 min. O advogado foi super atencioso.”'
  },
  {
    initials: 'VS',
    color: '#3b82f6', // Azul
    name: 'Valterio Silva',
    time: 'há 4 dias',
    text: '“Finalmente achei alguém que entende de contratos trabalhistas.”'
  }
];

export default function Community() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        
        {/* Lado Esquerdo - Textos e Argumentos */}
        <div className={styles.leftColumn}>
          <h2 className={styles.title}>
            Temos <span className={styles.highlight}>10 mil pessoas</span> recomendando
          </h2>

          <p className={styles.subtitle}>
            No grupo &quot;PRECISO DE UM ADVOGADO&quot; a galera recomenda, avalia e contrata mesmo... 
            Comente se quiser saber: Já resolveu casos similares.
          </p>

          <div className={styles.benefitsList}>
            <div className={styles.benefitItem}>
              <div className={styles.iconWrapper}>
                <MessageSquare size={24} />
              </div>
              <div className={styles.benefitTextContent}>
                <h3 className={styles.benefitTitle}>Gente respondendo de verdade</h3>
                <p className={styles.benefitDesc}>respostas em retorno para suas dúvidas.</p>
              </div>
            </div>

            <div className={styles.benefitItem}>
              <div className={styles.iconWrapper}>
                <Users size={24} />
              </div>
              <div className={styles.benefitTextContent}>
                <h3 className={styles.benefitTitle}>Você vê quem é resolutivo</h3>
                <p className={styles.benefitDesc}>Histórico transparente de resoluções.</p>
              </div>
            </div>
          </div>

          {/* Botão de Ação no Fluxo Principal */}
          <div className={styles.ctaWrapper}>
            <a 
              href="https://www.facebook.com/groups/1667675480204134" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={styles.joinLink}
            >
              <Button variant="primary" className={styles.joinBtn}>
                Participar do grupo
              </Button>
            </a>
          </div>
        </div>

        {/* Lado Direito - Mock do Grupo / Feedbacks */}
        <div className={styles.rightColumn}>
          <div className={styles.reviewsCard}>
            
            <div className={styles.cardHeader}>
               <div className={styles.groupIconWrapper}>
                  <Users size={20} className={styles.groupIcon} />
               </div>
               <div className={styles.groupTitleInfo}>
                  <h4 className={styles.groupName}>PRECISO DE UM ADVOGADO</h4>
                  <span className={styles.groupPlatform}>Grupo do Facebook • 10k membros</span>
               </div>
            </div>

            <div className={styles.reviewsList}>
              {reviews.map((rev, index) => (
                <div key={index} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.avatar} style={{ backgroundColor: rev.color }}>
                      {rev.initials}
                    </div>
                    <div className={styles.reviewerInfo}>
                      <span className={styles.reviewerName}>{rev.name}</span>
                      <span className={styles.reviewTime}>{rev.time}</span>
                    </div>
                  </div>
                  <p className={styles.reviewText}>{rev.text}</p>
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={14} fill="#D4AF37" color="#D4AF37" />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.groupStats}>
              <div className={styles.statItem}>
                <span className={styles.statValue} style={{ color: '#3b82f6' }}>100+</span>
                <span className={styles.statLabel}>ativos</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue} style={{ color: '#10b981' }}>94%</span>
                <span className={styles.statLabel}>resolvidos</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue} style={{ color: '#a855f7' }}>24,9</span>
                <span className={styles.statLabel}>visitas</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
