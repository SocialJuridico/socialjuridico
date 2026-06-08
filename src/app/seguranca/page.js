import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Cloud,
  Database,
  FileKey2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Mail,
  Network,
  RefreshCcw,
  ServerCog,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

import styles from "./Seguranca.module.css";

export const metadata = {
  title: "Segurança e Tecnologia",
  description:
    "Conheça as medidas de segurança, autenticação, proteção de dados e prevenção a fraudes adotadas pelo Social Jurídico.",
  alternates: {
    canonical: "/seguranca",
  },
  openGraph: {
    title: "Segurança e Tecnologia | Social Jurídico",
    description:
      "Entenda como o Social Jurídico protege contas, dados, documentos e comunicações.",
    url: "/seguranca",
    type: "website",
  },
};

const securityPillars = [
  {
    title: "Autenticação e controle de acesso",
    description:
      "Contas, sessões e permissões são organizadas conforme o perfil e as funcionalidades disponíveis para cada usuário.",
    icon: KeyRound,
  },
  {
    title: "Comunicação protegida",
    description:
      "O acesso à plataforma utiliza HTTPS para proteger a transmissão das informações entre o dispositivo e os serviços utilizados.",
    icon: LockKeyhole,
  },
  {
    title: "Banco de dados e armazenamento",
    description:
      "Dados e arquivos são armazenados em infraestrutura gerenciada, com regras de acesso e políticas específicas para cada recurso.",
    icon: Database,
  },
  {
    title: "Verificação profissional",
    description:
      "O cadastro de advogados passa por análise manual, contato com o profissional e consulta ao ConfirmADV.",
    icon: UserCheck,
  },
  {
    title: "Proteção de infraestrutura",
    description:
      "A plataforma utiliza camadas de rede, firewall, monitoramento e serviços de proteção para reduzir acessos maliciosos.",
    icon: Network,
  },
  {
    title: "Logs e prevenção a fraudes",
    description:
      "Eventos técnicos e de autenticação podem ser registrados para investigar atividades suspeitas e proteger os usuários.",
    icon: Fingerprint,
  },
];

const userResponsibilities = [
  "Utilize uma senha forte e exclusiva.",
  "Não compartilhe códigos de acesso ou links de autenticação.",
  "Evite acessar sua conta em dispositivos públicos ou desconhecidos.",
  "Confira o endereço do site antes de informar suas credenciais.",
  "Não envie senhas, dados bancários ou códigos de segurança pelo chat.",
  "Comunique imediatamente qualquer atividade suspeita.",
];

