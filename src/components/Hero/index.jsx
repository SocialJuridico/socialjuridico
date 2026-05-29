import Link from 'next/link';
import { ArrowRight, Users, Scale, Briefcase, BadgeCheck } from 'lucide-react';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import Button from '../Button';
import styles from './Hero.module.css';

// Busca direto no Supabase — funciona tanto no build quanto em ISR
async function getStats() {
  try {
    const client = supabaseAdmin || supabase;
    const [clientesRes, advRes, casosRes] = await Promise.all([
      client.from('clientes').select('id', { count: 'exact', head: true }),
      client.from('advogados').select('id', { count: 'exact', head: true }),
      client.from('casos').select('id', { count: 'exact', head: true }).eq('status', 'ABERTO'),
    ]);
    return {
      totalClientes: clientesRes.count || 0,
      totalAdvogados: advRes.count || 0,
      totalCasos: casosRes.count || 0,
    };
  } catch (e) {
    console.warn('Erro ao buscar stats:', e);
    return { totalClientes: 0, totalAdvogados: 0, totalCasos: 0 };
  }
}

export default async function Hero() {
  const stats = await getStats();

  // Formatar número com separador de milhar
  const fmt = (n) => Number(n).toLocaleString('pt-BR');

  return (
    <section className={styles.heroSection}>
      <div className={styles.content}>

        {/* Título Principal */}
        <h1 className={styles.title}>
          A revolução do acesso à <br />
          <span className={styles.highlight}>justiça começa aqui.</span>
        </h1>

        {/* Subtítulo */}
        <p className={styles.subtitle}>
          Conectamos problemas reais a soluções <br className={styles.mobileBr} />
          jurídicas. Publique seu caso 100% <br className={styles.mobileBr} />
          <span className={styles.subtitleStrong}>GRÁTIS</span> e encontre advogados <br className={styles.mobileBr} />
          qualificados.
        </p>

        {/* CONTADOR DE USUÁRIOS */}
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <Users size={18} className={styles.statIcon} />
            <div className={styles.statTexts}>
              <span className={styles.statNumber}>{fmt(stats.totalClientes)}+</span>
              <span className={styles.statLabel}>
                <span className={styles.desktopLabel}>Clientes cadastrados</span>
                <span className={styles.mobileLabel}>Clientes</span>
              </span>
            </div>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <Scale size={18} className={styles.statIcon} />
            <div className={styles.statTexts}>
              <span className={styles.statNumber}>{fmt(stats.totalAdvogados)}+</span>
              <span className={styles.statLabel}>
                <span className={styles.desktopLabel}>Advogados na plataforma</span>
                <span className={styles.mobileLabel}>Advogados</span>
              </span>
            </div>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <Briefcase size={18} className={styles.statIcon} />
            <div className={styles.statTexts}>
              <span className={styles.statNumber}>{fmt(stats.totalCasos)}+</span>
              <span className={styles.statLabel}>
                <span className={styles.desktopLabel}>Casos abertos agora</span>
                <span className={styles.mobileLabel}>Casos</span>
              </span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className={styles.ctaWrapper}>
          <Link prefetch={false} href="/cadastro" className={styles.ctaLink}>
            <Button variant="primary" className={styles.ctaButton}>
              Quero Publicar Caso
              <ArrowRight size={20} />
            </Button>
          </Link>

          <Link prefetch={false} href="/sou-advogado" className={styles.ctaLink}>
            <Button variant="secondary" className={styles.ctaButton}>
              <Briefcase size={20} />
              Sou Advogado
            </Button>
          </Link>

          <div className={styles.freeLabel}>
            <BadgeCheck size={16} className={styles.freeIcon} />
            100% GRÁTIS PARA CLIENTES
          </div>
        </div>

      </div>
    </section>
  );
}
