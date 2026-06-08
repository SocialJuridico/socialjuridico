import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Database,
  FileSignature,
  FileText,
  Gavel,
  KeyRound,
  Landmark,
  Mail,
  MessageSquareMore,
  Radar,
  Scale,
  ScrollText,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

import styles from "./Legal.module.css";

export const metadata = {
  title: "Termos de Uso",
  description:
    "Consulte os Termos de Uso aplicáveis à plataforma Social Jurídico.",
  alternates: {
    canonical: "/termos",
  },
};

const LAST_UPDATED = "08 de junho de 2026";
const DOCUMENT_VERSION = "2.0";

const tableOfContents = [
  { id: "aceitacao", label: "Aceitação dos Termos" },
  { id: "definicoes", label: "Definições" },
  { id: "natureza", label: "Natureza da plataforma" },
  { id: "cadastro", label: "Cadastro e elegibilidade" },
  { id: "seguranca-conta", label: "Segurança da conta" },
  { id: "casos", label: "Publicação de casos" },
  { id: "advogados", label: "Uso por advogados" },
  { id: "radar", label: "Radar Jurídico" },
  { id: "comunicacao", label: "Comunicação e contratação" },
  { id: "planos", label: "Planos e pagamentos" },
  { id: "cancelamento", label: "Cancelamento" },
  { id: "ia", label: "Inteligência Artificial" },
  { id: "conteudo", label: "Conteúdo do usuário" },
  { id: "documentos", label: "Documentos e assinatura" },
  { id: "notificacao", label: "Notificação Extrajudicial" },
  { id: "condutas", label: "Condutas proibidas" },
  { id: "propriedade", label: "Propriedade intelectual" },
  { id: "suspensao", label: "Suspensão e encerramento" },
  { id: "privacidade", label: "Privacidade e dados pessoais" },
  { id: "disponibilidade", label: "Disponibilidade do serviço" },
  { id: "responsabilidade", label: "Responsabilidades" },
  { id: "alteracoes", label: "Alterações dos Termos" },
  { id: "legislacao", label: "Legislação e foro" },
  { id: "contato", label: "Contato" },
  { id: "retencao", label: "Retenção e exclusão de dados" },
];

function LegalSection({
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
      className={`${styles.legalSection} ${
        important ? styles.importantSection : ""
      }`}
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.sectionHeader}>
        <div className={styles.sectionIcon} aria-hidden="true">
          <Icon size={22} strokeWidth={1.8} />
        </div>

        <div>
          <span className={styles.sectionNumber}>Cláusula {number}</span>

          <h2 id={`${id}-title`} className={styles.sectionTitle}>
            {title}
          </h2>
        </div>
      </header>

      <div className={styles.sectionContent}>{children}</div>
    </section>
  );
}

