import Link from 'next/link';
import { Scale } from 'lucide-react';
import Button from '../Button';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.headerWrapper}>
      <div className={styles.headerContainer}>
        
        {/* Logo */}
        <Link prefetch={false} href="/" className={styles.logo}>
          <div className={styles.logoIconBox}>
            <Scale size={24} strokeWidth={2.5} />
          </div>
          <span className={styles.logoText}>SocialJurídico</span>
        </Link>

        {/* Navigation Links */}
        <nav className={styles.nav}>
          <Link prefetch={false} href="#como-funciona" className={styles.navLink}>
            Como Funciona
          </Link>
          <Link prefetch={false} href="#diferenciais" className={styles.navLink}>
            Diferenciais
          </Link>
          <Link prefetch={false} href="#depoimentos" className={styles.navLink}>
            Depoimentos
          </Link>
          <Link prefetch={false} href="#duvidas" className={styles.navLink}>
            Dúvidas
          </Link>
        </nav>

        {/* Action Button */}
        <div className={styles.loginAction}>
          <Link prefetch={false} href="/login" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" className={styles.loginButton}>
              Entrar Agora
            </Button>
          </Link>
        </div>

      </div>
    </header>
  );
}
