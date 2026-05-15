import { Sparkles, FileText, Users, Filter } from 'lucide-react';
import styles from './Features.module.css';

const featuresData = [
  {
    icon: Sparkles,
    title: 'Redator IA Avançado',
    subtitle: 'GERAÇÃO DE PETIÇÕES EM SEGUNDOS',
  },
  {
    icon: FileText,
    title: 'Notificação Extrajudicial',
    subtitle: 'DESTRAVE ACORDOS SEM PROCESSO',
  },
  {
    icon: Users,
    title: 'CRM Inteligente',
    subtitle: 'ORGANIZE LEADS E CLIENTES',
  },
  {
    icon: Filter,
    title: 'Triagem de Casos',
    subtitle: 'FILTROS AVANÇADOS DE OPORTUNIDADES',
  },
];

export default function Features() {
  return (
    <section className={styles.featuresSection}>
      <div className={styles.container}>
        {featuresData.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className={styles.featureItem}>
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
