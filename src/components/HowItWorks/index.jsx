import { Users, Gavel, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import styles from './HowItWorks.module.css';

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <span className={styles.badge}>Passo a Passo</span>
        <h2 className={styles.title}>Como funciona na prática?</h2>
      </div>

      <div className={styles.grid}>
        
        {/* Coluna 1: Para Clientes */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <div className={styles.iconBoxSolid}>
              <Users size={24} />
            </div>
            <h3 className={styles.columnTitle}>Para Clientes</h3>
          </div>

          <div className={styles.stepsList}>
            <div className={styles.stepItem}>
              <div className={styles.stepNumberClient}>1</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>Relate seu problema</h4>
                <p className={styles.stepDesc}>
                  Nossa Inteligência Artificial ajuda você a descrever o caso e categoriza a área jurídica correta automaticamente.
                </p>
              </div>
            </div>

            <div className={styles.stepItem}>
              <div className={styles.stepNumberClient}>2</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>Publicação Instantânea</h4>
                <p className={styles.stepDesc}>
                  Seu caso é publicado 100% gratuitamente na plataforma. Advogados especializados visualizam seu problema e manifestam interesse.
                </p>
              </div>
            </div>

            <div className={styles.stepItem}>
              <div className={styles.stepNumberClient}>3</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>Resolução Digital</h4>
                <p className={styles.stepDesc}>
                  Advogados qualificados entram em contato. Converse, envie provas, faça videochamadas e acompanhe a resolução.
                </p>
              </div>
            </div>
          </div>

          <Link href="#criar-conta-cliente" className={styles.linkButtonClient}>
            Criar minha conta de cliente <ChevronRight size={16} />
          </Link>
        </div>

        {/* Coluna 2: Para Advogados */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <div className={styles.iconBoxGold}>
              <Gavel size={24} />
            </div>
            <h3 className={styles.columnTitle}>Para Advogados</h3>
          </div>

          <div className={styles.stepsList}>
            <div className={styles.stepItem}>
              <div className={styles.stepNumberLawyer}>1</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>Cadastro Profissional</h4>
                <p className={styles.stepDesc}>
                  Crie seu perfil profissional e insira suas áreas de atuação para receber as demandas certas.
                </p>
              </div>
            </div>

            <div className={styles.stepItem}>
              <div className={styles.stepNumberLawyer}>2</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>Clientes Reais e Comprometidos</h4>
                <p className={styles.stepDesc}>
                  Você tem acesso apenas a demandas reais e sérias de clientes genuínos interessados em resolver seus problemas.
                </p>
              </div>
            </div>

            <div className={styles.stepItem}>
              <div className={styles.stepNumberLawyer}>3</div>
              <div className={styles.stepContent}>
                <h4 className={styles.stepTitle}>Gestão Integrada</h4>
                <p className={styles.stepDesc}>
                  Gerencie múltiplos clientes em um único dashboard. Histórico, arquivos e chat centralizados.
                </p>
              </div>
            </div>
          </div>

          <Link href="#criar-conta-advogado" className={styles.linkButtonLawyer}>
            Cadastrar como advogado <ChevronRight size={16} />
          </Link>
        </div>

      </div>
    </section>
  );
}
