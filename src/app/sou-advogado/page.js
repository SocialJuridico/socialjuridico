import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Zap, BarChart3, Users, Scale, Briefcase, Sparkles, FileText } from 'lucide-react';
import Button from '@/components/Button';
import styles from './page.module.css';

export const metadata = {
  title: 'Para Advogados - Social Jurídico',
  description: 'Aumente sua carteira de clientes e gerencie seus casos com eficiência no Social Jurídico.',
};

export default function SouAdvogadoPage() {
  return (
    <div className={styles.container}>
      {/* HERO SECTION */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.badge}>TECNOLOGIA PARA ADVOGADOS</span>
          <h1 className={styles.title}>
            Capte Clientes Reais e <br />
            <span className={styles.highlight}>Automatize seu Escritório com IA</span>
          </h1>
          <p className={styles.subtitle}>
            Captação Ativa de Casos, Redator de Petições por IA e <strong>Notificação Extrajudicial com Geolocalização</strong>. Tudo com a segurança da <strong>Blindagem Digital SHA-512</strong>.
          </p>
          <div className={styles.ctaWrapper}>
            <Link href="/cadastro?perfil=advogado">
              <Button variant="primary" className={styles.ctaButton}>
                Começar Agora (Grátis)
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="#planos">
              <Button variant="secondary" className={styles.ctaButton}>
                Conhecer Recursos Premium
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA (MINI TUTORIAL) */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Como Funciona?</h2>
          <p className={styles.sectionSubtitle}>Três passos simples para você começar a atender</p>
        </div>
        
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h3>Crie seu Perfil</h3>
            <p>Cadastre-se na plataforma, preencha suas áreas de atuação e mostre sua experiência para potenciais clientes.</p>
          </div>
          
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h3>Analise os Casos</h3>
            <p>Receba e filtre casos publicados por usuários da plataforma. Use nossa IA para analisar a viabilidade do caso.</p>
          </div>
          
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h3>Faça sua Proposta</h3>
            <p>Inicie uma negociação direta com o cliente. Use seus "Juris" para liberar o contato e fechar o contrato.</p>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS (RECURSOS PREMIUM) */}
      <section className={styles.section + ' ' + styles.bgAlternate}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recursos Tecnológicos de Ponta</h2>
          <p className={styles.sectionSubtitle}>O que torna o Social Jurídico indispensável para o seu escritório</p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><ShieldCheck size={24} /></div>
            <h3>Blindagem Digital SHA-512</h3>
            <p>Gere cadeia de custódia válida para uso judicial. Proteja contratos, procurações e provas digitais com imutabilidade garantida.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><Zap size={24} /></div>
            <h3>Redator IA Avançado</h3>
            <p>Gere petições, contratos e documentos jurídicos complexos em segundos com nossa inteligência artificial especializada.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><FileText size={24} /></div>
            <h3>Notificação com Geolocalização</h3>
            <p>Envie notificações extrajudiciais blindadas com confirmação de entrega e registro de geolocalização do destinatário.</p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}><BarChart3 size={24} /></div>
            <h3>Análise de Viabilidade</h3>
            <p>Nossa IA analisa o caso publicado e gera um relatório prévio de viabilidade para você decidir se vale a pena investir tempo.</p>
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Escolha o plano ideal</h2>
          <p className={styles.sectionSubtitle}>Desbloqueie o potencial máximo da sua advocacia</p>
        </div>

        <div className={styles.plansGrid}>
          {/* PLANO START */}
          <div className={styles.planCard}>
            <div className={styles.planHeader}>
              <h3>Plano START</h3>
              <p className={styles.planPrice}>Consultar Valor</p>
            </div>
            <ul className={styles.planFeatures}>
              <li><CheckCircle2 size={16} /> 7 Juris todo mês para abrir casos</li>
              <li><CheckCircle2 size={16} /> CRM de Clientes básico</li>
              <li><CheckCircle2 size={16} /> Acesso à IA de Viabilidade</li>
              <li><CheckCircle2 size={16} /> Blindagem de Provas (Custo por uso)</li>
              <li><CheckCircle2 size={16} /> Notificação Extrajudicial (R$ 10,00)</li>
            </ul>
            <Link href="/cadastro?perfil=advogado" className={styles.planLink}>
              <Button variant="secondary" className={styles.planButton}>Começar Agora</Button>
            </Link>
          </div>

          {/* PLANO PRO */}
          <div className={styles.planCard + ' ' + styles.planCardFeatured}>
            <div className={styles.featuredBadge}>MAIS POPULAR</div>
            <div className={styles.planHeader}>
              <h3>Plano PRO</h3>
              <p className={styles.planPrice}>Consultar Valor</p>
            </div>
            <ul className={styles.planFeatures}>
              <li><CheckCircle2 size={16} /> 20 Juris todo mês</li>
              <li><CheckCircle2 size={16} /> Selo PRO de autoridade no perfil</li>
              <li><CheckCircle2 size={16} /> Acesso Ilimitado aos casos da plataforma</li>
              <li><CheckCircle2 size={16} /> Redator IA de Petições Ilimitado</li>
              <li><CheckCircle2 size={16} /> Blindagem de Provas Digitais Inclusa</li>
              <li><CheckCircle2 size={16} /> CRM Jurídico Completo</li>
            </ul>
            <Link href="/cadastro?perfil=advogado" className={styles.planLink}>
              <Button variant="primary" className={styles.planButton}>
                Seja PRO
                <Sparkles size={16} style={{ marginLeft: 8 }} />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className={styles.ctaFooter}>
        <div className={styles.ctaFooterContent}>
          <h2>Pronto para transformar sua advocacia?</h2>
          <p>Junte-se a centenas de advogados que já estão fechando casos no Social Jurídico.</p>
          <Link href="/cadastro?perfil=advogado">
            <Button variant="primary" className={styles.ctaButton}>
              Criar Minha Conta Grátis
              <ArrowRight size={20} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
