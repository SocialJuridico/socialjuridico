import Link from 'next/link';
import { Scale } from 'lucide-react';
import Button from '../Button';
import styles from './Header.module.css';

export default function Header() {
  return (
    <header className={styles.headerWrapper}>
      <div className={styles.headerContainer}>
        
        {/* Logo Desktop */}
        <Link prefetch={false} href="/" className={styles.logoDesktop}>
          <div className={styles.logoIconBox}>
            <Scale size={24} strokeWidth={2.5} />
          </div>
          <span className={styles.logoText}>SocialJurídico</span>
        </Link>

        {/* Logo Mobile */}
        <Link prefetch={false} href="/" className={styles.logoMobile}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo.png" alt="SocialJurídico Logo" className={styles.logoImg} />
        </Link>

        {/* Navigation Links */}
        <nav className={styles.nav}>
          <Link prefetch={false} href="#" className={styles.navLink}>
            Home
          </Link>
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
            <Button variant="primary" className={styles.loginButton}>
              Entrar agora
            </Button>
          </Link>
        </div>

      </div>
    </header>
  );
}
