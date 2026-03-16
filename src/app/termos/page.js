import styles from './Legal.module.css';
import { Scale, Users, Shield, FileText, AlertTriangle, Scale3D } from 'lucide-react';

export const metadata = {
  title: "Termos de Uso | SocialJurídico",
  description: "Termos e Condições de Uso da plataforma SocialJurídico.",
};

export default function Termos() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Termos de Uso</h1>
        <p className={styles.lastUpdated}>Última atualização: 15 de Março de 2026</p>
      </header>

      <main className={styles.content}>
        
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Scale className={styles.icon} size={24} />
            1. Aceitação dos Termos
          </h2>
          <p className={styles.text}>
            Ao acessar e utilizar a plataforma <strong>SocialJurídico</strong> (doravante "Plataforma"), você concorda em cumprir e sujeitar-se a estes Termos de Uso. Caso não concorde com qualquer parte destes termos, você não deve acessar ou utilizar nossos serviços.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Users className={styles.icon} size={24} />
            2. Natureza da Plataforma
          </h2>
          <p className={styles.text}>
            O SocialJurídico atua estritamente como um <strong>Portal de Conexão</strong> entre cidadãos ("Clientes") e profissionais da advocacia ("Advogados"). 
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>Não somos um escritório de advocacia e não prestamos consultoria ou assessoria jurídica.</li>
            <li className={styles.listItem}>A Plataforma não participa, não intervém e não se responsabiliza pelas negociações, honorários ou contratos firmados diretamente entre Clientes e Advogados.</li>
            <li className={styles.listItem}>Ressaltamos o cumprimento rigoroso do Provimento nº 205/2021 do Conselho Federal da OAB, vedando a captação mercantilista de clientela e preservando a publicidade ético-informativa.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Shield className={styles.icon} size={24} />
            3. Cadastro e Elegibilidade
          </h2>
          <p className={styles.text}>
            Para utilizar as funcionalidades avançadas, é necessário criar uma conta.
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}><strong>Clientes:</strong> Devem ser civilmente capazes (maiores de 18 anos) para se cadastrar e expor suas dúvidas.</li>
            <li className={styles.listItem}><strong>Advogados:</strong> Devem estar regularmente inscritos nos quadros da Ordem dos Advogados do Brasil (OAB). A Plataforma reserva-se o direito de validar o número da OAB junto ao Cadastro Nacional dos Advogados (CNA). Advogados com inscrição suspensa ou cancelada terão suas contas desativadas.</li>
            <li className={styles.listItem}>As informações de cadastro devem ser exatas, precisas e verdadeiras. É proibido criar perfis falsos ou assumir a identidade de terceiros.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FileText className={styles.icon} size={24} />
            4. Sigilo e Compartilhamento de Casos
          </h2>
          <p className={styles.text}>
            Ao submeter um relato ou dúvida jurídica na Plataforma, o Cliente compreende que as informações poderão ser visualizadas pelos advogados cadastrados, a fim de que possam analisar a viabilidade do atendimento.
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>O Cliente <strong>não deve</strong> incluir dados excessivamente sensíveis ou confidenciais (ex: senhas bancárias, número de cartão de crédito) no seu relato público de triagem.</li>
            <li className={styles.listItem}>Os Advogados cadastrados comprometem-se a tratar as informações visualizadas na plataforma sob o estrito rigor do sigilo profissional inerente à advocacia.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <AlertTriangle className={styles.icon} size={24} />
            5. Limitação de Responsabilidade
          </h2>
          <p className={styles.text}>
            A Plataforma não avaliza, endossa ou garante o sucesso de qualquer demanda cível, criminal, trabalhista ou de qualquer outra natureza a partir do contato originado no SocialJurídico.
          </p>
          <p className={styles.text}>
            Isentamo-nos de responsabilidade por perdas ou danos diretos, indiretos ou lucros cessantes decorrentes do uso de nossos serviços ou do resultado do serviço jurídico contratado por meio d Plataforma.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Scale3D className={styles.icon} size={24} />
            6. Modificações dos Termos
          </h2>
          <p className={styles.text}>
            A Plataforma reserva-se o direito de modificar o presente Termo a qualquer momento, sem aviso prévio. Caberá ao usuário consultar regularmente esta página. O uso contínuo após as modificações constitui aceitação dos novos termos.
          </p>
        </section>

      </main>
    </div>
  );
}
