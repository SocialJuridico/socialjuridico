import {
  Bot,
  FileUp,
  MessageCircleMore,
  Video,
} from "lucide-react";

import styles from "./Features.module.css";

const featuresData = [
  {
    icon: FileUp,
    title: "Conte seu caso do seu jeito",
    description:
      "Relate o que aconteceu por texto, áudio ou vídeo, da forma mais confortável para você.",
  },
  {
    icon: Bot,
    title: "Anjo Jurídico",
    description:
      "Uma inteligência artificial que ajuda a explicar termos jurídicos em uma linguagem mais simples.",
  },
  {
    icon: MessageCircleMore,
    title: "Chat completo",
    description:
      "Converse com o advogado por mensagens e áudios, envie documentos e mantenha tudo organizado.",
  },
  {
    icon: Video,
    title: "Videochamada integrada",
    description:
      "Realize atendimentos por vídeo diretamente pela plataforma, sem depender de outros aplicativos.",
  },
];

export default function Features() {
  return (
    <section
      className={styles.featuresSection}
      aria-labelledby="features-title"
    >
      <div className={styles.container}>
        <header className={styles.sectionHeader}>
          <h2 id="features-title" className={styles.sectionTitle}>
            Acesso jurídico mais simples,
            <span className={styles.highlight}>
              {" "}
              do início ao atendimento
            </span>
          </h2>

          <p className={styles.sectionDescription}>
            Recursos pensados para você relatar seu problema, compreender as
            orientações e conversar com o advogado em um único ambiente.
          </p>
        </header>

        <div className={styles.featuresGrid}>
          {featuresData.map((feature) => {
            const Icon = feature.icon;

            return (
              <article key={feature.title} className={styles.featureItem}>
                <div className={styles.iconWrapper} aria-hidden="true">
                  <Icon size={27} strokeWidth={1.7} />
                </div>

                <div className={styles.featureContent}>
                  <h3 className={styles.title}>{feature.title}</h3>

                  <p className={styles.description}>
                    {feature.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <p className={styles.aiNotice}>
          O Anjo Jurídico oferece explicações informativas e não substitui a
          orientação profissional do advogado.
        </p>
      </div>
    </section>
  );
}