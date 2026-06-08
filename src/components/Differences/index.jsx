import {
  CircleDollarSign,
  MessagesSquare,
  ShieldCheck,
  UserRoundSearch,
} from "lucide-react";

import styles from "./Differences.module.css";

const differences = [
  {
    icon: CircleDollarSign,
    title: "Publicação gratuita",
    description:
      "Você pode cadastrar e publicar seu caso sem pagar taxas para iniciar a busca por um advogado.",
  },
  {
    icon: UserRoundSearch,
    title: "Advogados demonstram interesse",
    description:
      "Profissionais cadastrados visualizam as demandas e podem manifestar interesse em conversar com você.",
  },
  {
    icon: ShieldCheck,
    title: "Você mantém a escolha",
    description:
      "Receber o interesse de um advogado não cria obrigação de contratação. A decisão continua sendo sua.",
  },
  {
    icon: MessagesSquare,
    title: "Atendimento centralizado",
    description:
      "Mensagens, áudios, documentos e videochamadas ficam organizados em um único ambiente.",
  },
];

export default function Differences() {
  return (
    <section
      id="diferenciais"
      className={styles.section}
      aria-labelledby="differences-title"
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <h2 id="differences-title" className={styles.title}>
            Uma forma mais simples de iniciar
            <span className={styles.titleHighlight}>
              {" "}
              seu atendimento jurídico
            </span>
          </h2>

          <p className={styles.subtitle}>
            O Social Jurídico organiza o primeiro contato entre clientes e
            advogados, preservando sua liberdade de escolha em todas as etapas.
          </p>
        </header>

        <div className={styles.grid}>
          {differences.map((item) => {
            const Icon = item.icon;

            return (
              <article key={item.title} className={styles.card}>
                <div className={styles.iconWrapper} aria-hidden="true">
                  <Icon size={26} strokeWidth={1.7} />
                </div>

                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>

                  <p className={styles.cardDescription}>
                    {item.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <div className={styles.finalNote}>
          <ShieldCheck size={20} aria-hidden="true" />

          <p>
            O Social Jurídico facilita o contato, mas a contratação e a relação
            profissional são definidas diretamente entre cliente e advogado.
          </p>
        </div>
      </div>
    </section>
  );
}