export default function SegurancaPage() {
  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        aria-labelledby="security-title"
      >
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroContent}>
          <div className={styles.heroIcon} aria-hidden="true">
            <ShieldCheck size={31} strokeWidth={1.8} />
          </div>

          <h1 id="security-title" className={styles.title}>
            Segurança construída em
            <span className={styles.highlight}>
              {" "}
              diferentes camadas.
            </span>
          </h1>

          <p className={styles.subtitle}>
            O Social Jurídico combina autenticação, controle de acesso,
            proteção de infraestrutura e práticas operacionais para reduzir
            riscos e proteger contas, dados e documentos.
          </p>

          <div className={styles.heroTrust}>
            <span>
              <BadgeCheck size={16} aria-hidden="true" />
              Verificação profissional
            </span>

            <span className={styles.trustDivider} aria-hidden="true" />

            <span>
              <LockKeyhole size={16} aria-hidden="true" />
              Comunicação protegida por HTTPS
            </span>
          </div>
        </div>
      </section>

      <section
        className={styles.pillarsSection}
        aria-labelledby="pillars-title"
      >
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>
            Proteção da plataforma
          </span>

          <h2 id="pillars-title">
            Medidas aplicadas ao funcionamento do Social Jurídico
          </h2>

          <p>
            Segurança não depende de uma única tecnologia. Ela exige
            controles técnicos, processos internos e participação dos
            próprios usuários.
          </p>
        </header>

        <div className={styles.pillarsGrid}>
          {securityPillars.map((pillar) => {
            const Icon = pillar.icon;

            return (
              <article
                className={styles.pillarCard}
                key={pillar.title}
              >
                <div className={styles.pillarIcon} aria-hidden="true">
                  <Icon size={24} strokeWidth={1.8} />
                </div>

                <h3>{pillar.title}</h3>

                <p>{pillar.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        className={styles.architectureSection}
        aria-labelledby="architecture-title"
      >
        <div className={styles.architectureGrid}>
          <div className={styles.architectureContent}>
            <span className={styles.eyebrow}>
              Infraestrutura
            </span>

            <h2 id="architecture-title">
              Serviços especializados para cada camada da operação
            </h2>

            <p>
              A plataforma utiliza fornecedores e tecnologias diferentes
              para autenticação, banco de dados, armazenamento, pagamentos,
              comunicação e proteção de rede.
            </p>

            <div className={styles.architectureItems}>
              <div className={styles.architectureItem}>
                <Cloud size={21} aria-hidden="true" />

                <div>
                  <strong>Proteção de rede</strong>

                  <span>
                    CDN, firewall e mitigação de tráfego malicioso.
                  </span>
                </div>
              </div>

              <div className={styles.architectureItem}>
                <Database size={21} aria-hidden="true" />

                <div>
                  <strong>Dados e autenticação</strong>

                  <span>
                    Infraestrutura gerenciada pelo Supabase, com banco,
                    autenticação e armazenamento.
                  </span>
                </div>
              </div>

              <div className={styles.architectureItem}>
                <ServerCog size={21} aria-hidden="true" />

                <div>
                  <strong>Aplicação e serviços</strong>

                  <span>
                    APIs, validações e controles executados no ambiente
                    servidor.
                  </span>
                </div>
              </div>

              <div className={styles.architectureItem}>
                <RefreshCcw size={21} aria-hidden="true" />

                <div>
                  <strong>Atualizações contínuas</strong>

                  <span>
                    Correções e melhorias podem ser aplicadas conforme
                    novos riscos são identificados.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.architectureVisual}>
            <div className={styles.securityLayer}>
              <span>Camada 01</span>

              <strong>Usuário e autenticação</strong>
            </div>

            <div className={styles.layerConnector} aria-hidden="true" />

            <div className={styles.securityLayer}>
              <span>Camada 02</span>

              <strong>Aplicação e permissões</strong>
            </div>

            <div className={styles.layerConnector} aria-hidden="true" />

            <div className={styles.securityLayer}>
              <span>Camada 03</span>

              <strong>Dados e armazenamento</strong>
            </div>

            <div className={styles.layerConnector} aria-hidden="true" />

            <div className={styles.securityLayer}>
              <span>Camada 04</span>

              <strong>Rede e infraestrutura</strong>
            </div>
          </div>
        </div>
      </section>

      <section
        className={styles.dataSection}
        aria-labelledby="data-security-title"
      >
        <header className={styles.sectionHeader}>
          <span className={styles.eyebrow}>
            Dados e documentos
          </span>

          <h2 id="data-security-title">
            Proteção proporcional à finalidade de cada informação
          </h2>
        </header>

        <div className={styles.dataGrid}>
          <article className={styles.dataCard}>
            <FileKey2 size={26} aria-hidden="true" />

            <h3>Senhas</h3>

            <p>
              Senhas não devem ser armazenadas de forma legível. O processo
              de autenticação é realizado pelo provedor responsável pela
              identidade dos usuários.
            </p>
          </article>

          <article className={styles.dataCard}>
            <Database size={26} aria-hidden="true" />

            <h3>Dados cadastrais</h3>

            <p>
              Informações de contas são acessadas somente conforme a
              finalidade, a função do usuário e as regras da aplicação.
            </p>
          </article>

          <article className={styles.dataCard}>
            <FileKey2 size={26} aria-hidden="true" />

            <h3>Arquivos e documentos</h3>

            <p>
              O acesso aos arquivos pode depender de autenticação, vínculo
              com o atendimento e políticas específicas de armazenamento.
            </p>
          </article>

          <article className={styles.dataCard}>
            <Fingerprint size={26} aria-hidden="true" />

            <h3>Registros técnicos</h3>

            <p>
              Logs podem ser usados para segurança, investigação de
              incidentes, prevenção a fraude e exercício de direitos.
            </p>
          </article>
        </div>

        <div className={styles.dataNotice}>
          <AlertTriangle size={19} aria-hidden="true" />

          <p>
            Nenhum sistema conectado à internet é completamente imune a
            riscos. As medidas adotadas reduzem a probabilidade e o impacto
            de incidentes, mas não permitem prometer segurança absoluta.
          </p>
        </div>
      </section>

      <section
        className={styles.verificationSection}
        aria-labelledby="verification-title"
      >
        <div className={styles.verificationContent}>
          <div className={styles.verificationIcon} aria-hidden="true">
            <UserCheck size={28} strokeWidth={1.8} />
          </div>

          <div>
            <span className={styles.eyebrow}>
              Verificação de advogados
            </span>

            <h2 id="verification-title">
              Confirmação profissional realizada manualmente
            </h2>

            <p>
              O cadastro de advogados pode passar por contato direto com o
              profissional e consulta ao ConfirmADV, utilizando nome,
              número de inscrição e seccional da OAB.
            </p>

            <p>
              Essa verificação busca confirmar os dados profissionais
              disponíveis no momento da análise. Ela não representa
              garantia de especialização, qualidade, conduta ou resultado
              do serviço jurídico.
            </p>
          </div>
        </div>

        <div className={styles.verificationChecks}>
          <span>
            <CheckCircle2 size={17} aria-hidden="true" />
            Conferência de nome e inscrição
          </span>

          <span>
            <CheckCircle2 size={17} aria-hidden="true" />
            Consulta ao ConfirmADV
          </span>

          <span>
            <CheckCircle2 size={17} aria-hidden="true" />
            Contato direto quando necessário
          </span>

          <span>
            <CheckCircle2 size={17} aria-hidden="true" />
            Possibilidade de bloqueio em caso de divergência
          </span>
        </div>
      </section>

      <section
        className={styles.userSection}
        aria-labelledby="user-security-title"
      >
        <div className={styles.userGrid}>
          <div className={styles.userHeading}>
            <span className={styles.eyebrow}>
              Sua participação
            </span>

            <h2 id="user-security-title">
              Segurança também depende de boas práticas do usuário
            </h2>

            <p>
              Mesmo com controles técnicos, uma conta pode ser exposta por
              compartilhamento de senha, dispositivos comprometidos ou
              mensagens fraudulentas.
            </p>
          </div>

          <div className={styles.userChecklist}>
            {userResponsibilities.map((item) => (
              <div className={styles.checkItem} key={item}>
                <CheckCircle2 size={17} aria-hidden="true" />

                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={styles.incidentSection}
        aria-labelledby="incident-title"
      >
        <div className={styles.incidentContent}>
          <div className={styles.incidentIcon} aria-hidden="true">
            <AlertTriangle size={27} strokeWidth={1.8} />
          </div>

          <div>
            <span className={styles.eyebrow}>
              Atividade suspeita
            </span>

            <h2 id="incident-title">
              Identificou um problema de segurança?
            </h2>

            <p>
              Informe acessos desconhecidos, tentativas de fraude,
              mensagens suspeitas, exposição de dados ou comportamento
              irregular dentro da plataforma.
            </p>
          </div>
        </div>

        <div className={styles.incidentActions}>
          <a
            href="mailto:socialjuridico3@gmail.com?subject=%5BSEGURAN%C3%87A%5D%20Relato%20de%20incidente"
            className={styles.primaryAction}
          >
            Comunicar por e-mail
            <Mail size={18} aria-hidden="true" />
          </a>

          <Link
            href="/contato"
            className={styles.secondaryAction}
          >
            Acessar central de contato
          </Link>
        </div>
      </section>

      <section
        className={styles.ctaSection}
        aria-labelledby="security-cta-title"
      >
        <div className={styles.ctaContent}>
          <h2 id="security-cta-title">
            Transparência também faz parte da segurança
          </h2>

          <p>
            Consulte os documentos que explicam como os dados são
            utilizados, protegidos, conservados e excluídos.
          </p>

          <div className={styles.ctaActions}>
            <Link
              href="/privacidade"
              className={styles.primaryAction}
            >
              Política de Privacidade
              <ArrowRight size={18} aria-hidden="true" />
            </Link>

            <Link
              href="/exclusao-de-dados"
              className={styles.secondaryAction}
            >
              Exclusão de dados
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}