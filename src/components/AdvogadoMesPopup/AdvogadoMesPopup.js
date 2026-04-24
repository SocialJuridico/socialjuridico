"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import styles from "./AdvogadoMesPopup.module.css";

export default function AdvogadoMesPopup() {
  const [show, setShow] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    // Verificar se já foi exibido nesta sessão
    const hasShown = sessionStorage.getItem("advogadoMesShown");
    if (hasShown) return;

    const fetchBanner = async () => {
      try {
        // Usamos o endpoint público ou genérico de banners. 
        // Como o endpoint /api/admin/banners exige admin, criaremos um novo endpoint público para pegar este banner específico.
        const res = await fetch("/api/advogado-mes");
        const data = await res.json();
        
        if (data.success && data.banner && data.banner.link_url === "ACTIVE") {
          setImageUrl(data.banner.image_url);
          // Opcional: usar o link extra se precisarmos clicar e ir para uma URL
          // setLinkUrl(data.banner.name); // se guardarmos link lá
          setShow(true);
        }
      } catch (error) {
        console.error("Erro ao carregar banner de advogado do mês:", error);
      }
    };

    fetchBanner();
  }, []);

  const handleClose = () => {
    sessionStorage.setItem("advogadoMesShown", "true");
    setShow(false);
  };

  if (!show || !imageUrl) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={handleClose}>
          <X size={24} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Advogado do Mês" className={styles.image} />
      </div>
    </div>
  );
}
