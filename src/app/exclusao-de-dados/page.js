import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Database,
  DatabaseBackup,
  FileText,
  KeyRound,
  Mail,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";

import styles from "./DataDeletion.module.css";

export const metadata = {
  title: "Exclusão de Dados",
  description:
    "Consulte como solicitar a exclusão, anonimização ou bloqueio de dados pessoais no Social Jurídico.",
  alternates: {
    canonical: "/exclusao-de-dados",
  },
};

const LAST_UPDATED = "08 de junho de 2026";
const DOCUMENT_VERSION = "2.0";

const tableOfContents = [
  {
    id: "direito",
    label: "Direito de solicitar",
  },
  {
    id: "como-solicitar",
    label: "Como solicitar",
  },
  {
    id: "confirmacao",
    label: "Confirmação de identidade",
  },
  {
    id: "processamento",
    label: "Etapas e prazo",
  },
  {
    id: "dados-eliminados",
    label: "Dados eliminados",
  },
  {
    id: "dados-conservados",
    label: "Dados conservados",
  },
  {
    id: "backups",
    label: "Backups",
  },
  {
    id: "assinatura",
    label: "Assinaturas e pagamentos",
  },
  {
    id: "outros-usuarios",
    label: "Dados com outros usuários",
  },
  {
    id: "reversibilidade",
    label: "Irreversibilidade",
  },
  {
    id: "acompanhamento",
    label: "Acompanhamento",
  },
  {
    id: "contato",
    label: "Contato",
  },
];

function DeletionSection({
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
      className={`${styles.deletionSection} ${
        important ? styles.importantSection : ""
      }`}
      aria-labelledby={`${id}-title`}
    >
      <header className={styles.sectionHeader}>
        <div className={styles.sectionIcon} aria-hidden="true">
          <Icon size={22} strokeWidth={1.8} />
        </div>

        <div>
          <span className={styles.sectionNumber}>
            Seção {number}
          </span>

          <h2 id={`${id}-title`} className={styles.sectionTitle}>
            {title}
          </h2>
        </div>
      </header>

      <div className={styles.sectionContent}>{children}</div>
    </section>
  );
}

