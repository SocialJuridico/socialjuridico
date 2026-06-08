import Link from "next/link";
import {
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";

import ContactForm from "./ContactForm";
import styles from "./Contato.module.css";

export const metadata = {
  title: "Contato",
  description:
    "Entre em contato com o Social Jurídico para suporte, pagamentos, privacidade, parcerias e outras solicitações.",
  alternates: {
    canonical: "/contato",
  },
};

const whatsappContacts = [
  {
    label: "WhatsApp principal",
    displayNumber: "+55 (15) 98165-7317",
    href: "https://wa.me/5515981657317",
  },
  {
    label: "WhatsApp de atendimento",
    displayNumber: "+55 (15) 99265-3066",
    href: "https://wa.me/5515992653066",
  },
];

export default function ContatoPage() {
  return (
    <main className={styles.page}>
      <section
        className={styles.hero}
        aria-labelledby="contact-title"
      >
        <div className={styles.heroGlow} aria-hidden="true" />

        <div className={styles.heroContent}>
          <div className={styles.heroIcon} aria-hidden="true">
            <MessagesSquare size={30} strokeWidth={1.8} />
          </div>

          <h1 id="contact-title" className={styles.title}>
            Como podemos
            <span className={styles.highlight}> ajudar?</span>
          </h1>

          <p className={styles.subtitle}>
            Entre em contato para tratar de suporte técnico,
            pagamentos, privacidade, parcerias ou dúvidas sobre o
            funcionamento do Social Jurídico.
          </p>

          <div className={styles.heroNotice}>
            <ShieldCheck size={16} aria-hidden="true" />

            <span>
              Este canal não presta consultoria ou orientação
              jurídica.
            </span>
          </div>
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.contactLayout}>
          <aside
            className={styles.contactInfo}
            aria-labelledby="contact-channels-title"
          >
            <header className={styles.infoHeader}>
              <span className={styles.eyebrow}>
                Canais de atendimento
              </span>

              <h2 id="contact-channels-title">
                Escolha a forma mais adequada para falar conosco
              </h2>

              <p>
                Para agilizar o atendimento, informe o e-mail
                utilizado no cadastro e descreva sua solicitação
                com clareza.
              </p>
            </header>

            <div className={styles.contactCards}>
              <article className={styles.contactCard}>
                <div className={styles.contactIcon} aria-hidden="true">
                  <Mail size={22} strokeWidth={1.8} />
                </div>

                <div className={styles.contactCardContent}>
                  <span className={styles.contactLabel}>E-mail</span>

                  <a href="mailto:socialjuridico3@gmail.com">
                    socialjuridico3@gmail.com
                  </a>

                  <p>
                    Suporte, financeiro, privacidade e solicitações
                    administrativas.
                  </p>
                </div>
              </article>

              {whatsappContacts.map((contact) => (
                <article
                  className={styles.contactCard}
                  key={contact.href}
                >
                  <div
                    className={styles.contactIcon}
                    aria-hidden="true"
                  >
                    <MessageCircle size={22} strokeWidth={1.8} />
                  </div>

                  <div className={styles.contactCardContent}>
                    <span className={styles.contactLabel}>
                      {contact.label}
                    </span>

                    <a
                      href={contact.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {contact.displayNumber}

                      <ExternalLink
                        size={14}
                        aria-hidden="true"
                      />
                    </a>

                    <p>
                      Atendimento por mensagem durante o horário
                      comercial.
                    </p>
                  </div>
                </article>
              ))}

              <article className={styles.contactCard}>
                <div className={styles.contactIcon} aria-hidden="true">
                  <MapPin size={22} strokeWidth={1.8} />
                </div>

                <div className={styles.contactCardContent}>
                  <span className={styles.contactLabel}>
                    Localidade
                  </span>

                  <strong>Sorocaba — SP</strong>

                  <p>
                    Operação e atendimento realizados de forma
                    digital.
                  </p>
                </div>
              </article>

              <article className={styles.contactCard}>
                <div className={styles.contactIcon} aria-hidden="true">
                  <Clock3 size={22} strokeWidth={1.8} />
                </div>

                <div className={styles.contactCardContent}>
                  <span className={styles.contactLabel}>
                    Horário de atendimento
                  </span>

                  <strong>Segunda a sexta, das 9h às 18h</strong>

                  <p>
                    Mensagens enviadas fora do horário serão
                    respondidas no próximo período útil.
                  </p>
                </div>
              </article>
            </div>

            <div className={styles.legalLinks}>
              <Link href="/privacidade">
                Política de Privacidade
              </Link>

              <span aria-hidden="true" />

              <Link href="/termos">Termos de Uso</Link>

              <span aria-hidden="true" />

              <Link href="/exclusao-de-dados">
                Exclusão de dados
              </Link>
            </div>
          </aside>

          <section
            className={styles.formSection}
            aria-labelledby="contact-form-title"
          >
            <header className={styles.formHeader}>
              <span className={styles.eyebrow}>
                Envie uma mensagem
              </span>

              <h2 id="contact-form-title">
                Conte-nos o que aconteceu
              </h2>

              <p>
                Preencha os dados abaixo. A mensagem será encaminhada
                à equipe responsável pelo atendimento.
              </p>
            </header>

            <ContactForm />
          </section>
        </div>
      </section>
    </main>
  );
}