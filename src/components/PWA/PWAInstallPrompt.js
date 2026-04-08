"use client";

import { useState, useEffect } from "react";
import { Download, X, Bell, ShieldCheck } from "lucide-react";

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Só executa se for mobile (tela <= 768px)
    if (typeof window === "undefined" || window.innerWidth > 768) {
      return;
    }

    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIosDevice) setIsIOS(true);

    const handleBeforeInstallPrompt = (e) => {
      console.log("PWA: beforeinstallprompt disparado");
      e.preventDefault();
      setInstallPrompt(e);
      // Mostrar o popup após um pequeno delay no mobile
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Se for iOS e não estiver instalado, mostrar aviso
    if (isIosDevice && !window.navigator.standalone) {
      const timer = setTimeout(() => setIsVisible(true), 4000);
      return () => clearTimeout(timer);
    }

    const handleOpenModal = () => setIsVisible(true);
    window.addEventListener('openPWAInstallModal', handleOpenModal);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener('openPWAInstallModal', handleOpenModal);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setIsVisible(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="pwa-popup-overlay">
      <div className="pwa-popup-content">
        <button className="pwa-close" onClick={() => setIsVisible(false)}>
          <X size={20} />
        </button>
        
        <div className="pwa-icon-wrapper">
          <ShieldCheck size={40} color="#D4AF37" />
        </div>
        
        <h3>SocialJurídico no seu Celular</h3>
        <p>
          Instale nosso aplicativo para receber notificações de novos casos e mensagens em tempo real.
        </p>

        {isIOS ? (
          <div className="ios-instructions">
            <p>Para instalar no seu iPhone:</p>
            <ol>
              <li>Toque no ícone de <strong>Compartilhar</strong> (quadrado com seta)</li>
              <li>Role para baixo e toque em <strong>&quot;Adicionar à Tela de Início&quot;</strong></li>
            </ol>
          </div>
        ) : installPrompt ? (
          <button className="pwa-install-btn" onClick={handleInstallClick}>
            <Download size={18} /> Instalar Aplicativo
          </button>
        ) : (
          <div className="ios-instructions">
            <p>Para instalar no seu Android:</p>
            <ol>
              <li>Toque nos <strong>três pontinhos (⋮)</strong> no topo do Chrome</li>
              <li>Toque em <strong>&quot;Instalar aplicativo&quot;</strong> ou <strong>&quot;Adicionar à tela inicial&quot;</strong></li>
            </ol>
          </div>
        )}
        
        <div className="pwa-feature-badges">
          <span><Bell size={12} /> Alertas Instantâneos</span>
          <span><ShieldCheck size={12} /> Acesso Seguro</span>
        </div>
      </div>

      <style jsx>{`
        .pwa-popup-overlay {
          position: fixed;
          bottom: 20px;
          left: 20px;
          right: 20px;
          z-index: 10000;
          display: flex;
          justify-content: center;
          animation: slideUp 0.5s ease;
        }
        
        @media (min-width: 768px) {
          .pwa-popup-overlay {
            display: none; /* Garante que suma acima de 768px */
          }
        }

        .pwa-popup-content {
          background: #111;
          background: linear-gradient(145deg, #111 0%, #050505 100%);
          border: 1px solid rgba(212, 175, 55, 0.3);
          border-radius: 20px;
          padding: 25px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(212, 175, 55, 0.1);
          position: relative;
          color: white;
          text-align: center;
          max-width: 400px;
          width: 100%;
        }

        .pwa-close {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
        }

        .pwa-icon-wrapper {
          width: 70px;
          height: 70px;
          background: rgba(212, 175, 55, 0.1);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 15px;
        }

        h3 {
          margin: 0 0 10px 0;
          font-size: 1.25rem;
          color: #fff;
        }

        p {
          font-size: 0.9rem;
          color: #aaa;
          margin-bottom: 20px;
          line-height: 1.4;
        }

        .pwa-install-btn {
          width: 100%;
          background: #D4AF37;
          color: #000;
          border: none;
          padding: 12px;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .pwa-install-btn:hover {
          transform: scale(1.02);
          background: #c39e32;
        }

        .ios-instructions {
          background: rgba(255,255,255,0.05);
          padding: 15px;
          border-radius: 12px;
          text-align: left;
        }

        .ios-instructions p {
          margin-bottom: 8px;
          color: #fff;
          font-weight: 600;
        }

        .ios-instructions ol {
          margin: 0;
          padding-left: 20px;
          font-size: 0.85rem;
          color: #ccc;
        }

        .ios-instructions li {
          margin-bottom: 5px;
        }

        .pwa-feature-badges {
          display: flex;
          justify-content: center;
          gap: 15px;
          margin-top: 15px;
        }

        .pwa-feature-badges span {
          font-size: 0.7rem;
          color: #666;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
