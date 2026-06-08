import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Cookie,
  CreditCard,
  Database,
  Eye,
  FileText,
  Fingerprint,
  Globe2,
  KeyRound,
  LockKeyhole,
  Mail,
  MessagesSquare,
  Scale,
  ServerCog,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import styles from "./Privacy.module.css";

export const metadata = {
  title: "Política de Privacidade",
  description:
    "Consulte como o Social Jurídico coleta, utiliza, armazena, compartilha e protege dados pessoais.",
  alternates: {
    canonical: "/privacidade",
  },
};

const LAST_UPDATED = "08 de junho de 2026";
const DOCUMENT_VERSION = "2.0";

const tableOfContents = [
  {
    id: "apresentacao",
    label: "Apresentação",
  },
  {
    id: "controlador",
    label: "Controlador e contato",
  },
  {
    id: "dados-coletados",
    label: "Dados tratados",
  },
  {
    id: "origem",
    label: "Origem dos dados",
  },
  {
    id: "finalidades",
    label: "Finalidades do tratamento",
  },
  {
    id: "bases-legais",
    label: "Bases legais",
  },
  {
    id: "dados-sensiveis",
    label: "Dados sensíveis e menores",
  },
  {
    id: "casos",
    label: "Publicação de casos",
  },
  {
    id: "compartilhamento",
    label: "Compartilhamento",
  },
  {
    id: "transferencia",
    label: "Transferência internacional",
  },
  {
    id: "cookies",
    label: "Cookies e armazenamento local",
  },
  {
    id: "inteligencia-artificial",
    label: "Inteligência Artificial",
  },
  {
    id: "seguranca",
    label: "Segurança da informação",
  },
  {
    id: "retencao",
    label: "Retenção e exclusão",
  },
  {
    id: "direitos",
    label: "Direitos do titular",
  },
  {
    id: "incidentes",
    label: "Incidentes de segurança",
  },
  {
    id: "alteracoes",
    label: "Alterações desta Política",
  },
  {
    id: "contato",
    label: "Contato",
  },
];

function PrivacySection({
  id,
  number,
  title,
  icon: Icon,
  children,
  important = false,
}) {
  return (
    <section
      id={id}
      className={`${styles.privacySection} ${
        important ? styles.importantSection : ""
      }`}
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.sectionHeader}>
        <div className={styles.sectionIcon} aria-hidden="true">
          <Icon size={22} strokeWidth={1.8} />
        </div>

        <div>
          <span className={styles.sectionNumber}>Seção {number}</span>

          <h2 id={`${id}-title`} className={styles.sectionTitle}>
            {title}
          </h2>
        </div>
      </header>

      <div className={styles.sectionContent}>{children}</div>
    </section>
  );
}

