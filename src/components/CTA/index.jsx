import Link from 'next/link';
import Button from '../Button';
import styles from './CTA.module.css';

export default function CTA() {
  return (
    <section className={styles.section}>
      <div className={styles.content}>
        <h2 className={styles.title}>Pronto para resolver seu problema?</h2>
        <p className={styles.subtitle}>
          Junte-se a quem já está modernizando sua relação com a justiça.
        </p>

        <div className={styles.buttonsWrapper}>
          <Link prefetch={false} href="/cadastro" style={{ textDecoration: 'none' }}>
            <Button variant="primary">Criar Conta e Publicar</Button>
          </Link>
          <Link prefetch={false} href="/sou-advogado" style={{ textDecoration: 'none' }}>
            <Button variant="secondary">Sou Advogado</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
