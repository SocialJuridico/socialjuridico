import { Clock, X, Zap, CheckCircle2 } from 'lucide-react';
import styles from './Differences.module.css';

export default function Differences() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Por que o <span className={styles.titleHighlight}>SocialJurídico</span> é diferente?
        </h2>
        <p className={styles.subtitle}>
          Deixamos a burocracia no passado. Trouxemos a advocacia para a era digital.
        </p>
      </div>

      <div className={styles.cardsContainer}>
        {/* Card: Advocacia Tradicional */}
        <div className={styles.cardTraditional}>
          <div className={styles.cardTraditionalHeader}>
            <Clock size={24} />
            <span>Advocacia Tradicional</span>
          </div>
          
          <ul className={styles.listTraditional}>
            <li className={styles.listItemTraditional}>
              <X className={styles.iconX} size={18} />
              Custos iniciais altos e imprevisíveis.
            </li>
            <li className={styles.listItemTraditional}>
              <X className={styles.iconX} size={18} />
              Atendimento lento e presencial obrigatório.
            </li>
            <li className={styles.listItemTraditional}>
              <X className={styles.iconX} size={18} />
              Linguagem difícil e falta de transparência.
            </li>
            <li className={styles.listItemTraditional}>
              <X className={styles.iconX} size={18} />
              Dificuldade para encontrar especialistas adequados para o seu caso.
            </li>
          </ul>
        </div>

        {/* Card: SocialJurídico */}
        <div className={styles.cardPremium}>
          <div className={styles.cardPremiumHeader}>
            <div className={styles.premiumTitleWrapper}>
              <Zap size={24} fill="currentColor" />
              <span>SocialJurídico</span>
            </div>
            <span className={styles.tagFuturo}>O FUTURO</span>
          </div>

          <ul className={styles.listPremium}>
            <li className={styles.listItemPremium}>
              <CheckCircle2 className={styles.iconCheck} size={20} />
              <div>
                <span className={styles.itemHeading}>Publicação Grátis: </span>
                Publique seu caso sem custos. A seriedade é garantida pela verificação de advogados qualificados.
              </div>
            </li>
            
            <li className={styles.listItemPremium}>
              <CheckCircle2 className={styles.iconCheck} size={20} />
              <div>
                <span className={styles.itemHeading}>Comunicação Integrada: </span>
                Chat em tempo real, videoconferência, compartilhamento de documentos e assinatura digital segura.
              </div>
            </li>

            <li className={styles.listItemPremium}>
              <CheckCircle2 className={styles.iconCheck} size={20} />
              <div>
                <span className={styles.itemHeading}>Avaliações Verificadas: </span>
                Sistema de estrelas baseado em experiências reais entre clientes e advogados, com transparência total.
              </div>
            </li>

            <li className={styles.listItemPremium}>
              <CheckCircle2 className={styles.iconCheck} size={20} />
              <div>
                <span className={styles.itemHeading}>IA Inteligente: </span>
                Ferramentas jurídicas assistidas por IA: calculadoras, análise de jurisprudência, redação de peças e gestão inteligente.
              </div>
            </li>
          </ul>
        </div>

      </div>
    </section>
  );
}
