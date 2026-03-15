import Link from 'next/link';
import { Scale } from 'lucide-react';
import Button from '../Button';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.headerWrapper}>
      <div className={styles.headerContainer}>
        
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIconBox}>
            <Scale size={24} strokeWidth={2.5} />
          </div>
          <span className={styles.logoText}>SocialJurídico</span>
        </Link>

        {/* Navigation Links */}
        <nav className={styles.nav}>
          <Link href="#como-funciona" className={styles.navLink}>
            Como Funciona
          </Link>
          <Link href="#diferenciais" className={styles.navLink}>
            Diferenciais
          </Link>
          <Link href="#depoimentos" className={styles.navLink}>
            Depoimentos
          </Link>
          <Link href="#duvidas" className={styles.navLink}>
            Dúvidas
          </Link>
        </nav>

        {/* Action Button */}
        <div className={styles.loginAction}>
          <Button variant="secondary" className={styles.loginButton}>
            Entrar Agora
          </Button>
        </div>

      </div>
    </header>
  );
}
