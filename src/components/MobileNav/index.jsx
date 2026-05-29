'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Home, BookOpen, Zap, MessageSquare, HelpCircle } from 'lucide-react';
import styles from './MobileNav.module.css';

export default function MobileNav() {
  const [activeTab, setActiveTab] = useState('#');

  useEffect(() => {
    const sections = ['#', 'como-funciona', 'diferenciais', 'depoimentos', 'duvidas'];
    
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight / 3;
      
      // Se estiver muito no topo, foca no Home
      if (window.scrollY < 100) {
        setActiveTab('#');
        return;
      }
      
      for (const sectionId of sections) {
        if (sectionId === '#') continue;
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveTab(`#${sectionId}`);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    // Executa uma vez no montagem para definir estado inicial
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={styles.mobileNav}>
      <Link 
        href="#" 
        onClick={() => setActiveTab('#')} 
        className={`${styles.navItem} ${activeTab === '#' ? styles.active : ''}`}
      >
        <Home size={20} />
        <span>Home</span>
      </Link>
      <Link 
        href="#como-funciona" 
        onClick={() => setActiveTab('#como-funciona')} 
        className={`${styles.navItem} ${activeTab === '#como-funciona' ? styles.active : ''}`}
      >
        <BookOpen size={20} />
        <span>Como Funciona</span>
      </Link>
      <Link 
        href="#diferenciais" 
        onClick={() => setActiveTab('#diferenciais')} 
        className={`${styles.navItem} ${activeTab === '#diferenciais' ? styles.active : ''}`}
      >
        <Zap size={20} />
        <span>Diferenciais</span>
      </Link>
      <Link 
        href="#depoimentos" 
        onClick={() => setActiveTab('#depoimentos')} 
        className={`${styles.navItem} ${activeTab === '#depoimentos' ? styles.active : ''}`}
      >
        <MessageSquare size={20} />
        <span>Depoimentos</span>
      </Link>
      <Link 
        href="#duvidas" 
        onClick={() => setActiveTab('#duvidas')} 
        className={`${styles.navItem} ${activeTab === '#duvidas' ? styles.active : ''}`}
      >
        <HelpCircle size={20} />
        <span>Dúvidas</span>
      </Link>
    </nav>
  );
}
