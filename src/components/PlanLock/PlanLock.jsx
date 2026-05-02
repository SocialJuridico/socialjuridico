import React from 'react';
import { Lock, Sparkles, ChevronRight } from 'lucide-react';
import styles from './PlanLock.module.css';

const PlanLock = ({ title, description, onUpgrade }) => {
  return (
    <div className={styles.lockContainer}>
      <div className={styles.lockCard}>
        <div className={styles.iconCircle}>
          <Lock size={32} />
        </div>
        <h2 className={styles.title}>{title || "Recurso Bloqueado"}</h2>
        <p className={styles.description}>
          {description || "Este recurso está disponível exclusivamente para assinantes do plano PRO."}
        </p>
        
        <div className={styles.features}>
          <div className={styles.featureItem}>
            <Sparkles size={16} className={styles.featureIcon} />
            <span>Acesso ilimitado às ferramentas de IA</span>
          </div>
          <div className={styles.featureItem}>
            <Sparkles size={16} className={styles.featureIcon} />
            <span>Sem limites de clientes ou armazenamento</span>
          </div>
        </div>

        <button className={styles.upgradeBtn} onClick={onUpgrade}>
          Ver Planos de Upgrade <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default PlanLock;
