"use client";

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './FAQ.module.css';

const faqs = [
  {
    question: 'O cadastro é gratuito?',
    answer: 'Sim! O cadastro na plataforma é 100% gratuito. Publicar seu caso também é totalmente grátis. Você não paga nada para conectar-se aos advogados qualificados.',
  },
  {
    question: 'Os advogados são confiáveis?',
    answer: 'Sim, buscamos criar um ambiente profissional. Todos os advogados precisam informar seu número de registro na OAB para atuar na plataforma.',
  },
  {
    question: 'Como funciona o contato?',
    answer: 'Após publicar seu caso, ele fica visível para advogados. Quando um profissional aceita o caso, um chat seguro é aberto para vocês conversarem.',
  },
  {
    question: 'Posso usar no celular?',
    answer: 'Sim, o SocialJurídico é 100% responsivo e funciona perfeitamente em smartphones, tablets e computadores.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    // Se clicar no mesmo que já tá aberto, ele fecha (setta pra null)
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="duvidas" className={styles.section}>
      <h2 className={styles.title}>Perguntas Frequentes</h2>

      <div className={styles.faqContainer}>
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;

          return (
            <div 
              key={index} 
              className={`${styles.faqItem} ${isOpen ? styles.faqItemActive : ''}`}
            >
              <button 
                className={styles.questionButton}
                onClick={() => toggleFAQ(index)}
                aria-expanded={isOpen}
              >
                {faq.question}
                <div className={`${styles.iconWrapper} ${isOpen ? styles.iconRotated : ''}`}>
                  <ChevronDown size={20} strokeWidth={2.5} />
                </div>
              </button>
              
              <div 
                className={`${styles.answerWrapper} ${isOpen ? styles.answerWrapperOpen : ''}`}
              >
                <div className={styles.answerInner}>
                  <p className={styles.answerText}>{faq.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
