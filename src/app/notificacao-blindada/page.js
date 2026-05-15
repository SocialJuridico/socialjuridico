import Link from 'next/link';
import { ArrowRight, ShieldCheck, FileText, MapPin, Lock, CheckCircle2, Zap, Sparkles, Scale, Gavel } from 'lucide-react';
import Button from '@/components/Button';
import styles from './page.module.css';

export const metadata = {
  title: 'Notificação Blindada e Provas Digitais - Social Jurídico',
  description: 'Envie notificações extrajudiciais com geolocalização e proteja provas digitais com hash SHA-512.',
};

export default function NotificacaoBlindadaPage() {
  return (
    <div className={styles.container}>
      {/* HERO SECTION */}
      <section className={styles.hero}>
        {/* Elementos de Fundo (Ouro Velho) */}
        <div className={styles.bgIconLeft}>
          <Scale size={300} strokeWidth={0.5} />
        </div>
        <div className={styles.bgIconRight}>
          <ShieldCheck size={250} strokeWidth={0.5} />
        </div>

        <div className={styles.heroContent}>
          <span className={styles.badge}>TECNOLOGIA JURÍDICA EXCLUSIVA</span>
          <h1 className={styles.title}>
            Notificações e Provas Digitais <br />
            <span className={styles.highlight}>com Validade Jurídica Inquestionável.</span>
          </h1>
          <p className={styles.subtitle}>
            <strong>Redação por IA</strong>, rastreamento geográfico e imutabilidade criptográfica SHA-512. A solução definitiva para garantir a entrega e a validade das suas comunicações.
          </p>
          <div className={styles.ctaWrapper}>
            <Link href="/cadastro?perfil=advogado">
              <Button variant="primary" className={styles.ctaButton}>
                Começar Agora (Grátis)
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="#como-funciona">
              <Button variant="secondary" className={styles.ctaButton}>
                Como Funciona
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* DIFERENCIAL 1: NOTIFICAÇÃO GEO */}
      <section className={styles.section}>
        <div className={styles.bgIconRightSection}>
          <Gavel size={250} strokeWidth={0.5} />
        </div>
        <div className={styles.gridTwoColumns}>
          <div className={styles.textContent}>
            <div className={styles.iconHeader}><MapPin size={32} /></div>
            <h2>Notificação Extrajudicial com Geolocalização</h2>
            <p>
              Esqueça as dúvidas sobre o recebimento de notificações. O Social Jurídico gera um link seguro para o destinatário. Quando ele acessa, o sistema registra:
            </p>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={16} /> Confirmação de leitura em tempo real</li>
              <li><CheckCircle2 size={16} /> Registro de IP e dispositivo</li>
              <li><CheckCircle2 size={16} /> <strong>Geolocalização exata</strong> no momento do acesso</li>
            </ul>
            <p>
              Tudo isso compilado em um relatório com fé técnica para você anexar ao processo ou usar como prova pré-processual.
            </p>
          </div>
          <div className={styles.visualContent}>
            <div className={styles.mockupCard}>
              <div className={styles.mockupHeader}>Certificado de Entrega</div>
              <div className={styles.mockupBody}>
                <p><strong>Status:</strong> Entregue e Lido</p>
                <p><strong>Data:</strong> 15/05/2026 15:20</p>
                <p><strong>Localização:</strong> São Paulo - SP (Lat: -23.55, Long: -46.63)</p>
                <p><strong>IP:</strong> 189.122.XX.XX</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DIFERENCIAL 2: BLINDAGEM SHA-512 */}
      <section className={styles.section + ' ' + styles.bgAlternate}>
        <div className={styles.bgIconLeftSection}>
          <ShieldCheck size={250} strokeWidth={0.5} />
        </div>
        <div className={styles.gridTwoColumns + ' ' + styles.reverse}>
          <div className={styles.textContent}>
            <div className={styles.iconHeader}><ShieldCheck size={32} /></div>
            <h2>Blindagem Digital de Provas (SHA-512)</h2>
            <p>
              Garantir a integridade das provas é o maior desafio na era digital. Com a nossa tecnologia de Blindagem, você pode proteger:
            </p>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={16} /> Prints de conversas e redes sociais</li>
              <li><CheckCircle2 size={16} /> Documentos em PDF e imagens</li>
              <li><CheckCircle2 size={16} /> Contratos e Procurações</li>
            </ul>
            <p>
              O arquivo recebe um hash criptográfico **SHA-512**, gerando uma cadeia de custódia válida para uso judicial que prova que o documento não foi alterado desde a sua criação.
            </p>
          </div>
          <div className={styles.visualContent}>
            <div className={styles.mockupCard + ' ' + styles.goldBorder}>
              <div className={styles.mockupHeader}>Cadeia de Custódia</div>
              <div className={styles.mockupBody}>
                <p><strong>Arquivo:</strong> prova_digital.pdf</p>
                <p style={{ wordBreak: 'break-all' }}><strong>Hash SHA-512:</strong> d04b98f48e8f...8effef4ef8f799b8</p>
                <p><strong>Integridade:</strong> Garantida e Imutável</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Como Funciona na Prática?</h2>
          <p className={styles.sectionSubtitle}>Simples para você, incontestável para a justiça</p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>01</div>
            <h3>Explique os Fatos</h3>
            <p>Forneça os detalhes do caso para nossa IA. Em segundos, ela redige uma minuta jurídica precisa, no tom que você escolher (Conciliador ou Assertivo).</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>02</div>
            <h3>Aprovação e Selagem</h3>
            <p>Revise a minuta e autorize o envio. O sistema gera o hash SHA-512 e prepara o link rastreável com geolocalização.</p>
          </div>

          <div className={styles.stepCard}>
            <div className={styles.stepNumber}>03</div>
            <h3>Envio e Certificação</h3>
            <p>O destinatário recebe a notificação digitalmente. Você recebe um certificado completo com data, hora, IP e localização exata do acesso.</p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className={styles.ctaFooter}>
        <div className={styles.ctaFooterContent}>
          <h2>Pare de perder processos por falta de provas.</h2>
          <p>Cadastre-se hoje e tenha acesso às ferramentas mais avançadas de segurança jurídica do mercado.</p>
          <div className={styles.ctaWrapper}>
            <Link href="/cadastro?perfil=advogado">
              <Button variant="primary" className={styles.ctaButton}>
                Criar Conta Grátis
                <ArrowRight size={20} />
              </Button>
            </Link>
            <Link href="/dashboard/advogado">
              <Button variant="secondary" className={styles.ctaButton}>
                Acessar Área do Advogado
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
