"use client";

import { useState, useEffect } from 'react';
import { Star, Quote } from 'lucide-react';
import styles from './Testimonials.module.css';

const testimonialsData = [
  {
    initials: 'MS',
    color: '#8B5CF6', // Roxo (similar à imagem)
    name: 'Maria Silva',
    role: 'Cliente • Direito Trabalhista',
    text: '"Publicar meu caso foi totalmente grátis e valeu muito a pena. O advogado que me atendeu foi extremamente profissional e tirou todas as minhas dúvidas."'
  },
  {
    initials: 'DR',
    color: '#F97316', // Laranja (similar à imagem)
    name: 'Dr. Ricardo Oliveira',
    role: 'Advogado • OAB/SP',
    text: '"A qualidade dos clientes é superior a outras plataformas. O fato de você conversar diretamente na ferramenta já filtra quem está apenas curioso daquele que precisa do serviço."'
  },
  {
    initials: 'FG',
    color: '#059669', // Verde Escuro (similar à imagem)
    name: 'Fernando Gomes',
    role: 'Cliente • Direito Civil',
    text: '"A transparência é o ponto forte. Eu sabia exatamente em que fase a negociação estava só olhando a timeline no celular. Recomendo demais a todos."'
  }
];

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Efeito de Looping de 7 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === testimonialsData.length - 1 ? 0 : prevIndex + 1
      );
    }, 7000); // 7000 ms = 7 segundos

    return () => clearInterval(timer);
  }, []);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>O que dizem nossos usuários</h2>

      <div className={styles.carouselContainer}>
        
        <div className={styles.cardsWrapper}>
          {testimonialsData.map((testimonial, index) => {
            // Classe dinâmica para mostrar ou esconder o card
            const isActive = index === currentIndex;

            return (
              <div 
                key={index} 
                className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
              >
                <Quote size={80} className={styles.quoteIcon} strokeWidth={1} />
                
                <div className={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={20} className={styles.starIcon} />
                  ))}
                </div>

                <p className={styles.text}>{testimonial.text}</p>

                <div className={styles.authorRow}>
                  <div className={styles.avatar} style={{ backgroundColor: testimonial.color }}>
                    {testimonial.initials}
                  </div>
                  <div className={styles.authorInfo}>
                    <span className={styles.authorName}>{testimonial.name}</span>
                    <span className={styles.authorRole}>{testimonial.role}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Controles do Carrossel (Dots) */}
        <div className={styles.controls}>
          {testimonialsData.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
              aria-label={`Ir para depoimento ${index + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
