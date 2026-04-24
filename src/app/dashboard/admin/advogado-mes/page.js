"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Image as ImageIcon, Save, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabase";

export default function AdvogadoMesAdminPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // O banner especial terá o nome fixo "ADVOGADO_MES"
  const [bannerId, setBannerId] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [status, setStatus] = useState("INACTIVE"); // guardado em link_url

  useEffect(() => {
    const fetchBanner = async () => {
      try {
        const res = await fetch("/api/admin/banners");
        const data = await res.json();
        if (data.success && data.data) {
          const banner = data.data.find(b => b.name === "ADVOGADO_MES");
          if (banner) {
            setBannerId(banner.id);
            setImageUrl(banner.image_url);
            setStatus(banner.link_url === "ACTIVE" ? "ACTIVE" : "INACTIVE");
          }
        }
      } catch (error) {
        console.error("Erro ao buscar banner:", error);
        toast.error("Erro ao carregar dados atuais.");
      } finally {
        setLoading(false);
      }
    };
    fetchBanner();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Enviando imagem...");
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/advogado-mes/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Falha no upload");
      }

      setImageUrl(data.publicUrl);
      toast.success("Upload concluído! Clique em Salvar Configuração.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao fazer upload: ${err.message}`, { id: toastId });
    } finally {
      setSaving(false);
      // Limpar o input para permitir selecionar a mesma imagem novamente
      e.target.value = null;
    }
  };

  const handleSave = async () => {
    if (!imageUrl.trim()) {
      toast.error("A URL da imagem é obrigatória.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: "ADVOGADO_MES",
        image_url: imageUrl.trim(),
        link_url: status
      };

      let url = "/api/admin/banners";
      let method = "POST";

      if (bannerId) {
        url = `/api/admin/banners?id=${bannerId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Configuração salva com sucesso!");
        if (!bannerId && data.data) {
          setBannerId(data.data.id);
        }
      } else {
        toast.error(data.message || "Falha ao salvar.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configuração.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ color: "#fff", padding: "40px" }}>Carregando...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1>
          <Star size={18} color="var(--color-gold)" /> Popup: Advogado do Mês
        </h1>
      </header>

      <div className={styles.container}>
        <p className={styles.description}>
          Configure a imagem que aparecerá no Pop-up "Advogado do Mês" para todos os clientes e advogados quando eles fizerem login na plataforma.
        </p>

        <div className={styles.card}>
          <div className={styles.formGroup}>
            <label>Upload ou URL da Imagem (Card)</label>
            <div className={styles.inputWrap}>
              <ImageIcon size={18} className={styles.inputIcon} />
              <input
                type="text"
                placeholder="https://sua-imagem.com/advogado.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.uploadWrap}>
              <label className={styles.uploadBtn}>
                <UploadCloud size={16} /> Fazer Upload do PC
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  style={{ display: "none" }} 
                  onChange={handleFileUpload}
                  disabled={saving}
                />
              </label>
              <span className={styles.uploadHint}>Máx 5MB (PNG, JPG, WEBP)</span>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Status do Popup</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className={styles.select}
            >
              <option value="INACTIVE">🔴 Desativado (Não vai aparecer)</option>
              <option value="ACTIVE">🟢 Ativo (Vai aparecer nos logins)</option>
            </select>
          </div>

          <div className={styles.previewContainer}>
            <p>Pré-visualização da Imagem:</p>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Preview" className={styles.previewImage} />
            ) : (
              <div className={styles.emptyPreview}>Nenhuma imagem informada</div>
            )}
          </div>

          <button 
            className={styles.saveBtn} 
            onClick={handleSave} 
            disabled={saving}
          >
            {saving ? "Salvando..." : <><Save size={16} /> Salvar Configuração</>}
          </button>
        </div>
      </div>
    </div>
  );
}
