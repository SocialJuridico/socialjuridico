import styles from '../termos/Legal.module.css';
import { UserX, Clock, DatabaseZap, AlertCircle, FileDigit } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: "Exclusão de Dados | SocialJurídico",
  description: "Solicitação de Exclusão de Dados Pessoais de acordo com a LGPD.",
};

export default function ExclusaoDados() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Exclusão de Dados (LGPD)</h1>
        <p className={styles.lastUpdated}>Última atualização: 15 de Março de 2026</p>
      </header>

      <main className={styles.content}>
        
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <DatabaseZap className={styles.icon} size={24} />
            1. O Seu Direito ao Esquecimento
          </h2>
          <p className={styles.text}>
            Em estrito cumprimento do Artigo 18, Inciso VI, da <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong>, o SocialJurídico assegura a todo usuário ativo o direito de requerer e obter a eliminação dos seus dados pessoais coletados ou tratados com o seu consentimento.
          </p>
          <p className={styles.text}>
            Compreendemos a importância da desvinculação digital e criamos um fluxo rápido para que você saia com segurança da nossa base de dados.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <UserX className={styles.icon} size={24} />
            2. Como Solicitar a Exclusão
          </h2>
          <p className={styles.text}>
            Os titulares podem solicitar a anonimização, o bloqueio ou a eliminação integral enviando uma notificação oficial a nossos sistemas através dos seguintes passos:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Passo A (Autoatendimento) - <em>Em Breve</em>:</strong> Dentro do painel de usuário, acessando "Configurações da Conta", basta clicar no botão vermelho "Excluir Minha Conta". A exclusão é imediata dos sistemas visíveis.
            </li>
            <li className={styles.listItem}>
              <strong>Passo B (E-mail):</strong> Enviar um e-mail com o título <strong>[EXCLUSÃO DE DADOS]</strong> a partir do seu e-mail de conta cadastrado para <em>suporte@socialjuridico.com</em> confirmando sua identidade e sua vontade de encerramento contratual irrevogável.
            </li>
            <li className={styles.listItem}>
              <strong>Passo C (Formulário):</strong> Visite a nossa página oficial de <Link href="/contato" className={styles.linkTag}>Contato</Link> e selecione "Solicitação LGPD - Excluir Cadastro".
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Clock className={styles.icon} size={24} />
            3. Prazo de Atendimento Político
          </h2>
          <p className={styles.text}>
            Ao submeter sua requisição oficialmente por nossos canais:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Seu perfil on-line não ficará mais acessível imediatamente após a verificação de segurança.</li>
            <li className={styles.listItem}>O SocialJurídico processará a remoção profunda, purga e apagamento do banco de dados relacional principal num prazo máximo improrrogável de <strong>15 (quinze) dias</strong> úteis (inc. II, § 1º, Art. 19 da LGPD).</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FileDigit className={styles.icon} size={24} />
            4. Dados Retidos (Exceções Legais)
          </h2>
          <p className={styles.text}>
            Visando fins contábeis e de regimentos fiscalizadores do Brasil, como Código Civil e Marco Civil da Internet:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Mesmo após a purga visual dos usuários e da eliminação de bio, OAB ou casos pessoais, nós arquivaremos unilateralmente os logs de IP (conexões) por <strong>seis (06) meses</strong>, como determina o Art. 15 da Lei 12.965/2014 do Marco Civil da Internet.</li>
            <li className={styles.listItem}>Os registros que originaram Notas Fiscais, extratos de pagamento (Stripe) ou faturamento do Software aos clientes/advogados serão obrigatoriamente retidos por até <strong>5 (cinco) anos</strong> por força de compliance com a Receita Federal Brasileira.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <AlertCircle className={styles.icon} size={24} />
            5. Reversibilidade
          </h2>
          <p className={styles.text}>
            <strong>Aviso Legal Importante:</strong> A exclusão dos dados através da Lei LGPD neste ecossistema é drástica e permanente. Uma vez encerrada a conta e transcorrido o prazo de processamento, nenhuma ação anterior como contatos salvos da Plataforma, histórico de buscas ou acesso ao painel poderão ser estornados.
          </p>
        </section>

      </main>
    </div>
  );
}
