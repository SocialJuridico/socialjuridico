import Link from 'next/link';
import { ArrowRight, CheckCircle2, Users, Scale } from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import Button from '../Button';
import styles from './Hero.module.css';

// Busca direto no Supabase — funciona tanto no build quanto em ISR
async function getStats() {
  try {
    const [clientesRes, advRes] = await Promise.all([
      supabaseAdmin.from('clientes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('advogados').select('id', { count: 'exact', head: true }),
    ]);
    return {
      totalClientes: clientesRes.count || 0,
      totalAdvogados: advRes.count || 0,
    };
  } catch (e) {
    console.warn('Erro ao buscar stats:', e);
    return { totalClientes: 0, totalAdvogados: 0 };
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
          Conectamos problemas reais a soluções jurídicas. Publique seu{' '}
          <br className="hidden md:block" />
          caso <span className={styles.subtitleStrong}>100% GRÁTIS</span> e encontre advogados qualificados.
        </p>

        {/* CONTADOR DE USUÁRIOS */}
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <Users size={18} className={styles.statIcon} />
            <div className={styles.statTexts}>
              <span className={styles.statNumber}>{fmt(stats.totalClientes)}+</span>
              <span className={styles.statLabel}>Clientes cadastrados</span>
            </div>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <Scale size={18} className={styles.statIcon} />
            <div className={styles.statTexts}>
              <span className={styles.statNumber}>{fmt(stats.totalAdvogados)}+</span>
              <span className={styles.statLabel}>Advogados na plataforma</span>
            </div>
          </div>
        </div>

        {/* Action Area */}
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