export default function TermosPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon} aria-hidden="true">
            <ScrollText size={30} strokeWidth={1.8} />
          </div>

          <h1 className={styles.pageTitle}>Termos de Uso</h1>

          <p className={styles.pageDescription}>
            Este documento apresenta as regras aplicáveis ao acesso e à
            utilização da plataforma Social Jurídico por clientes, advogados e
            demais usuários.
          </p>

          <div className={styles.documentMeta}>
            <span>
              <CalendarClock size={16} aria-hidden="true" />
              Atualizado em {LAST_UPDATED}
            </span>

            <span className={styles.metaDivider} aria-hidden="true" />

            <span>
              <FileText size={16} aria-hidden="true" />
              Versão {DOCUMENT_VERSION}
            </span>

            <span className={styles.metaDivider} aria-hidden="true" />

            <span>
              <Clock3 size={16} aria-hidden="true" />
              Leitura aproximada: 15 minutos
            </span>
          </div>
          <div className={styles.platformIdentification}>
            <h2>Identificação da plataforma</h2>

            <p>
              O Social Jurídico é uma plataforma tecnológica atualmente operada
              a partir de Sorocaba, Estado de São Paulo.
            </p>

            <ul>
              <li>
                <strong>Nome da plataforma:</strong> Social Jurídico
              </li>

              <li>
                <strong>Localidade:</strong> Sorocaba — SP
              </li>

              <li>
                <strong>E-mail de contato:</strong>{" "}
                <a href="mailto:socialjuridico3@gmail.com">
                  socialjuridico3@gmail.com
                </a>
              </li>

              {/* <li>
      <strong>CNPJ:</strong> em processo de constituição e regularização
      empresarial.
    </li> */}
            </ul>
          </div>

          <div className={styles.relatedLinks}>
            <Link href="/privacidade">Política de Privacidade</Link>

            <Link href="/exclusao-de-dados">Exclusão de dados</Link>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav
            className={styles.tableOfContents}
            aria-label="Seções dos Termos de Uso"
          >
            <h2 className={styles.contentsTitle}>Neste documento</h2>

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
          <div className={styles.introduction}>
            <ShieldCheck size={22} aria-hidden="true" />

            <div>
              <h2>Antes de continuar</h2>

              <p>
                Ao criar uma conta, publicar um caso, contratar um plano ou
                utilizar qualquer funcionalidade do Social Jurídico, você
                declara que leu e concordou com estes Termos de Uso e com a
                Política de Privacidade.
              </p>
            </div>
          </div>

          <LegalSection
            id="aceitacao"
            number="1"
            title="Aceitação dos Termos"
            icon={Scale}
          >
            <p>
              Estes Termos regulam o acesso e a utilização do Social Jurídico,
              incluindo o site, a versão instalável, os aplicativos, painéis,
              ferramentas e demais serviços disponibilizados pela plataforma.
            </p>

            <p>
              Caso o usuário não concorde com qualquer disposição deste
              documento, deverá interromper a utilização da plataforma e não
              concluir o cadastro.
            </p>
          </LegalSection>

          <LegalSection
            id="definicoes"
            number="2"
            title="Definições"
            icon={FileText}
          >
            <ul>
              <li>
                <strong>Plataforma:</strong> ambiente tecnológico identificado
                pela marca Social Jurídico.
              </li>

              <li>
                <strong>Cliente:</strong> pessoa que utiliza a plataforma para
                publicar uma demanda e conversar com advogados.
              </li>

              <li>
                <strong>Advogado:</strong> profissional que se cadastra para
                acessar oportunidades e ferramentas profissionais.
              </li>

              <li>
                <strong>Caso:</strong> relato ou demanda publicada por um
                cliente.
              </li>

              <li>
                <strong>Manifestação de interesse:</strong> ação pela qual um
                advogado informa que deseja iniciar uma conversa sobre
                determinado caso.
              </li>

              <li>
                <strong>Radar Jurídico:</strong> módulo que organiza
                oportunidades jurídicas disponibilizadas aos advogados, de
                acordo com as regras e limites aplicáveis.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="natureza"
            number="3"
            title="Natureza da plataforma"
            icon={Users}
            important
          >
            <p>
              O Social Jurídico é uma plataforma de tecnologia que facilita o
              contato e a comunicação entre clientes e advogados.
            </p>

            <ul>
              <li>
                O Social Jurídico não é escritório de advocacia e não presta
                consultoria, assessoria ou representação jurídica.
              </li>

              <li>
                A plataforma não escolhe o advogado pelo cliente, não determina
                honorários e não participa da contratação do serviço jurídico.
              </li>

              <li>
                A manifestação de interesse não representa contratação, garantia
                de atendimento ou formação automática de relação profissional.
              </li>

              <li>
                Cliente e advogado são responsáveis por avaliar livremente se
                desejam iniciar ou manter uma relação contratual.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="cadastro"
            number="4"
            title="Cadastro e elegibilidade"
            icon={UserCheck}
          >
            <p>
              Algumas funcionalidades exigem a criação de uma conta com
              informações verdadeiras, completas e atualizadas.
            </p>

            <ul>
              <li>
                Clientes devem possuir capacidade civil para utilizar os
                serviços ou estar devidamente representados.
              </li>

              <li>
                <strong>Advogados:</strong> devem informar nome completo, número
                de inscrição e seccional da Ordem dos Advogados do Brasil, além
                dos demais dados profissionais solicitados.
              </li>

              <li>
                A verificação da condição profissional é realizada manualmente
                pela equipe do Social Jurídico, podendo envolver contato direto
                com o profissional cadastrado e consulta à plataforma ConfirmADV
                da Ordem dos Advogados do Brasil.
              </li>

              <li>
                A validação realizada pela plataforma confirma apenas as
                informações profissionais disponíveis no momento da consulta e
                não representa garantia de qualidade, especialização, conduta,
                disponibilidade ou resultado do serviço prestado pelo advogado.
              </li>

              <li>
                Enquanto a verificação estiver pendente, determinados recursos
                poderão permanecer indisponíveis ou limitados.
              </li>

              <li>
                Caso sejam identificadas divergências, irregularidade da
                inscrição, impossibilidade de confirmação ou informações falsas,
                a plataforma poderá solicitar esclarecimentos, limitar
                funcionalidades ou suspender a conta.
              </li>

              <li>
                O advogado deverá comunicar alterações em sua inscrição
                profissional, incluindo suspensão, cancelamento, licenciamento
                ou mudança de seccional.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="seguranca-conta"
            number="5"
            title="Segurança da conta"
            icon={KeyRound}
          >
            <p>
              O usuário é responsável por manter a confidencialidade de suas
              credenciais e por impedir o acesso indevido à conta.
            </p>

            <ul>
              <li>
                Senhas, códigos de autenticação e links de acesso não devem ser
                compartilhados.
              </li>

              <li>
                O usuário deve comunicar imediatamente qualquer suspeita de
                acesso não autorizado.
              </li>

              <li>
                A plataforma poderá solicitar nova autenticação ou bloquear
                temporariamente uma conta quando identificar atividade suspeita.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="casos"
            number="6"
            title="Publicação de casos"
            icon={BriefcaseBusiness}
          >
            <p>
              O cliente poderá relatar seu problema por texto, áudio, vídeo,
              documentos ou outros formatos disponibilizados.
            </p>

            <p>
              O relato deve apresentar somente as informações necessárias para
              que os advogados compreendam, inicialmente, a natureza da demanda.
            </p>

            <div className={styles.warningBox}>
              <AlertTriangle size={19} aria-hidden="true" />

              <p>
                Não publique senhas, dados bancários, números completos de
                cartão, códigos de segurança, documentos integrais, informações
                de crianças, dados médicos ou informações de terceiros sem
                necessidade e autorização.
              </p>
            </div>

            <ul>
              <li>
                O cliente é responsável pela veracidade do relato publicado.
              </li>

              <li>
                A publicação não garante que advogados manifestarão interesse.
              </li>

              <li>
                A plataforma poderá ocultar, moderar ou remover conteúdo que
                viole estes Termos ou apresente risco a terceiros.
              </li>

              <li>
                Informações adicionais devem ser compartilhadas somente após
                avaliação da necessidade e da segurança do atendimento.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="advogados"
            number="7"
            title="Utilização por advogados"
            icon={Gavel}
          >
            <p>
              O advogado deve utilizar a plataforma de acordo com suas
              obrigações profissionais, éticas e legais.
            </p>

            <ul>
              <li>
                O acesso a um caso não autoriza uso dos dados para finalidade
                diversa do contato profissional pretendido.
              </li>

              <li>
                É proibido utilizar informações de clientes para spam,
                publicidade não solicitada ou compartilhamento com terceiros.
              </li>

              <li>
                O advogado é responsável pela comunicação, proposta,
                contratação, definição de honorários e execução do serviço
                jurídico.
              </li>

              <li>
                A plataforma não garante quantidade mínima de casos, respostas,
                contratações ou retorno financeiro.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="radar"
            number="8"
            title="Radar Jurídico"
            icon={Radar}
          >
            <p>
              O Radar Jurídico organiza oportunidades disponibilizadas aos
              advogados conforme critérios técnicos, comerciais e operacionais
              da plataforma.
            </p>

            <ul>
              <li>
                O acesso pode variar conforme plano, limite de uso,
                disponibilidade e elegibilidade do profissional.
              </li>

              <li>
                As informações podem ter origem em fontes públicas, integrações
                autorizadas ou cadastros realizados na plataforma.
              </li>

              <li>
                A inclusão de uma oportunidade no Radar não representa garantia
                de contratação, validade jurídica, atualidade ou resposta da
                pessoa relacionada.
              </li>

              <li>
                O advogado deve verificar a pertinência, origem e condições da
                oportunidade antes de qualquer atuação.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="comunicacao"
            number="9"
            title="Comunicação, propostas e contratação"
            icon={MessageSquareMore}
          >
            <p>
              A plataforma oferece ferramentas de comunicação, incluindo
              mensagens, áudios, arquivos e videochamadas.
            </p>

            <ul>
              <li>
                O conteúdo das conversas é de responsabilidade de seus
                participantes.
              </li>

              <li>
                A contratação é realizada diretamente entre cliente e advogado.
              </li>

              <li>
                Honorários, escopo, prazos e condições devem ser formalizados
                entre as partes.
              </li>

              <li>
                O Social Jurídico não recebe automaticamente poderes para
                representar qualquer usuário na relação contratual.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="planos"
            number="10"
            title="Planos, cobrança e renovação"
            icon={CreditCard}
          >
            <p>
              Determinadas funcionalidades destinadas a advogados dependem da
              contratação de plano pago, incluindo os planos Start, Pro e outras
              modalidades que venham a ser disponibilizadas.
            </p>

            <ul>
              <li>
                Os preços, períodos de cobrança, limites e recursos incluídos
                serão apresentados ao usuário antes da confirmação da
                contratação.
              </li>

              <li>
                A contratação poderá possuir cobrança recorrente, com renovação
                automática ao final de cada ciclo, até que o usuário solicite o
                cancelamento.
              </li>

              <li>
                Os pagamentos poderão ser processados por gateways
                terceirizados, incluindo Stripe e InfinitePay.
              </li>

              <li>
                O Social Jurídico não armazena diretamente os dados completos de
                cartão de crédito inseridos nos ambientes dos processadores de
                pagamento.
              </li>

              <li>
                Promoções, descontos e condições de primeiro mês possuem duração
                e critérios próprios, informados na oferta correspondente.
              </li>

              <li>
                O não pagamento poderá resultar na suspensão de recursos do
                plano, sem prejuízo do acesso a informações que devam permanecer
                disponíveis por obrigação legal ou operacional.
              </li>

              <li>
                Os limites de inteligência artificial, Radar Jurídico,
                notificações, armazenamento e demais ferramentas serão
                informados na página do plano, no painel do usuário ou na
                contratação.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="cancelamento"
            number="11"
            title="Cancelamento, arrependimento e reembolso"
            icon={CircleDollarSign}
            important
          >
            <h3>11.1. Cancelamento da assinatura</h3>

            <p>
              O usuário poderá solicitar o cancelamento da renovação da
              assinatura pelos canais disponibilizados na plataforma ou pelo
              e-mail socialjuridico3@gmail.com.
            </p>

            <ul>
              <li>
                O cancelamento impede novas cobranças recorrentes após sua
                efetivação.
              </li>

              <li>
                Salvo indicação diferente na oferta, o acesso aos recursos pagos
                permanecerá disponível até o término do período já contratado.
              </li>

              <li>
                A exclusão da conta não deve ser utilizada como substituto do
                cancelamento da assinatura. O usuário deverá cancelar a cobrança
                recorrente antes de solicitar a exclusão.
              </li>

              <li>
                Caso uma cobrança ocorra após pedido de cancelamento realizado e
                comprovadamente recebido antes da renovação, a situação será
                analisada e corrigida quando constatado erro operacional.
              </li>
            </ul>

            <h3>11.2. Direito de arrependimento</h3>

            <p>
              Quando a contratação estiver sujeita à legislação de proteção ao
              consumidor, o usuário poderá exercer o direito de arrependimento
              no prazo legal contado da contratação realizada fora do
              estabelecimento comercial.
            </p>

            <ul>
              <li>
                A solicitação deverá ser enviada pelo canal oficial de
                atendimento, com identificação da conta e da cobrança.
              </li>

              <li>
                O reembolso será realizado, quando devido, pelo mesmo meio de
                pagamento ou por procedimento tecnicamente disponível junto ao
                gateway utilizado.
              </li>

              <li>
                O prazo de processamento poderá variar conforme Stripe,
                InfinitePay, instituição financeira e administradora do cartão.
              </li>
            </ul>

            <h3>11.3. Reembolsos fora do direito de arrependimento</h3>

            <p>
              Após o prazo legal aplicável, pagamentos já processados não serão
              automaticamente reembolsáveis apenas pela ausência de uso, falta
              de contratação de clientes, ausência de respostas ou insatisfação
              com a quantidade de oportunidades.
            </p>

            <p>
              Poderá haver reembolso total ou proporcional quando for
              constatada:
            </p>

            <ul>
              <li>cobrança duplicada;</li>
              <li>cobrança posterior a cancelamento válido;</li>
              <li>erro técnico ou operacional imputável à plataforma;</li>
              <li>
                indisponibilidade relevante e prolongada de recurso essencial
                contratado, quando não houver solução ou compensação adequada;
              </li>
              <li>outra hipótese exigida pela legislação aplicável.</li>
            </ul>

            <h3>11.4. Recursos consumidos</h3>

            <p>
              Créditos, consultas, notificações, operações de inteligência
              artificial, oportunidades acessadas e demais recursos efetivamente
              consumidos poderão ser considerados na análise de eventual
              reembolso, respeitada a legislação aplicável.
            </p>

            <h3>11.5. Contestação de pagamento</h3>

            <p>
              Antes de abrir contestação junto à instituição financeira,
              recomenda-se que o usuário entre em contato com o Social Jurídico
              para tentativa de solução. Fraudes, chargebacks abusivos ou
              contestações manifestamente indevidas poderão resultar na
              suspensão da conta, assegurada a possibilidade de esclarecimento.
            </p>
          </LegalSection>

          <LegalSection
            id="ia"
            number="12"
            title="Inteligência Artificial"
            icon={Bot}
            important
          >
            <p>
              A plataforma pode oferecer ferramentas de Inteligência Artificial
              para apoio informativo, organização, explicação de termos e
              elaboração de textos.
            </p>

            <ul>
              <li>
                As respostas podem conter erros, omissões ou informações
                imprecisas.
              </li>

              <li>
                A IA <strong>não substitui</strong> a análise e a orientação de
                um advogado habilitado.
              </li>

              <li>
                Documentos gerados devem ser revisados antes de qualquer
                utilização.
              </li>

              <li>
                O advogado é responsável pelo conteúdo que decidir utilizar,
                assinar, enviar ou protocolar.
              </li>

              <li>
                O cliente não deve tomar decisões jurídicas exclusivamente com
                base em uma resposta automatizada.
              </li>

              <li>
                O usuário deve evitar inserir informações confidenciais ou
                excessivas quando elas não forem necessárias para a finalidade
                da ferramenta.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="conteudo"
            number="13"
            title="Conteúdo enviado pelo usuário"
            icon={Database}
          >
            <p>
              O usuário permanece responsável pelo conteúdo que envia, publica,
              armazena ou compartilha na plataforma.
            </p>

            <ul>
              <li>
                O usuário declara possuir direitos, autorizações e
                consentimentos necessários para o envio do conteúdo.
              </li>

              <li>
                É proibido compartilhar conteúdo ilícito, fraudulento,
                difamatório, discriminatório ou que viole direitos de terceiros.
              </li>

              <li>
                A plataforma recebe autorização limitada para armazenar,
                processar e exibir o conteúdo somente na medida necessária à
                prestação dos serviços.
              </li>

              <li>
                Arquivos podem estar sujeitos a limites de tamanho, formato,
                duração e armazenamento.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="documentos"
            number="14"
            title="Documentos, registros e assinatura digital"
            icon={FileSignature}
          >
            <p>
              Recursos de documentos digitais podem registrar informações como
              data, horário, identificadores técnicos, histórico de ações e
              evidências relacionadas ao fluxo realizado.
            </p>

            <ul>
              <li>
                A validade e a força probatória de cada documento dependem do
                contexto, das informações registradas e da análise jurídica
                aplicável.
              </li>

              <li>
                A plataforma não garante aceitação automática do documento por
                órgãos públicos, tribunais ou terceiros.
              </li>

              <li>
                O usuário deve verificar se o método utilizado atende às
                exigências específicas da operação pretendida.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="notificacao"
            number="15"
            title="Notificação Extrajudicial Blindada"
            icon={ShieldCheck}
          >
            <p>
              A Notificação Extrajudicial Blindada pode reunir registros
              técnicos relacionados ao envio, acesso, entrega, geolocalização ou
              interação do destinatário, conforme a funcionalidade utilizada.
            </p>

            <ul>
              <li>
                A existência de registros técnicos não garante que o
                destinatário tenha compreendido ou concordado com o conteúdo.
              </li>

              <li>
                A validade e utilidade jurídica dos registros dependem do caso
                concreto.
              </li>

              <li>
                O usuário é responsável pela legitimidade do conteúdo,
                finalidade, destinatário e dados inseridos.
              </li>

              <li>
                A ferramenta não substitui outros meios de notificação exigidos
                por lei, contrato ou determinação judicial.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="condutas"
            number="16"
            title="Condutas proibidas"
            icon={AlertTriangle}
          >
            <p>É proibido utilizar a plataforma para:</p>

            <ul>
              <li>praticar fraude ou falsidade ideológica;</li>
              <li>assediar, ameaçar ou discriminar outros usuários;</li>
              <li>
                coletar ou utilizar dados pessoais para finalidade não
                autorizada;
              </li>
              <li>
                compartilhar credenciais ou revender acesso sem autorização;
              </li>
              <li>
                tentar contornar limites, controles de segurança ou cobranças;
              </li>
              <li>enviar malware, scripts ou arquivos maliciosos;</li>
              <li>
                publicar conteúdo protegido por sigilo ou segredo de justiça sem
                autorização;
              </li>
              <li>
                realizar publicidade irregular, spam ou abordagem abusiva;
              </li>
              <li>violar direitos autorais ou outros direitos de terceiros.</li>
            </ul>
          </LegalSection>

          <LegalSection
            id="propriedade"
            number="17"
            title="Propriedade intelectual"
            icon={Landmark}
          >
            <p>
              A marca, o software, a interface, os elementos visuais, os textos
              institucionais, os bancos de dados e demais materiais próprios do
              Social Jurídico são protegidos e não podem ser copiados,
              revendidos ou explorados sem autorização.
            </p>

            <p>
              A contratação de um plano concede apenas uma licença limitada,
              pessoal, revogável e não exclusiva de utilização das
              funcionalidades disponibilizadas.
            </p>
          </LegalSection>

          <LegalSection
            id="suspensao"
            number="18"
            title="Suspensão e encerramento de contas"
            icon={ShieldCheck}
          >
            <p>
              A plataforma poderá limitar, suspender ou encerrar contas quando
              houver indícios de:
            </p>

            <ul>
              <li>violação destes Termos;</li>
              <li>fraude ou informação cadastral falsa;</li>
              <li>uso indevido de dados pessoais;</li>
              <li>inscrição profissional irregular;</li>
              <li>inadimplência relativa a recursos pagos;</li>
              <li>ameaça à segurança da plataforma ou de outros usuários;</li>
              <li>determinação legal, administrativa ou judicial.</li>
            </ul>

            <p>
              Sempre que possível e adequado, o usuário será informado sobre a
              medida e poderá apresentar esclarecimentos pelos canais de
              atendimento.
            </p>
          </LegalSection>

          <LegalSection
            id="privacidade"
            number="19"
            title="Privacidade e direitos dos titulares"
            icon={ShieldCheck}
          >
            <p>
              O tratamento de dados pessoais é realizado conforme as
              finalidades, bases legais e condições detalhadas na Política de
              Privacidade.
            </p>

            <p>Nos casos previstos em lei, o titular poderá solicitar:</p>

            <ul>
              <li>confirmação da existência de tratamento;</li>
              <li>acesso aos dados pessoais;</li>
              <li>correção de dados incompletos ou desatualizados;</li>
              <li>
                anonimização, bloqueio ou eliminação de dados tratados de forma
                irregular;
              </li>
              <li>informações sobre compartilhamento;</li>
              <li>revogação de consentimento, quando aplicável;</li>
              <li>eliminação de dados tratados com base em consentimento;</li>
              <li>oposição e demais direitos previstos na legislação.</li>
            </ul>

            <p>
              As solicitações poderão exigir confirmação de identidade para
              impedir acesso, alteração ou exclusão indevida de dados de
              terceiros.
            </p>

            <div className={styles.contactActions}>
              <Link href="/privacidade" className={styles.primaryLink}>
                Consultar Política de Privacidade
                <ChevronRight size={16} aria-hidden="true" />
              </Link>

              <Link href="/exclusao-de-dados" className={styles.secondaryLink}>
                Solicitar exclusão de dados
              </Link>
            </div>
          </LegalSection>

          <LegalSection
            id="retencao"
            number="20"
            title="Retenção, exclusão e anonimização de dados"
            icon={Database}
          >
            <p>
              Os dados serão mantidos pelo período necessário ao cumprimento das
              finalidades informadas, à execução dos serviços, à segurança da
              plataforma, ao cumprimento de obrigações legais e ao exercício
              regular de direitos.
            </p>

            <h3>20.1. Durante a conta ativa</h3>

            <p>
              Enquanto a conta estiver ativa, poderão ser mantidos dados
              cadastrais, informações profissionais, casos, conversas, arquivos,
              registros de uso, documentos e informações necessárias ao
              funcionamento dos serviços contratados.
            </p>

            <h3>20.2. Solicitação de exclusão</h3>

            <p>
              O usuário poderá solicitar a exclusão da conta pela funcionalidade
              disponível na plataforma, pela página de exclusão de dados ou pelo
              e-mail socialjuridico3@gmail.com.
            </p>

            <ul>
              <li>
                Após a confirmação do pedido, a conta poderá ser imediatamente
                desativada ou ficar indisponível para novos acessos.
              </li>

              <li>
                Dados ativos que não precisem ser conservados serão eliminados
                ou anonimizados em prazo operacional razoável, preferencialmente
                em até 30 dias.
              </li>

              <li>
                Cópias residuais poderão permanecer em backups de segurança por
                até 180 dias, sem utilização para finalidades comerciais e
                sujeitas aos controles de acesso existentes.
              </li>

              <li>
                Dados necessários ao cumprimento de obrigação legal, prevenção a
                fraudes, defesa em processos ou exercício regular de direitos
                poderão ser mantidos pelo prazo aplicável.
              </li>
            </ul>

            <h3>20.3. Registros e documentos financeiros</h3>

            <p>
              Informações relacionadas a cobranças, pagamentos, notas,
              documentos fiscais, cancelamentos e contestações poderão ser
              conservadas pelos prazos exigidos pela legislação fiscal, contábil
              e civil.
            </p>

            <h3>20.4. Registros técnicos e de segurança</h3>

            <p>
              Logs de acesso, autenticação, alterações relevantes, segurança e
              prevenção a fraudes poderão ser mantidos pelo prazo necessário ao
              cumprimento das obrigações aplicáveis e à proteção da plataforma e
              de seus usuários.
            </p>

            <h3>20.5. Dados compartilhados entre usuários</h3>

            <p>
              A exclusão de uma conta não garante a remoção automática de
              documentos ou informações que tenham sido legitimamente recebidos,
              baixados, armazenados ou utilizados por outro usuário no contexto
              de uma relação profissional independente.
            </p>

            <h3>20.6. Impossibilidade de restauração</h3>

            <p>
              Após a conclusão do processo de eliminação, os dados excluídos
              poderão não ser recuperáveis. O usuário deverá realizar cópia das
              informações que deseje preservar antes de solicitar a exclusão.
            </p>
          </LegalSection>

          <LegalSection
            id="disponibilidade"
            number="21"
            title="Disponibilidade e alterações do serviço"
            icon={Clock3}
          >
            <p>
              A plataforma poderá passar por manutenção, atualização,
              indisponibilidade temporária ou alterações necessárias à segurança
              e evolução do produto.
            </p>

            <ul>
              <li>
                Não é garantida disponibilidade ininterrupta de todos os
                recursos.
              </li>

              <li>
                Funcionalidades podem ser modificadas, substituídas ou
                descontinuadas.
              </li>

              <li>
                Serviços que dependem de provedores externos podem ser afetados
                por falhas fora do controle razoável do Social Jurídico.
              </li>

              <li>
                Sempre que possível, alterações relevantes serão comunicadas
                pelos canais disponíveis.
              </li>
            </ul>
          </LegalSection>

          <LegalSection
            id="responsabilidade"
            number="22"
            title="Limitações e responsabilidades"
            icon={AlertTriangle}
            important
          >
            <p>
              O Social Jurídico não garante resultado judicial, contratação,
              resposta de clientes, quantidade mínima de oportunidades ou
              retorno financeiro.
            </p>

            <p>
              A plataforma não responde pela atuação profissional do advogado,
              pelas informações fornecidas pelos usuários ou pelas decisões
              tomadas diretamente entre as partes.
            </p>

            <p>
              Nenhuma disposição destes Termos exclui responsabilidades que não
              possam ser legalmente afastadas. Cada situação será avaliada
              conforme o serviço prestado, a conduta dos envolvidos e a
              legislação aplicável.
            </p>
          </LegalSection>

          <LegalSection
            id="alteracoes"
            number="23"
            title="Alterações destes Termos"
            icon={FileText}
          >
            <p>
              Estes Termos poderão ser atualizados para refletir mudanças no
              produto, na operação ou nas regras aplicáveis.
            </p>

            <p>
              A versão e a data de atualização permanecerão disponíveis no
              início deste documento. Alterações relevantes poderão ser
              comunicadas pelos canais existentes na plataforma.
            </p>
          </LegalSection>

          <LegalSection
            id="legislacao"
            number="24"
            title="Legislação aplicável e solução de conflitos"
            icon={Scale}
          >
            <p>
              Estes Termos serão interpretados conforme a legislação da
              República Federativa do Brasil.
            </p>

            <p>
              Antes de iniciar procedimento judicial, as partes deverão, sempre
              que possível, buscar solução amigável pelos canais oficiais de
              atendimento do Social Jurídico.
            </p>

            <p>
              Ressalvadas as hipóteses em que a legislação determine foro
              diferente, fica eleito o foro da Comarca de Sorocaba, Estado de
              São Paulo, para solução de controvérsias relacionadas a estes
              Termos.
            </p>

            <p>
              A eleição de foro não limita direitos de consumidores ou outras
              regras de competência obrigatória previstas na legislação.
            </p>
          </LegalSection>

          <LegalSection id="contato" number="25" title="Contato" icon={Mail}>
            <p>
              Solicitações relacionadas a estes Termos, cancelamentos,
              pagamentos, privacidade, segurança ou funcionamento da plataforma
              poderão ser encaminhadas pelos seguintes canais:
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
                <strong>Página de atendimento:</strong>{" "}
                <Link href="/contato" className={styles.textLink}>
                  Central de contato
                </Link>
              </li>
            </ul>

            <p>
              O atendimento poderá solicitar informações adicionais para
              confirmar a identidade do solicitante e localizar a conta ou
              transação relacionada.
            </p>
          </LegalSection>

          <footer className={styles.documentFooter}>
            <CheckCircle2 size={20} aria-hidden="true" />

            <div>
              <strong>Fim dos Termos de Uso</strong>

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
