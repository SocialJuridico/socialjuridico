import { MessageSquare, Users, ShieldCheck, Facebook, Star } from 'lucide-react';
import Button from '../Button';
import styles from './Community.module.css';

const reviews = [
  {
    initials: 'AC',
    color: '#F06292', // Rosa/Vermelho claro
    name: 'Ana Costa',
    time: '2 horas atrás',
    text: '"Meu caso foi resolvido em 30 dias! O advogado foi super atencioso, explicou tudo de forma clara. Recomendo demais o SocialJurídico!"'
  },
  {
    initials: 'RS',
    color: '#4ADE80', // Verde
    name: 'Roberto Silva',
    time: '4 horas atrás',
    text: '"Finalmente achei alguém que entende de contratos trabalhistas. Muito melhor que ficar procurando escritório por aí."'
  },
  {
    initials: 'CM',
    color: '#2DD4BF', // Verde água/Azul claro
    name: 'Carla Mendes',
    time: '5 horas atrás',
    text: '"Não acredito que consegui em tão pouco tempo e ainda por um preço justo. Sensacional, recomendando para todos os amigos!"'
  }
];

export default function Community() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        
        {/* Lado Esquerdo - Textos e Argumentos */}
        <div className={styles.leftColumn}>
          {/* <div className={styles.badge}>
            <div className={styles.greenDot}></div>
            COMUNIDADE ATIVA
          </div> */}

          <h2 className={styles.title}>
            Temos <span className={styles.highlight}>10 mil pessoas</span> no nosso grupo trocando dica
          </h2>

          <p className={styles.subtitle}>
            No grupo &quot;PRECISO DE UM ADVOGADO&quot; a galera recomenda, avalia e comenta mesmo. 
            Quem publica recebe dica de gente que já resolveu problema parecido e tem contato 
            direto de advogado que tá ali e pronto pra trabalhar.
          </p>

          <div className={styles.benefitsList}>
            <div className={styles.benefitItem}>
              <div className={styles.iconWrapper}>
                <MessageSquare size={24} />
              </div>
              <div className={styles.benefitTextContent}>
                <h3 className={styles.benefitTitle}>Gente respondendo de verdade</h3>
                <p className={styles.benefitDesc}>Quando alguém publica lá, em minutos já tá tendo resposta. Dica de quem passou pela mesma situação, ou advogado que quer pegar o caso.</p>
              </div>
            </div>

            <div className={styles.benefitItem}>
              <div className={styles.iconWrapper}>
                <Users size={24} />
              </div>
              <div className={styles.benefitTextContent}>
                <h3 className={styles.benefitTitle}>Você vê quem já resolveu</h3>
                <p className={styles.benefitDesc}>Os relatos tá tudo lá. Quem resolveu, como foi o processo, quanto custou. Você já sabe em que tá entrando.</p>
              </div>
            </div>

            <div className={styles.benefitItem}>
              <div className={styles.iconWrapper}>
                <ShieldCheck size={24} />
              </div>
              <div className={styles.benefitTextContent}>
                <h3 className={styles.benefitTitle}>Conversas reais, sem papo corporativo</h3>
                <p className={styles.benefitDesc}>É gente falando com gente. Sem aquele jogo de palavra de big company, sem esperar dois meses pra ter resposta.</p>
              </div>
            </div>
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
                  <span className={styles.groupPlatform}>Grupo do Facebook • +10k membros</span>
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
                <span className={styles.statValue}>10K+</span>
                <span className={styles.statLabel}>Membros Ativos</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>94%</span>
                <span className={styles.statLabel}>Taxa de Sucesso</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>24/7</span>
                <span className={styles.statLabel}>Suporte Ativo</span>
              </div>
            </div>

            <a href="https://www.facebook.com/groups/1667675480204134" target="_blank" rel="noopener noreferrer" className={styles.joinLink}>
               <Button variant="primary" className={styles.fbButton}>
                 <Facebook size={20} style={{marginRight: '8px'}} />
                 Participar do Grupo
               </Button>
            </a>

          </div>
        </div>

      </div>
    </section>
  );
}
