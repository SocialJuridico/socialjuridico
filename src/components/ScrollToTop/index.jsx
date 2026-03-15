"use client";

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import styles from './ScrollToTop.module.css';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  // Exibe a seta quando rolar mais de 400px pra baixo
  const toggleVisibility = () => {
    if (window.scrollY > 400) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Move a tela todo o caminho de volta para o pixel zero (topo)
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth' // Efeito suave de rolagem nativo do navegador
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    
    // Limpeza na hora que a página morre
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  return (
    <button
      onClick={scrollToTop}
      className={`${styles.scrollToTopBtn} ${isVisible ? styles.visible : ''}`}
      aria-label="Voltar ao Topo"
    >
      <ArrowUp size={24} strokeWidth={2.5} />
    </button>
  );
}
