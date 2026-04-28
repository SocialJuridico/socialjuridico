import Link from 'next/link';
import { Scale, Facebook, Instagram, Linkedin, Lock } from 'lucide-react';
import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        
        {/* Coluna 1: Logo e Descrição */}
        <div className={styles.brandColumn}>
          <Link prefetch={false} href="/" className={styles.logoWrapper}>
            <Scale size={28} strokeWidth={2.5} />
            SocialJurídico
          </Link>
          <p className={styles.brandDesc}>
            A plataforma líder em conectar clientes a oportunidades jurídicas. Tecnologia a serviço da Justiça.
          </p>
          <div className={styles.socials}>
            {/* Os ícones de redes sociais podem ir pros links reais no futuro */}
            <a href="#" className={styles.socialIcon} aria-label="Facebook">
              <Facebook size={18} />
            </a>
            <a href="#" className={styles.socialIcon} aria-label="Instagram">
              <Instagram size={18} />
            </a>
            <a href="#" className={styles.socialIcon} aria-label="LinkedIn">
              <Linkedin size={18} />
            </a>
          </div>
        </div>

        {/* Coluna 2: Plataforma */}
        <div className={styles.linkColumn}>
          <h4 className={styles.columnTitle}>Plataforma</h4>
          <ul className={styles.linkList}>
            <li><Link prefetch={false} href="/clientes" className={styles.navLink}>Para Clientes</Link></li>
            <li><Link prefetch={false} href="/advogados" className={styles.navLink}>Para Advogados</Link></li>
            <li><Link prefetch={false} href="/seguranca" className={styles.navLink}>Segurança</Link></li>
          </ul>
        </div>

        {/* Coluna 3: Empresa */}
        <div className={styles.linkColumn}>
          <h4 className={styles.columnTitle}>Empresa</h4>
          <ul className={styles.linkList}>
            <li><Link prefetch={false} href="/sobre" className={styles.navLink}>Sobre Nós</Link></li>
            <li><Link prefetch={false} href="/contato" className={styles.navLink}>Contato</Link></li>
          </ul>
        </div>

        {/* Coluna 4: Legal / Admin */}
        <div className={styles.linkColumn}>
          <h4 className={styles.columnTitle}>Legal</h4>
          <ul className={styles.linkList}>
            <li><Link prefetch={false} href="/termos" className={styles.navLink}>Termos de Uso</Link></li>
            <li><Link prefetch={false} href="/privacidade" className={styles.navLink}>Política de Privacidade</Link></li>
            <li><Link prefetch={false} href="/exclusao-de-dados" className={styles.navLink}>Exclusão de Dados</Link></li>
          </ul>

          <Link prefetch={false} href="/admin" className={styles.adminBtn}>
            <Lock size={16} /> Área Administrativa
          </Link>
        </div>

      </div>

      <div className={styles.bottomRow}>
        © {currentYear} SocialJurídico Tecnologia Jurídica Ltda. Todos os direitos reservados.
      </div>
    </footer>
  );
}
