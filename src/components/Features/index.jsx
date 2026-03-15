import { Coins, Laptop, ShieldCheck, Globe } from 'lucide-react';
import styles from './Features.module.css';

const featuresData = [
  {
    icon: Coins, // Alternativa ao ícone de moedas/100%
    title: '100% Grátis',
    subtitle: 'ZERO TAXAS PARA PUBLICAR',
  },
  {
    icon: Laptop, // Ícone do notebook conforme imagem
    title: 'IA Integrada',
    subtitle: 'ANÁLISES JURÍDICAS AUTOMÁTICAS',
  },
  {
    icon: ShieldCheck, // Computador escudo conforme imagem
    title: 'Dados Protegidos',
    subtitle: 'SUAS INFORMAÇÕES SEMPRE SEGURAS',
  },
  {
    icon: Globe, // Globo conforme imagem
    title: 'Acesso em Qualquer Lugar',
    subtitle: 'SINCRONIZADO EM TEMPO REAL',
  },
];

export default function Features() {
  return (
    <section className={styles.featuresSection}>
      <div className={styles.container}>
        {featuresData.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={index} className={styles.featureItem}>
              <div className={styles.iconWrapper}>
                <Icon size={32} strokeWidth={1.5} />
              </div>
              <h3 className={styles.title}>{feature.title}</h3>
              <p className={styles.subtitle}>{feature.subtitle}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
