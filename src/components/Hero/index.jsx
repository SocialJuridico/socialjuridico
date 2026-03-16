import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import Button from '../Button';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.content}>
        
        {/* Badge Superior
        <div className={styles.badge}>
          <div className={styles.greenDot}></div>
          PLATAFORMA DIGITAL DE DIREITO
        </div> */}

        {/* Título Principal */}
        <h1 className={styles.title}>
          A revolução do acesso à <br />
          <span className={styles.highlight}>justiça começa aqui.</span>
        </h1>

        {/* Subtítulo */}
        <p className={styles.subtitle}>
          Conectamos problemas reais a soluções jurídicas. Publique seu <br className="hidden md:block" />
          caso <span className={styles.subtitleStrong}>100% GRÁTIS</span> e encontre advogados qualificados.
        </p>

        {/* Action Area (apenas 1 botão e selo de gratuidade) */}
        <div className={styles.ctaWrapper}>
          <Link href="/cadastro" style={{ textDecoration: 'none' }}>
            <Button variant="primary" className={styles.ctaButton}>
              Cadastre-se agora
              <ArrowRight size={20} />
            </Button>
          </Link>

          <div className={styles.freeLabel}>
            <CheckCircle2 size={18} strokeWidth={2.5} />
            100% GRÁTIS
          </div>
        </div>

      </div>
    </section>
  );
}