export default function PrivacidadePage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon} aria-hidden="true">
            <ShieldCheck size={31} strokeWidth={1.8} />
          </div>

          <h1 className={styles.pageTitle}>Política de Privacidade</h1>

          <p className={styles.pageDescription}>
            Entenda quais dados são tratados pelo Social Jurídico, para quais
            finalidades eles são utilizados e como você pode exercer seus
            direitos.
          </p>

          <div className={styles.documentMeta}>
            <span>
              <CalendarClock size={16} aria-hidden="true" />
              Atualizada em {LAST_UPDATED}
            </span>

            <span className={styles.metaDivider} aria-hidden="true" />

            <span>
              <FileText size={16} aria-hidden="true" />
              Versão {DOCUMENT_VERSION}
            </span>

            <span className={styles.metaDivider} aria-hidden="true" />

            <span>
              <Clock3 size={16} aria-hidden="true" />
              Leitura aproximada: 12 minutos
            </span>
          </div>

          <div className={styles.relatedLinks}>
            <Link href="/termos">Termos de Uso</Link>

            <Link href="/exclusao-de-dados">Exclusão de dados</Link>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav
            className={styles.tableOfContents}
            aria-label="Seções da Política de Privacidade"
          >
            <h2 className={styles.contentsTitle}>Nesta política</h2>

            <ol className={styles.contentsList}>
              {tableOfContents.map((item, index) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>
                    <span>{index + 1}</span>

                    {item.label}

                    <ChevronRight size={14} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className={styles.document}>
          <div className={styles.summary}>
            <Eye size={22} aria-hidden="true" />

            <div>
              <h2>Resumo de transparência</h2>

              <p>
                O Social Jurídico trata dados para criar contas, publicar casos,
                conectar clientes e advogados, disponibilizar ferramentas
                profissionais, processar pagamentos, enviar comunicações e
                proteger a plataforma.
              </p>
            </div>
          </div>

          <div className={styles.platformIdentification}>
            <h2>Identificação da operação</h2>

            <ul>
              <li>
                <strong>Plataforma:</strong> Social Jurídico
              </li>

              <li>
                <strong>Localidade:</strong> Sorocaba — SP
              </li>

              <li>
                <strong>E-mail de privacidade:</strong>{" "}
                <a href="mailto:socialjuridico3@gmail.com">
                  socialjuridico3@gmail.com
                </a>
              </li>

              <li>
                <strong>CNPJ:</strong> em processo de constituição e
                regularização empresarial.
              </li>
            </ul>
          </div>

          <PrivacySection
            id="apresentacao"
            number="1"
            title="Apresentação e abrangência"
            icon={ShieldCheck}
          >
            <p>
              Esta Política explica como o Social Jurídico trata dados pessoais
              durante o acesso ao site, versão instalável, aplicativos, painéis,
              chats, ferramentas profissionais e demais funcionalidades
              oferecidas.
            </p>

            <p>
              Ela se aplica a clientes, advogados, representantes de
              escritórios, visitantes, contatos e demais pessoas que interajam
              com a plataforma.
            </p>

            <p>
              Ao utilizar os serviços, o usuário declara ter recebido acesso a
              esta Política e aos Termos de Uso.
            </p>
          </PrivacySection>

          <PrivacySection
            id="controlador"
            number="2"
            title="Controlador e canal de privacidade"
            icon={CircleUserRound}
            important
          >
            <div className={styles.platformIdentification}>
              <h2>Identificação da operação</h2>

              <ul>
                <li>
                  <strong>Plataforma:</strong> Social Jurídico
                </li>

                <li>
                  <strong>Localidade:</strong> Sorocaba — SP
                </li>

                <li>
                  <strong>Responsável pelo canal de privacidade:</strong> Carlos
                  Henrique
                </li>

                <li>
                  <strong>E-mail:</strong>{" "}
                  <a href="mailto:socialjuridico3@gmail.com">
                    socialjuridico3@gmail.com
                  </a>
                </li>

                <li>
                  <strong>CNPJ:</strong> em processo de constituição e
                  regularização empresarial.
                </li>
              </ul>
            </div>
          </PrivacySection>

          <PrivacySection
            id="dados-coletados"
            number="3"
            title="Categorias de dados tratados"
            icon={Database}
          >
            <p>
              Os dados tratados variam conforme o tipo de usuário e as
              funcionalidades utilizadas.
            </p>

            <h3>3.1. Dados cadastrais e de identificação</h3>

            <ul>
              <li>nome completo;</li>
              <li>endereço de e-mail;</li>
              <li>telefone, quando solicitado;</li>
              <li>imagem de perfil;</li>
              <li>identificadores internos da conta;</li>
              <li>informações de autenticação e recuperação.</li>
            </ul>

            <h3>3.2. Dados profissionais de advogados</h3>

            <ul>
              <li>número e seccional da OAB;</li>
              <li>áreas de atuação;</li>
              <li>biografia e experiência profissional;</li>
              <li>informações do escritório;</li>
              <li>
                dados e documentos utilizados na verificação profissional;
              </li>
              <li>
                resultado das verificações manuais realizadas por contato e
                consulta ao ConfirmADV.
              </li>
            </ul>

            <h3>3.3. Dados relacionados a casos</h3>

            <ul>
              <li>relatos jurídicos;</li>
              <li>categorias e áreas relacionadas à demanda;</li>
              <li>áudios, vídeos, imagens e documentos;</li>
              <li>informações incluídas pelo próprio cliente;</li>
              <li>manifestações de interesse de advogados;</li>
              <li>histórico de comunicação relacionado ao caso.</li>
            </ul>

            <h3>3.4. Dados de comunicação e atendimento</h3>

            <ul>
              <li>mensagens de chat;</li>
              <li>áudios;</li>
              <li>arquivos enviados;</li>
              <li>
                dados técnicos necessários ao estabelecimento e à manutenção de
                videochamadas;
                <p>
                  As videochamadas são transmitidas em tempo real e não são
                  gravadas ou armazenadas pelo Social Jurídico, salvo se
                  futuramente houver funcionalidade específica, informação
                  prévia e fundamento adequado.
                </p>
              </li>
              <li>solicitações de suporte;</li>
              <li>comunicações administrativas.</li>
            </ul>

            <h3>3.5. Dados técnicos e de segurança</h3>

            <ul>
              <li>endereço IP;</li>
              <li>data e horário de acesso;</li>
              <li>tipo de navegador e dispositivo;</li>
              <li>sistema operacional;</li>
              <li>páginas acessadas;</li>
              <li>eventos de autenticação;</li>
              <li>
                registros técnicos necessários à prevenção de fraude e proteção
                da plataforma.
              </li>
            </ul>

            <h3>3.6. Dados financeiros</h3>

            <ul>
              <li>plano contratado;</li>
              <li>valor, data e estado da cobrança;</li>
              <li>identificador da transação;</li>
              <li>histórico de renovação e cancelamento;</li>
              <li>informações fiscais e de faturamento, quando aplicáveis.</li>
            </ul>

            <p>
              Os dados completos de cartão são processados pelos gateways de
              pagamento e não precisam ser armazenados diretamente pelo Social
              Jurídico.
            </p>
          </PrivacySection>

          <PrivacySection
            id="origem"
            number="4"
            title="Como os dados são obtidos"
            icon={Fingerprint}
          >
            <p>Os dados podem ser obtidos:</p>

            <ul>
              <li>
                diretamente do usuário durante o cadastro e a utilização da
                plataforma;
              </li>

              <li>
                por meio de interações com clientes, advogados, escritórios e
                suporte;
              </li>

              <li>
                automaticamente durante o acesso ao site e aos aplicativos;
              </li>

              <li>
                por meio de gateways, provedores de comunicação e demais
                operadores contratados;
              </li>

              <li>
                em fontes públicas utilizadas para validação profissional ou
                funcionamento do Radar Jurídico;
              </li>

              <li>
                quando outra pessoa inclui informações sobre o titular em um
                caso, documento ou comunicação.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection
            id="finalidades"
            number="5"
            title="Para que os dados são utilizados"
            icon={ServerCog}
          >
            <p>Os dados podem ser utilizados para:</p>

            <ul>
              <li>criar, autenticar e administrar contas;</li>
              <li>verificar informações profissionais;</li>
              <li>permitir a publicação de casos;</li>
              <li>
                disponibilizar casos e oportunidades a advogados elegíveis;
              </li>
              <li>
                permitir manifestações de interesse e comunicação entre
                usuários;
              </li>
              <li>
                operar CRM, agenda, documentos, assinatura e notificações;
              </li>
              <li>oferecer recursos de Inteligência Artificial;</li>
              <li>processar cobranças e assinaturas;</li>
              <li>enviar e-mails transacionais e notificações;</li>
              <li>responder solicitações de atendimento e suporte;</li>
              <li>prevenir fraudes, abusos e acessos não autorizados;</li>
              <li>produzir métricas internas e dados estatísticos;</li>
              <li>cumprir obrigações legais, regulatórias ou judiciais;</li>
              <li>
                exercer direitos em processos administrativos, arbitrais ou
                judiciais.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection
            id="bases-legais"
            number="6"
            title="Bases legais utilizadas"
            icon={Scale}
          >
            <p>
              O tratamento pode se fundamentar, conforme a finalidade e o
              contexto, em:
            </p>

            <ul>
              <li>
                execução de contrato ou de procedimentos relacionados à
                contratação;
              </li>
              <li>cumprimento de obrigação legal ou regulatória;</li>
              <li>exercício regular de direitos;</li>
              <li>
                legítimo interesse, após avaliação de necessidade e impacto
                sobre os titulares;
              </li>
              <li>prevenção de fraude e segurança;</li>
              <li>consentimento, quando exigido ou adequado;</li>
              <li>
                proteção da vida ou da integridade física, em situações
                excepcionais;
              </li>
              <li>outras hipóteses autorizadas pela legislação.</li>
            </ul>

            <p>
              Quando o tratamento depender de consentimento, o titular poderá
              revogá-lo, sem afetar tratamentos anteriores realizados de forma
              legítima.
            </p>
          </PrivacySection>

          <PrivacySection
            id="dados-sensiveis"
            number="7"
            title="Dados sensíveis e dados de menores"
            icon={UserCheck}
            important
          >
            <p>
              Relatos jurídicos podem revelar dados pessoais sensíveis,
              incluindo informações de saúde, origem racial, religião, vida
              sexual, dados biométricos ou outras informações protegidas.
            </p>

            <div className={styles.warningBox}>
              <AlertTriangle size={19} aria-hidden="true" />

              <p>
                O usuário deve enviar somente informações estritamente
                necessárias e evitar dados sensíveis quando eles não forem
                indispensáveis ao atendimento.
              </p>
            </div>

            <p>
              O tratamento de dados sensíveis será limitado às finalidades
              necessárias à prestação do serviço, ao exercício de direitos e às
              demais hipóteses autorizadas pela legislação.
            </p>

            <p>
              A plataforma é destinada prioritariamente a pessoas com capacidade
              civil. Dados de crianças e adolescentes somente devem ser enviados
              por responsáveis legais ou quando houver fundamento adequado e
              necessidade relacionada ao caso.
            </p>
          </PrivacySection>

          <PrivacySection
            id="casos"
            number="8"
            title="Visibilidade e compartilhamento de casos"
            icon={Eye}
          >
            <p>
              Casos publicados podem ser apresentados a advogados cadastrados ou
              elegíveis para que avaliem a possibilidade de manifestação de
              interesse.
            </p>

            <ul>
              <li>
                O cliente não deve publicar dados de contato, senhas, dados
                bancários ou documentos completos na descrição inicial.
              </li>

              <li>
                A plataforma poderá ocultar informações que representem risco de
                exposição indevida.
              </li>

              <li>
                Informações adicionais podem ser compartilhadas posteriormente
                no ambiente de atendimento.
              </li>

              <li>
                Advogados devem utilizar os dados exclusivamente para a
                finalidade profissional relacionada ao caso.
              </li>

              <li>
                O Social Jurídico não controla cópias que tenham sido
                legitimamente baixadas ou armazenadas por usuários durante uma
                relação profissional.
              </li>
            </ul>
          </PrivacySection>

          <PrivacySection
            id="compartilhamento"
            number="9"
            title="Compartilhamento com terceiros"
            icon={Users}
          >
            <p>
              Dados podem ser compartilhados somente quando necessário à
              operação dos serviços, à segurança, à contratação ou ao
              cumprimento de obrigações.
            </p>

            <h3>9.1. Clientes e advogados</h3>

            <p>
              Informações podem ser compartilhadas entre usuários para permitir
              publicação de casos, manifestação de interesse, atendimento e
              contratação direta.
            </p>

            <h3>9.2. Prestadores e operadores</h3>

            <p>A plataforma pode utilizar fornecedores como:</p>

            <ul>
              <li>
                <strong>Supabase:</strong> autenticação, banco de dados,
                armazenamento e recursos em tempo real;
              </li>

              <li>
                <strong>Resend:</strong> envio de e-mails transacionais;
              </li>

              <li>
                <strong>OneSignal:</strong> notificações push, mediante
                configuração e permissão do usuário;
              </li>

              <li>
                <strong>Stripe e InfinitePay:</strong> processamento de
                pagamentos;
              </li>

              <li>
                <strong>OpenAI e outros provedores de IA:</strong> processamento
                de solicitações relacionadas às ferramentas de Inteligência
                Artificial;
              </li>

              <li>
                provedores de hospedagem, armazenamento, CDN, segurança, logs e
                infraestrutura;
              </li>

              <li>serviços de validação profissional, como o ConfirmADV.</li>
            </ul>

            <p>
              Os fornecedores podem ser substituídos ou ampliados conforme a
              evolução tecnológica e operacional da plataforma.
            </p>

            <h3>9.3. Autoridades e obrigações legais</h3>

            <p>
              Dados poderão ser apresentados a autoridades, tribunais ou órgãos
              públicos quando houver obrigação legal, ordem válida ou
              necessidade de exercício regular de direitos.
            </p>

            <p>
              O Social Jurídico não vende dados pessoais ou listas de contato
              para publicidade de terceiros.
            </p>
          </PrivacySection>

          <PrivacySection
            id="transferencia"
            number="10"
            title="Transferência internacional de dados"
            icon={Globe2}
          >
            <p>
              Alguns fornecedores de tecnologia podem armazenar ou processar
              dados em outros países.
            </p>

            <p>
              Nessas situações, o Social Jurídico buscará utilizar fornecedores
              com medidas contratuais, organizacionais e técnicas compatíveis
              com a proteção dos dados pessoais.
            </p>

            <p>
              A localização efetiva do processamento pode variar conforme o
              serviço, a infraestrutura e as configurações do fornecedor
              utilizado.
            </p>
            <p>
              A infraestrutura principal de banco de dados e armazenamento
              utiliza o Supabase, atualmente configurado em região localizada
              nas Américas, incluindo infraestrutura associada à região de São
              Paulo, Brasil, conforme a configuração contratada e a
              disponibilidade do provedor.
            </p>
          </PrivacySection>

          <PrivacySection
            id="cookies"
            number="11"
            title="Cookies, armazenamento local e notificações"
            icon={Cookie}
          >
            <p>
              A plataforma pode utilizar cookies, armazenamento local e
              tecnologias semelhantes para:
            </p>

            <ul>
              <li>manter a sessão autenticada;</li>
              <li>proteger a conta e prevenir fraudes;</li>
              <li>guardar preferências básicas;</li>
              <li>permitir funcionamento da PWA;</li>
              <li>lembrar escolhas relacionadas à instalação do aplicativo;</li>
              <li>registrar métricas de acesso;</li>
              <li>disponibilizar notificações push, quando autorizadas.</li>
            </ul>

            <h3>11.1. Tecnologias essenciais</h3>

            <p>
              Tecnologias essenciais são necessárias para autenticação,
              segurança e funcionamento da plataforma. O bloqueio pelo navegador
              pode impedir ou limitar determinadas funcionalidades.
            </p>

            <h3>11.2. Notificações</h3>

            <p>
              Notificações push dependem de autorização no dispositivo ou
              navegador e podem ser desativadas nas configurações
              correspondentes.
            </p>

            <div className={styles.infoBox}>
              <Bell size={18} aria-hidden="true" />

              <p>
                A instalação da PWA não concede automaticamente permissão para
                notificações.
              </p>
            </div>
          </PrivacySection>

          <PrivacySection
            id="inteligencia-artificial"
            number="12"
            title="Inteligência Artificial e tratamento automatizado"
            icon={Bot}
            important
          >
            <p>
              Nas funcionalidades que utilizam provedores de Inteligência
              Artificial, são enviados apenas os textos inseridos pelo usuário
              ou necessários à execução da solicitação.
            </p>

            <p>
              O Social Jurídico orienta que não sejam inseridos dados pessoais
              sensíveis, documentos completos, senhas, informações bancárias ou
              outros dados desnecessários nas ferramentas de IA.
            </p>

            <p>
              Embora a plataforma adote medidas para reduzir o envio de dados
              desnecessários, o usuário é responsável pelo conteúdo que decidir
              inserir nos campos destinados à Inteligência Artificial.
            </p>

            <ul>
              <li>
                O usuário deve evitar incluir dados pessoais excessivos ou
                desnecessários.
              </li>

              <li>As respostas podem conter erros, imprecisões ou omissões.</li>

              <li>A IA não substitui análise jurídica profissional.</li>

              <li>Documentos devem ser revisados antes da utilização.</li>

              <li>
                O advogado é responsável pelo conteúdo que decidir utilizar,
                assinar ou protocolar.
              </li>
            </ul>

            <p>
              A plataforma poderá realizar classificações, recomendações ou
              análises automatizadas para organização de casos, oportunidades,
              segurança e funcionamento dos recursos.
            </p>

            <p>
              Quando aplicável, o titular poderá solicitar informações ou
              revisão sobre decisões tomadas exclusivamente por processamento
              automatizado.
            </p>
          </PrivacySection>

          <PrivacySection
            id="seguranca"
            number="13"
            title="Segurança da informação"
            icon={LockKeyhole}
          >
            <p>
              O Social Jurídico adota medidas técnicas e organizacionais para
              reduzir riscos de acesso não autorizado, alteração, perda ou
              divulgação indevida.
            </p>

            <ul>
              <li>comunicação protegida por HTTPS;</li>
              <li>autenticação e controle de acesso;</li>
              <li>restrições por perfil e função;</li>
              <li>políticas de acesso ao banco e aos arquivos;</li>
              <li>registros técnicos e monitoramento;</li>
              <li>atualizações e medidas de segurança de infraestrutura;</li>
              <li>procedimentos para prevenção e resposta a incidentes.</li>
            </ul>

            <p>
              Nenhum sistema conectado à internet é completamente imune a
              riscos. O usuário também deve proteger suas credenciais,
              dispositivos e canais de acesso.
            </p>
          </PrivacySection>

          <PrivacySection
            id="retencao"
            number="14"
            title="Retenção, anonimização e exclusão"
            icon={Clock3}
          >
            <p>
              Os dados são mantidos pelo período necessário às finalidades
              descritas nesta Política, à execução dos serviços, à segurança, ao
              cumprimento de obrigações e ao exercício regular de direitos.
            </p>

            <h3>14.1. Conta ativa</h3>

            <p>
              Enquanto a conta estiver ativa, poderão ser mantidos dados
              cadastrais, casos, mensagens, documentos, registros profissionais,
              informações financeiras e históricos necessários ao funcionamento.
            </p>

            <h3>14.2. Solicitação de exclusão</h3>

            <p>
              Após pedido válido e confirmação de identidade, dados que não
              precisem ser conservados serão eliminados ou anonimizados em prazo
              operacional razoável, preferencialmente em até 30 dias.
            </p>

            <h3>14.3. Backups</h3>

            <p>
              Cópias residuais poderão permanecer em backups de segurança por
              até 180 dias, com acesso restrito e sem utilização ordinária para
              novas finalidades.
            </p>

            <h3>14.4. Conservação necessária</h3>

            <p>
              Determinados dados poderão ser mantidos quando necessários para:
            </p>

            <ul>
              <li>cumprimento de obrigação legal;</li>
              <li>registros financeiros e fiscais;</li>
              <li>prevenção e investigação de fraude;</li>
              <li>segurança da plataforma;</li>
              <li>exercício regular de direitos em processos;</li>
              <li>cumprimento de determinações de autoridades.</li>
            </ul>

            <p>
              A exclusão da conta não garante a remoção de documentos ou
              informações legitimamente mantidos por outro usuário em razão de
              relação profissional independente.
            </p>

            <Link href="/exclusao-de-dados" className={styles.inlineLink}>
              Solicitar exclusão de dados
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </PrivacySection>

          <PrivacySection
            id="direitos"
            number="15"
            title="Direitos dos titulares"
            icon={KeyRound}
            important
          >
            <p>
              Nos casos e condições previstos na legislação, o titular poderá
              solicitar:
            </p>

            <ul>
              <li>confirmação da existência de tratamento;</li>
              <li>acesso aos dados pessoais;</li>
              <li>
                correção de dados incompletos, inexatos ou desatualizados;
              </li>
              <li>
                anonimização, bloqueio ou eliminação de dados desnecessários ou
                tratados irregularmente;
              </li>
              <li>
                portabilidade dos dados, observadas a regulamentação aplicável,
                a viabilidade técnica e a implementação dos mecanismos
                necessários;
                <p>
                  O recurso automatizado de exportação e portabilidade ainda
                  está em desenvolvimento. Enquanto não estiver disponível no
                  painel, o titular poderá encaminhar a solicitação pelo canal
                  de privacidade, para análise e atendimento conforme a
                  legislação e a capacidade técnica existente.
                </p>
              </li>
              <li>
                informação sobre entidades com as quais houve compartilhamento;
              </li>
              <li>
                informação sobre a possibilidade de não fornecer consentimento;
              </li>
              <li>revogação do consentimento;</li>
              <li>
                eliminação de dados tratados com consentimento, ressalvadas
                hipóteses de conservação;
              </li>
              <li>oposição ao tratamento, quando aplicável;</li>
              <li>
                revisão de decisões exclusivamente automatizadas, quando
                aplicável;
              </li>
              <li>petição perante a autoridade competente.</li>
            </ul>

            <p>
              Para proteger o titular, o atendimento poderá exigir confirmação
              de identidade e informações necessárias à localização da conta.
            </p>

            <p>
              O exercício dos direitos é gratuito, salvo situações excepcionais
              previstas em lei.
            </p>

            <div className={styles.contactActions}>
              <a
                href="mailto:socialjuridico3@gmail.com"
                className={styles.primaryLink}
              >
                Solicitar atendimento de privacidade
                <Mail size={16} aria-hidden="true" />
              </a>

              <Link href="/exclusao-de-dados" className={styles.secondaryLink}>
                Exclusão de dados
              </Link>
            </div>
          </PrivacySection>

          <PrivacySection
            id="incidentes"
            number="16"
            title="Incidentes de segurança"
            icon={AlertTriangle}
          >
            <p>
              Caso seja identificado incidente de segurança envolvendo dados
              pessoais, o Social Jurídico adotará medidas para analisar, conter
              e reduzir seus efeitos.
            </p>

            <p>
              Quando exigido, os titulares afetados e as autoridades competentes
              poderão ser comunicados conforme o risco, a natureza dos dados e
              as regras aplicáveis.
            </p>

            <p>
              Suspeitas de acesso indevido, vazamento ou uso irregular podem ser
              comunicadas imediatamente pelo e-mail oficial.
            </p>
          </PrivacySection>

          <PrivacySection
            id="alteracoes"
            number="17"
            title="Alterações desta Política"
            icon={Sparkles}
          >
            <p>
              Esta Política poderá ser atualizada para refletir mudanças na
              plataforma, nos fornecedores, na operação ou nas regras
              aplicáveis.
            </p>

            <p>
              A versão e a data da última atualização permanecerão disponíveis
              no início da página.
            </p>

            <p>
              Alterações relevantes poderão ser comunicadas por e-mail,
              notificação ou aviso dentro da plataforma.
            </p>
          </PrivacySection>

          <PrivacySection
            id="contato"
            number="18"
            title="Contato e solicitações"
            icon={Mail}
          >
            <p>
              Solicitações, dúvidas ou reclamações relacionadas ao tratamento de
              dados pessoais podem ser encaminhadas pelos canais oficiais.
            </p>

            <ul>
              <li>
                <strong>E-mail:</strong>{" "}
                <a
                  href="mailto:socialjuridico3@gmail.com"
                  className={styles.textLink}
                >
                  socialjuridico3@gmail.com
                </a>
              </li>

              <li>
                <strong>Localidade:</strong> Sorocaba — SP
              </li>

              <li>
                <strong>Central:</strong>{" "}
                <Link href="/contato" className={styles.textLink}>
                  página de contato
                </Link>
              </li>
            </ul>

            <div className={styles.contactActions}>
              <Link href="/contato" className={styles.primaryLink}>
                Acessar central de contato
                <ChevronRight size={16} aria-hidden="true" />
              </Link>

              <Link href="/termos" className={styles.secondaryLink}>
                Termos de Uso
              </Link>
            </div>
          </PrivacySection>

          <footer className={styles.documentFooter}>
            <CheckCircle2 size={20} aria-hidden="true" />

            <div>
              <strong>Fim da Política de Privacidade</strong>

              <p>
                Versão {DOCUMENT_VERSION} — atualizada em {LAST_UPDATED}.
              </p>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}