export default function ExclusaoDeDadosPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroIcon} aria-hidden="true">
            <UserX size={31} strokeWidth={1.8} />
          </div>

          <h1 className={styles.pageTitle}>
            Exclusão de dados
          </h1>

          <p className={styles.pageDescription}>
            Entenda como solicitar o encerramento da conta e a
            eliminação, anonimização ou bloqueio de dados pessoais
            tratados pelo Social Jurídico.
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
              Processamento em até 30 dias
            </span>
          </div>

          <div className={styles.relatedLinks}>
            <Link href="/privacidade">
              Política de Privacidade
            </Link>

            <Link href="/termos">
              Termos de Uso
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav
            className={styles.tableOfContents}
            aria-label="Seções sobre exclusão de dados"
          >
            <h2 className={styles.contentsTitle}>
              Nesta página
            </h2>

            <ol className={styles.contentsList}>
              {tableOfContents.map((item, index) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>
                    <span>{index + 1}</span>

                    {item.label}

                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                    />
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className={styles.document}>
          <div className={styles.summary}>
            <Trash2 size={22} aria-hidden="true" />

            <div>
              <h2>Resumo do processo</h2>

              <p>
                Após recebermos uma solicitação válida, confirmaremos
                a identidade do titular, desativaremos o acesso
                quando apropriado e iniciaremos a eliminação ou
                anonimização dos dados que não precisem ser
                conservados.
              </p>
            </div>
          </div>

          <div className={styles.processGrid}>
            <div className={styles.processItem}>
              <span>1</span>

              <strong>Solicitação</strong>

              <p>
                O titular envia o pedido pelo canal oficial.
              </p>
            </div>

            <div className={styles.processItem}>
              <span>2</span>

              <strong>Validação</strong>

              <p>
                Confirmamos a identidade e os dados da conta.
              </p>
            </div>

            <div className={styles.processItem}>
              <span>3</span>

              <strong>Processamento</strong>

              <p>
                Dados elegíveis são eliminados ou anonimizados.
              </p>
            </div>

            <div className={styles.processItem}>
              <span>4</span>

              <strong>Conclusão</strong>

              <p>
                O titular recebe retorno pelo canal informado.
              </p>
            </div>
          </div>

          <DeletionSection
            id="direito"
            number="1"
            title="Direito de solicitar"
            icon={ShieldCheck}
            important
          >
            <p>
              O titular poderá solicitar a confirmação do
              tratamento, o acesso, a correção, o bloqueio, a
              anonimização ou a eliminação de dados pessoais,
              conforme as condições previstas na legislação.
            </p>

            <p>
              A solicitação de exclusão não significa que todos os
              dados serão necessariamente eliminados de forma
              imediata. Alguns registros podem precisar ser
              conservados para cumprimento de obrigações, segurança,
              prevenção de fraude ou exercício regular de direitos.
            </p>

            <p>
              O encerramento da conta e a eliminação de dados são
              procedimentos relacionados, mas não necessariamente
              idênticos. Uma conta pode ser desativada antes da
              conclusão integral das rotinas técnicas de exclusão.
            </p>
          </DeletionSection>

          <DeletionSection
            id="como-solicitar"
            number="2"
            title="Como solicitar a exclusão"
            icon={Mail}
          >
            <p>
              Atualmente, a solicitação poderá ser encaminhada por
              um dos canais abaixo.
            </p>

            <h3>2.1. Por e-mail</h3>

            <p>
              Envie a solicitação a partir do endereço vinculado à
              conta, utilizando o assunto:
            </p>

            <div className={styles.codeBox}>
              [EXCLUSÃO DE DADOS]
            </div>

            <p>
              O e-mail deverá ser encaminhado para:
            </p>

            <a
              href="mailto:socialjuridico3@gmail.com?subject=%5BEXCLUS%C3%83O%20DE%20DADOS%5D"
              className={styles.inlineLink}
            >
              <Mail size={16} aria-hidden="true" />
              socialjuridico3@gmail.com
            </a>

            <h3>2.2. Pela página de contato</h3>

            <p>
              O titular também poderá utilizar a central de contato
              e informar que deseja exercer um direito relacionado
              à proteção de dados.
            </p>

            <Link
              href="/contato"
              className={styles.inlineLink}
            >
              Acessar página de contato
              <ChevronRight size={15} aria-hidden="true" />
            </Link>

            <h3>2.3. Pelo painel</h3>

            <p>
              Quando a funcionalidade estiver disponível para o
              perfil do usuário, a solicitação também poderá ser
              iniciada nas configurações da conta.
            </p>

            <p>
              A disponibilidade de um botão no painel não elimina a
              necessidade de validações de segurança antes da
              conclusão definitiva.
            </p>
          </DeletionSection>

          <DeletionSection
            id="confirmacao"
            number="3"
            title="Confirmação de identidade"
            icon={UserCheck}
          >
            <p>
              Para evitar exclusões fraudulentas ou solicitações
              feitas por terceiros, o Social Jurídico poderá
              solicitar informações necessárias à confirmação da
              identidade.
            </p>

            <ul>
              <li>endereço de e-mail da conta;</li>
              <li>nome cadastrado;</li>
              <li>telefone, quando existente;</li>
              <li>tipo de perfil;</li>
              <li>
                número da OAB e seccional, no caso de advogado;
              </li>
              <li>
                confirmação por link, código ou mensagem;
              </li>
              <li>
                informações adicionais estritamente necessárias à
                segurança do procedimento.
              </li>
            </ul>

            <div className={styles.warningBox}>
              <AlertTriangle size={19} aria-hidden="true" />

              <p>
                Nunca solicitaremos sua senha completa, código de
                segurança de cartão ou senha bancária para processar
                a exclusão.
              </p>
            </div>
          </DeletionSection>

          <DeletionSection
            id="processamento"
            number="4"
            title="Etapas e prazo de processamento"
            icon={Clock3}
            important
          >
            <p>
              Após a confirmação da identidade e da legitimidade da
              solicitação, o procedimento seguirá as etapas
              técnicas e administrativas necessárias.
            </p>

            <ul>
              <li>
                a conta poderá ser bloqueada ou desativada para
                impedir novos acessos;
              </li>

              <li>
                assinaturas recorrentes deverão ser verificadas e
                canceladas separadamente, quando aplicável;
              </li>

              <li>
                dados elegíveis serão identificados para eliminação
                ou anonimização;
              </li>

              <li>
                dados sujeitos à conservação serão isolados ou
                mantidos apenas para as finalidades permitidas;
              </li>

              <li>
                o titular receberá confirmação após a conclusão ou
                informação sobre eventual necessidade de prazo ou
                documentação adicional.
              </li>
            </ul>

            <div className={styles.deadlineBox}>
              <Clock3 size={21} aria-hidden="true" />

              <div>
                <strong>Prazo operacional</strong>

                <p>
                  A solicitação será processada em até 30 dias após
                  a confirmação da identidade e o recebimento das
                  informações necessárias.
                </p>
              </div>
            </div>
          </DeletionSection>

          <DeletionSection
            id="dados-eliminados"
            number="5"
            title="Dados que poderão ser eliminados ou anonimizados"
            icon={Database}
          >
            <p>
              Conforme o perfil, o uso realizado e as necessidades
              de conservação, poderão ser eliminados ou
              anonimizados:
            </p>

            <ul>
              <li>dados cadastrais não sujeitos à retenção;</li>
              <li>foto, biografia e informações de perfil;</li>
              <li>preferências da conta;</li>
              <li>
                casos e conteúdos que não precisem ser conservados;
              </li>
              <li>arquivos enviados pelo usuário;</li>
              <li>
                mensagens e registros sem necessidade de
                conservação;
              </li>
              <li>
                tokens, identificadores de notificação e
                preferências de comunicação;
              </li>
              <li>
                dados de uso que possam ser eliminados ou
                anonimizados sem comprometer obrigações legais.
              </li>
            </ul>

            <p>
              Em algumas situações, a anonimização poderá ser
              utilizada em lugar da eliminação quando os dados
              puderem ser mantidos sem identificação do titular.
            </p>
          </DeletionSection>

          <DeletionSection
            id="dados-conservados"
            number="6"
            title="Dados que poderão ser conservados"
            icon={FileText}
          >
            <p>
              Mesmo após a exclusão da conta, alguns registros
              poderão ser conservados quando necessários para:
            </p>

            <ul>
              <li>cumprimento de obrigação legal ou regulatória;</li>
              <li>registros fiscais, contábeis e financeiros;</li>
              <li>comprovação de pagamentos e cancelamentos;</li>
              <li>prevenção e investigação de fraude;</li>
              <li>segurança da plataforma;</li>
              <li>
                exercício regular de direitos em processos;
              </li>
              <li>
                atendimento de ordem administrativa ou judicial;
              </li>
              <li>
                preservação de registros técnicos exigidos pela
                legislação.
              </li>
            </ul>

            <p>
              Esses dados não deverão ser utilizados para novas
              finalidades incompatíveis e permanecerão sujeitos às
              medidas de segurança aplicáveis.
            </p>
          </DeletionSection>

          <DeletionSection
            id="backups"
            number="7"
            title="Backups e cópias residuais"
            icon={DatabaseBackup}
          >
            <p>
              Após a exclusão dos sistemas ativos, cópias residuais
              poderão permanecer temporariamente em backups de
              segurança.
            </p>

            <div className={styles.deadlineBox}>
              <DatabaseBackup size={21} aria-hidden="true" />

              <div>
                <strong>Prazo máximo de backup</strong>

                <p>
                  Cópias residuais poderão permanecer por até 180
                  dias, conforme os ciclos de retenção e
                  sobrescrita da infraestrutura.
                </p>
              </div>
            </div>

            <ul>
              <li>
                backups possuem acesso restrito;
              </li>

              <li>
                não são utilizados ordinariamente para novas
                finalidades;
              </li>

              <li>
                dados eventualmente restaurados por necessidade de
                contingência continuarão sujeitos à solicitação de
                exclusão;
              </li>

              <li>
                a eliminação definitiva ocorrerá conforme o ciclo
                de expiração ou sobrescrita.
              </li>
            </ul>
          </DeletionSection>

          <DeletionSection
            id="assinatura"
            number="8"
            title="Assinaturas, pagamentos e cancelamento"
            icon={KeyRound}
          >
            <p>
              A solicitação de exclusão da conta não deve ser
              utilizada como substituto do cancelamento de uma
              assinatura recorrente.
            </p>

            <ul>
              <li>
                o usuário deverá solicitar ou confirmar o
                cancelamento do plano antes da exclusão;
              </li>

              <li>
                cobranças já processadas serão tratadas conforme os
                Termos de Uso;
              </li>

              <li>
                registros financeiros poderão permanecer
                conservados para fins fiscais, contábeis e de
                defesa;
              </li>

              <li>
                identificadores de transações processadas por
                Stripe ou InfinitePay poderão permanecer nos
                sistemas dos respectivos fornecedores conforme
                suas próprias obrigações.
              </li>
            </ul>

            <Link
              href="/termos#cancelamento"
              className={styles.inlineLink}
            >
              Consultar regras de cancelamento e reembolso
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          </DeletionSection>

          <DeletionSection
            id="outros-usuarios"
            number="9"
            title="Dados mantidos por outros usuários"
            icon={ShieldCheck}
          >
            <p>
              A exclusão da conta no Social Jurídico não remove
              automaticamente documentos ou informações que tenham
              sido legitimamente recebidos por outro usuário.
            </p>

            <p>Isso pode incluir:</p>

            <ul>
              <li>
                documentos enviados a um advogado contratado;
              </li>

              <li>
                contratos e registros relacionados à prestação
                profissional;
              </li>

              <li>
                arquivos baixados antes da exclusão;
              </li>

              <li>
                informações mantidas para cumprimento de dever
                profissional, legal ou contratual.
              </li>
            </ul>

            <p>
              Nesses casos, o advogado, escritório ou terceiro que
              conservar os dados poderá possuir responsabilidades
              próprias pelo tratamento realizado fora da
              plataforma.
            </p>
          </DeletionSection>

          <DeletionSection
            id="reversibilidade"
            number="10"
            title="Irreversibilidade da exclusão"
            icon={RotateCcw}
            important
          >
            <div className={styles.dangerBox}>
              <AlertTriangle size={20} aria-hidden="true" />

              <div>
                <strong>A exclusão poderá ser irreversível</strong>

                <p>
                  Após a conclusão do procedimento, dados,
                  históricos, arquivos, preferências e acessos
                  eliminados podem não ser recuperados.
                </p>
              </div>
            </div>

            <p>
              Antes de solicitar a exclusão, o usuário deve guardar
              cópias dos documentos e informações que deseje
              preservar.
            </p>

            <p>
              A criação futura de uma nova conta não restaura
              automaticamente conteúdos, planos, oportunidades ou
              históricos da conta anterior.
            </p>
          </DeletionSection>

          <DeletionSection
            id="acompanhamento"
            number="11"
            title="Acompanhamento da solicitação"
            icon={CheckCircle2}
          >
            <p>
              O retorno será realizado, preferencialmente, pelo
              mesmo endereço utilizado na solicitação.
            </p>

            <p>
              Caso o titular não receba resposta ou precise
              complementar informações, poderá reenviar a
              solicitação informando:
            </p>

            <ul>
              <li>nome completo;</li>
              <li>e-mail da conta;</li>
              <li>data aproximada da solicitação inicial;</li>
              <li>
                assunto utilizado na comunicação anterior;
              </li>
              <li>
                informações suficientes para localizar o pedido.
              </li>
            </ul>

            <p>
              O Social Jurídico poderá informar que determinados
              dados foram conservados, indicando de forma geral a
              justificativa aplicável.
            </p>
          </DeletionSection>

          <DeletionSection
            id="contato"
            number="12"
            title="Contato para exclusão e privacidade"
            icon={Mail}
          >
            <p>
              Solicitações podem ser encaminhadas aos canais
              oficiais:
            </p>

            <ul>
              <li>
                <strong>Responsável pelo canal de privacidade:</strong>{" "}
                Carlos Henrique
              </li>

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
            </ul>

            <div className={styles.contactActions}>
              <a
                href="mailto:socialjuridico3@gmail.com?subject=%5BEXCLUS%C3%83O%20DE%20DADOS%5D"
                className={styles.primaryLink}
              >
                Solicitar exclusão por e-mail
                <Mail size={16} aria-hidden="true" />
              </a>

              <Link
                href="/privacidade"
                className={styles.secondaryLink}
              >
                Política de Privacidade
              </Link>
            </div>
          </DeletionSection>

          <footer className={styles.documentFooter}>
            <CheckCircle2 size={20} aria-hidden="true" />

            <div>
              <strong>Fim da Política de Exclusão de Dados</strong>

              <p>
                Versão {DOCUMENT_VERSION} — atualizada em{" "}
                {LAST_UPDATED}.
              </p>
            </div>
          </footer>
        </article>
      </div>
    </main>
  );
}