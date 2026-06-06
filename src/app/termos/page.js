import styles from "./Legal.module.css";
import {
  Scale,
  Users,
  Shield,
  FileText,
  AlertTriangle,
  Scale3D,
  Brain,
  CreditCard,
} from "lucide-react";

export const metadata = {
  title: "Termos de Uso | SocialJurídico",
  description: "Termos e Condições de Uso da plataforma SocialJurídico.",
};

export default function Termos() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Termos de Uso</h1>
        <p className={styles.lastUpdated}>
          Última atualização: 15 de Março de 2026
        </p>
      </header>

      <main className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Scale className={styles.icon} size={24} />
            1. Aceitação dos Termos
          </h2>
          <p className={styles.text}>
            Ao acessar e utilizar a plataforma <strong>SocialJurídico</strong>{" "}
            (doravante &quot;Plataforma&quot;), você concorda em cumprir e
            sujeitar-se a estes Termos de Uso. Caso não concorde com qualquer
            parte destes termos, você não deve acessar ou utilizar nossos
            serviços.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Users className={styles.icon} size={24} />
            2. Natureza da Plataforma (Marketplace)
          </h2>
          <p className={styles.text}>
            O SocialJurídico atua como plataforma tecnológica de conexão entre clientes e advogados, não participando da relação contratual firmada entre as partes.
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              Não somos um escritório de advocacia e não prestamos consultoria
              ou assessoria jurídica.
            </li>
            <li className={styles.listItem}>
              A Plataforma não participa, não intervém e não se responsabiliza
              pelas negociações, honorários ou contratos firmados diretamente
              entre Clientes e Advogados.
            </li>
            <li className={styles.listItem}>
              Ressaltamos o cumprimento rigoroso do Provimento nº 205/2021 do
              Conselho Federal da OAB, vedando a captação mercantilista de
              clientela e preservando a publicidade ético-informativa.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Shield className={styles.icon} size={24} />
            3. Cadastro e Elegibilidade
          </h2>
          <p className={styles.text}>
            Para utilizar as funcionalidades avançadas, é necessário criar uma
            conta.
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              <strong>Clientes:</strong> Devem ser civilmente capazes (maiores
              de 18 anos) para se cadastrar e expor suas dúvidas.
            </li>
            <li className={styles.listItem}>
              <strong>Advogados:</strong> Devem estar regularmente inscritos nos
              quadros da Ordem dos Advogados do Brasil (OAB). A Plataforma
              reserva-se o direito de validar o número da OAB junto ao Cadastro
              Nacional dos Advogados (CNA). Advogados com inscrição suspensa ou
              cancelada terão suas contas desativadas.
            </li>
            <li className={styles.listItem}>
              As informações de cadastro devem ser exatas, precisas e
              verdadeiras. É proibido criar perfis falsos ou assumir a
              identidade de terceiros.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FileText className={styles.icon} size={24} />
            4. Sigilo e Compartilhamento de Casos
          </h2>
          <p className={styles.text}>
            Ao submeter um relato ou dúvida jurídica na Plataforma, o Cliente
            compreende que as informações poderão ser visualizadas pelos
            advogados cadastrados, a fim de que possam analisar a viabilidade do
            atendimento.
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              O Cliente <strong>não deve</strong> incluir dados excessivamente
              sensíveis ou confidenciais (ex: senhas bancárias, número de cartão
              de crédito) no seu relato público de triagem.
            </li>
            <li className={styles.listItem}>
              Os Advogados cadastrados comprometem-se a tratar as informações
              visualizadas na plataforma sob o estrito rigor do sigilo
              profissional inerente à advocacia.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Brain className={styles.icon} size={24} />
            5. Inteligência Artificial e Responsabilidade
          </h2>
          <p className={styles.text}>
            O SocialJurídico disponibiliza funcionalidades baseadas em Inteligência Artificial Generativa (como o Smart Docs e o Anjo Jurídico) para suporte informacional e redação automatizada.
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              As ferramentas de Inteligência Artificial possuem caráter puramente auxiliar e de produtividade, e **não substituem** a análise, revisão e validação jurídica realizada por um advogado habilitado.
            </li>
            <li className={styles.listItem}>
              A responsabilidade final pela qualidade, exatidão e adequação de petições, minutas, contratos ou quaisquer documentos gerados pela IA é integralmente do profissional jurídico que os utiliza e assina.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FileText className={styles.icon} size={24} />
            6. Conteúdo do Usuário
          </h2>
          <p className={styles.text}>
            Ao utilizar a Plataforma, você pode carregar, armazenar e compartilhar arquivos de áudio, vídeo, imagens e documentos.
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              O usuário declara possuir todos os direitos, titularidade, autorizações e consentimentos necessários para compartilhar e processar os conteúdos enviados à Plataforma.
            </li>
            <li className={styles.listItem}>
              É expressamente proibido enviar conteúdos falsos, fraudulentos, que violem o sigilo profissional, direitos autorais de terceiros, ou que infrinjam a legislação vigente no país.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <CreditCard className={styles.icon} size={24} />
            7. Segurança de Pagamentos e Transações
          </h2>
          <p className={styles.text}>
            As transações de compra de créditos (Juris) ou assinaturas PRO/Enterprise na Plataforma são realizadas por meio de gateways de pagamento terceirizados integrados.
          </p>
          <ul className={styles.list}>
            <li className={styles.listItem}>
              Todos os pagamentos e dados de cartão de crédito são processados de forma inteiramente criptografada por parceiros em conformidade com o padrão PCI-DSS (Stripe e InfinitePay).
            </li>
            <li className={styles.listItem}>
              O SocialJurídico não armazena nem processa diretamente dados sensíveis de cartões de crédito em seus próprios servidores.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <AlertTriangle className={styles.icon} size={24} />
            8. Limitação de Responsabilidade
          </h2>
          <p className={styles.text}>
            A Plataforma não avaliza, endossa ou garante o sucesso de qualquer
            demanda cível, criminal, trabalhista ou de qualquer outra natureza a
            partir do contato originado no SocialJurídico.
          </p>
          <p className={styles.text}>
            Isentamo-nos de responsabilidade por perdas ou danos diretos,
            indiretos ou lucros cessantes decorrentes do uso de nossos serviços
            ou do resultado do serviço jurídico contratado por meio da
            Plataforma.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Scale3D className={styles.icon} size={24} />
            9. Modificações dos Termos
          </h2>
          <p className={styles.text}>
            A Plataforma reserva-se o direito de modificar o presente Termo a
            qualquer momento, sem aviso prévio. Caberá ao usuário consultar
            regularmente esta página. O uso contínuo após as modificações
            constitui aceitação dos novos termos.
          </p>
        </section>
      </main>
    </div>
  );
}
