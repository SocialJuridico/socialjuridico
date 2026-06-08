"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

import styles from "./FAQ.module.css";

const faqs = [
  {
    question: "A publicação do caso é gratuita?",
    answer:
      "Sim. Para clientes, o cadastro e a publicação do caso são gratuitos. Você não paga para apresentar sua demanda e receber manifestações de interesse de advogados cadastrados.",
  },
  {
    question: "Publicar um caso significa contratar um advogado?",
    answer:
      "Não. A publicação apenas permite que advogados cadastrados visualizem a demanda e manifestem interesse. A contratação somente acontece se você decidir avançar diretamente com um profissional.",
  },
  {
    question: "Como acontece o contato com o advogado?",
    answer:
      "Quando um advogado manifesta interesse, você recebe uma notificação e pode decidir se deseja iniciar a conversa. O contato pode acontecer pelo chat da plataforma, com mensagens, áudios, arquivos e videochamadas.",
  },
  {
    question: "Sou obrigado a conversar ou contratar alguém?",
    answer:
      "Não. Você mantém a liberdade de escolher com quem deseja conversar e não existe obrigação de contratar um advogado apenas porque ele demonstrou interesse no seu caso.",
  },
  {
    question: "Meus dados ficam visíveis para todos?",
    answer:
      "O caso deve conter apenas as informações necessárias para que os profissionais compreendam a demanda. Evite incluir CPF, endereço completo, telefone, senhas ou outros dados sensíveis na descrição pública. Informações adicionais podem ser compartilhadas posteriormente no atendimento.",
  },
  {
    question: "Posso enviar áudio, vídeo e documentos?",
    answer:
      "Sim. Você pode relatar seu caso por texto, áudio ou vídeo e, durante a conversa, enviar mensagens, arquivos e outras informações relacionadas ao atendimento.",
  },
  {
    question: "O que é o Anjo Jurídico?",
    answer:
      "O Anjo Jurídico é uma inteligência artificial criada para ajudar o cliente a compreender termos e expressões jurídicas em uma linguagem mais simples. Suas explicações são informativas e não substituem a orientação do advogado.",
  },
  {
    question: "O Social Jurídico presta consultoria jurídica?",
    answer:
      "Não. O Social Jurídico é uma plataforma tecnológica que facilita o contato entre clientes e advogados. A orientação jurídica, a contratação e a responsabilidade profissional pertencem ao advogado escolhido pelo cliente.",
  },
  {
    question: "Como funciona a contratação e o pagamento do advogado?",
    answer:
      "As condições do atendimento, os honorários e a contratação são definidos diretamente entre cliente e advogado. Antes de contratar, esclareça valores, serviços incluídos e demais condições profissionais.",
  },
  {
    question: "Como os advogados são identificados na plataforma?",
    answer:
      "Para atuar como advogado, o profissional deve informar seus dados profissionais e seu registro na OAB. O cliente também deve analisar o perfil, conversar com o profissional e avaliar as condições antes de contratar.",
  },
  {
    question: "Como funciona para advogados?",
    answer:
      "Advogados podem criar um perfil profissional, visualizar casos publicados, acessar oportunidades, conversar com clientes e utilizar ferramentas de organização e gestão disponíveis na plataforma.",
  },
  {
    question: "O que é o Radar Jurídico?",
    answer:
      "O Radar Jurídico reúne oportunidades jurídicas organizadas para advogados elegíveis. A disponibilidade dos detalhes e dos recursos pode variar conforme o plano contratado e as regras da plataforma.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

 function toggleFAQ(index) {
  setOpenIndex((currentIndex) =>
    currentIndex === index ? null : index,
  );
}

  return (
    <section
      id="duvidas"
      className={styles.section}
      aria-labelledby="faq-title"
    >
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerIcon} aria-hidden="true">
            <HelpCircle size={26} strokeWidth={1.8} />
          </div>

          <div>
            <h2 id="faq-title" className={styles.title}>
              Perguntas
              <span className={styles.highlight}> frequentes</span>
            </h2>

            <p className={styles.subtitle}>
              Entenda como funciona a publicação de casos, o contato com
              advogados e os principais recursos do Social Jurídico.
            </p>
          </div>
        </header>

        <div className={styles.faqContainer}>
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            const answerId = `faq-answer-${index}`;
            const questionId = `faq-question-${index}`;

            return (
              <article
                key={faq.question}
                className={`${styles.faqItem} ${
                  isOpen ? styles.faqItemActive : ""
                }`}
              >
                <h3 className={styles.questionHeading}>
                  <button
                    id={questionId}
                    type="button"
                    className={styles.questionButton}
                    onClick={() => toggleFAQ(index)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                  >
                    <span>{faq.question}</span>

                    <span
                      className={`${styles.iconWrapper} ${
                        isOpen ? styles.iconRotated : ""
                      }`}
                      aria-hidden="true"
                    >
                      <ChevronDown size={20} strokeWidth={2.2} />
                    </span>
                  </button>
                </h3>

                <div
                  id={answerId}
                  className={`${styles.answerWrapper} ${
                    isOpen ? styles.answerWrapperOpen : ""
                  }`}
                  role="region"
                  aria-labelledby={questionId}
                  aria-hidden={!isOpen}
                >
                  <div className={styles.answerInner}>
                    <p className={styles.answerText}>{faq.answer}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className={styles.finalNotice}>
          As informações desta seção são gerais e não substituem orientação
          jurídica profissional.
        </p>
      </div>
    </section>
  );
}
