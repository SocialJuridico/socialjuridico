'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, ShieldCheck, X } from 'lucide-react';
import styles from './PWA.module.css';

export default function PWAInlineBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    // Verificar se já está instalado
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) return;

    // Escutar evento de instalação (Android/PC)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Se for mobile e não for standalone, mostramos o banner após 4 segundos
    // mesmo que o evento beforeinstallprompt não dispare (fallback)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const timer = setTimeout(() => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      if (isMobile && !isStandalone) {
        setIsVisible(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') setIsVisible(false);
    } else {
      // Caso iOS ou se falhar, mostramos o modal de instruções padrão que já criamos
      const event = new CustomEvent('openPWAInstallModal');
      window.dispatchEvent(event);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.inlineBanner}>
      <div className={styles.bannerIcon}>
        <Smartphone size={24} className={styles.phoneIcon} />
      </div>
      <div className={styles.bannerContent}>
        <h4>Baixe o Aplicativo SocialJurídico</h4>
        <p>Receba alertas de novos casos e mensagens em tempo real no seu celular.</p>
      </div>
      <div className={styles.bannerActions}>
        <button onClick={handleInstall} className={styles.bannerBtn}>
          <Download size={16} /> Instalar Agora
        </button>
        <button onClick={() => setIsVisible(false)} className={styles.closeBanner}>
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
