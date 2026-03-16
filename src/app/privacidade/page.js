import styles from '../termos/Legal.module.css';
import { ShieldCheck, Eye, Database, Lock, Mail } from 'lucide-react';

export const metadata = {
  title: "Política de Privacidade | SocialJurídico",
  description: "Política de Privacidade e Proteção de Dados (LGPD) da plataforma SocialJurídico.",
};

export default function Privacidade() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Política de Privacidade</h1>
        <p className={styles.lastUpdated}>Última atualização: 15 de Março de 2026</p>
      </header>

      <main className={styles.content}>
        
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <ShieldCheck className={styles.icon} size={24} />
            1. Compromisso com a Privacidade
          </h2>
          <p className={styles.text}>
            O SocialJurídico valoriza profundamente a privacidade de seus usuários (Clientes e Advogados). Esta Política foi elaborada em estrita conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)</strong>, estabelecendo regras claras sobre coleta, uso, armazenamento, tratamento e proteção dos dados trafegados em nossa Plataforma.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Eye className={styles.icon} size={24} />
            2. Quais Dados Coletamos
          </h2>
          <p className={styles.text}>
            Ao utilizar a Plataforma, você nos fornece expressamente informações essenciais para a prestação do serviço:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}><strong>Dados Cadastrais:</strong> Nome completo, e-mail, telefone (WhatsApp) e senhas criptografadas.</li>
            <li className={styles.listItem}><strong>Dados de Advogados:</strong> Número de inscrição na OAB, Estado(UF) de atuação, especialidades e biografia profissional, sujeitos à validação pública.</li>
            <li className={styles.listItem}><strong>Dados de Navegação e Casos:</strong> Breve relato de casos ou dúvidas jurídicas incluídas na triagem, endereços IP, tipo de navegador e páginas acessadas para fins analíticos de segurança.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Database className={styles.icon} size={24} />
            3. Como Usamos Seus Dados
          </h2>
          <p className={styles.text}>
            A utilização dos seus dados tem propósitos restritos e justificados:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Criar e gerenciar sua conta na Plataforma.</li>
            <li className={styles.listItem}><strong>Conectar:</strong> Permitir que o seu relato de triagem seja lido unicamente por profissionais de advocacia validados para verificar a possibilidade de assunção do caso.</li>
            <li className={styles.listItem}>Enviar comunicações transacionais via e-mail ou WhatsApp (como redefinição de senhas, alertas de mensagens e validações da OAB).</li>
            <li className={styles.listItem}>Garantir e monitorar a segurança contra fraudes dentro do ecossistema Supabase.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Lock className={styles.icon} size={24} />
            4. Segurança, Criptografia e Sigilo
          </h2>
          <p className={styles.text}>
            Toda comunicação entre o seu navegador e nossos servidores é protegida através do protocolo SSL/TLS. 
            Suas senhas jamais são armazenadas em formato legível, sendo submetidas a modernas técnicas de <em>hashing</em> criptográfico interno contínuo em nuvem.
          </p>
          <p className={styles.text}>
            O SocialJurídico **não comercializa, não aluga e não repassa** seus dados de contato a terceiros, empresas de marketing ou balcões de dados.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Mail className={styles.icon} size={24} />
            5. Direitos do Titular (LGPD)
          </h2>
          <p className={styles.text}>
            Você, como titular dos dados, possui amplas garantias sob a Constituição e a LGPD:
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Acesso facilitado às informações sobre o tratamento de seus dados.</li>
            <li className={styles.listItem}>Correção célere de dados incompletos, inexatos ou desatualizados via painel de controle.</li>
            <li className={styles.listItem}>Revogação do consentimento a qualquer momento.</li>
            <li className={styles.listItem}><strong>Exclusão definitiva ou anonimização</strong> dos dados (Consulte nossa aba exclusiva de <em>Exclusão de Dados</em>).</li>
          </ul>
        </section>

      </main>
    </div>
  );
}
