"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
} from "lucide-react";
import toast from "react-hot-toast";
import styles from "./BannersAdmin.module.css";

const INITIAL_FORM = {
  name: "",
  image_url: "",
  link_url: "",
  position: "left",
  display_mode: "new",
  target_banner_id: "",
};

export default function AdminBannersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [modal, setModal] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/banners/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Erro ao fazer upload da imagem");
        return;
      }

      setModal((prev) => ({
        ...prev,
        form: { ...prev.form, image_url: data.publicUrl },
      }));
      toast.success("Upload concluído com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setUploading(false);
    }
  };

  const loadBanners = useCallback(async () => {
    const res = await fetch("/api/admin/banners", { cache: "no-store" });
    const data = await res.json();

    if (!res.ok || !data.success) {
      toast.error(data.message || "Falha ao carregar banners");
      if (res.status === 401 || res.status === 403)
        router.replace("/dashboard/cliente");
      return;
    }

    setBanners(data.data || []);
  }, [router]);

  useEffect(() => {
    const run = async () => {
      try {
        await loadBanners();
      } catch (error) {
        console.error(error);
        toast.error("Erro ao carregar banners");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [loadBanners]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return banners;
    return banners.filter((b) => {
      const name = String(b.name || "").toLowerCase();
      const link = String(b.link_url || "").toLowerCase();
      return name.includes(term) || link.includes(term);
    });
  }, [banners, search]);

  const openCreate = () => setModal({ type: "create", form: INITIAL_FORM });
  const openEdit = (banner) => {
    const isLooping = banners.some(
      (b) =>
        b.id !== banner.id &&
        b.position === banner.position &&
        b.slot_index === banner.slot_index
    );
    const otherBannerWithSameSlot = banners.find(
      (b) =>
        b.id !== banner.id &&
        b.position === banner.position &&
        b.slot_index === banner.slot_index
    );

    setModal({
      type: "edit",
      id: banner.id,
      form: {
        name: banner.name || "",
        image_url: banner.image_url || "",
        link_url: banner.link_url || "",
        position: banner.position || "left",
        slot_index: banner.slot_index !== undefined ? banner.slot_index : 0,
        display_mode: isLooping ? "loop" : "new",
        target_banner_id: otherBannerWithSameSlot ? otherBannerWithSameSlot.id : "",
      },
    });
  };

  const submitModal = async () => {
    if (!modal) return;
    const form = modal.form;
    if (!form.name.trim() || !form.image_url.trim()) {
      toast.error("Nome e URL da imagem são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      let finalSlotIndex = 0;
      if (form.display_mode === "loop") {
        const target = banners.find((b) => b.id === form.target_banner_id);
        if (target) {
          finalSlotIndex = target.slot_index;
        } else {
          finalSlotIndex = form.slot_index !== undefined ? form.slot_index : 0;
        }
      } else {
        const positionBanners = banners.filter(
          (b) => b.position === form.position && b.id !== modal.id
        );
        const maxSlot = positionBanners.reduce(
          (max, b) => (b.slot_index > max ? b.slot_index : max),
          -1
        );
        finalSlotIndex = maxSlot + 1;
      }

      const payload = {
        name: form.name,
        image_url: form.image_url,
        link_url: form.link_url,
        position: form.position,
        slot_index: finalSlotIndex,
      };

      const method = modal.type === "create" ? "POST" : "PUT";
      const url =
        modal.type === "create"
          ? "/api/admin/banners"
          : `/api/admin/banners?id=${modal.id}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao salvar banner");
        return;
      }

      toast.success(
        modal.type === "create" ? "Banner criado" : "Banner atualizado"
      );
      setModal(null);
      await loadBanners();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar banner");
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (banner) => {
    setDeletingId(banner.id);
    try {
      const res = await fetch(`/api/admin/banners?id=${banner.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao excluir banner");
        return;
      }
      toast.success("Banner removido");
      setModal(null);
      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir banner");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading)
    return <div className={styles.loading}>Carregando banners...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard/admin" className={styles.backLink}>
          <ArrowLeft size={16} /> Voltar ao painel admin
        </Link>
        <h1>
          <ImageIcon size={18} /> Banners
        </h1>
      </header>

      <div className={styles.topBar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Buscar banner por nome ou link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className={styles.addBtn} type="button" onClick={openCreate}>
          <Plus size={14} /> Novo banner
        </button>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <p className={styles.empty}>Nenhum banner encontrado.</p>
        ) : (
          filtered.map((banner) => (
            <article key={banner.id} className={styles.item}>
              <div className={styles.previewWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={banner.image_url}
                  alt={banner.name || "Banner"}
                  className={styles.preview}
                />
              </div>
              <div className={styles.itemInfo}>
                <h3>{banner.name || "Sem nome"}</h3>
                <p>{banner.link_url || "Sem link"}</p>
                <div style={{ marginTop: "6px", display: "flex", gap: "8px" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: "rgba(0, 180, 216, 0.15)",
                      color: "#00b4d8",
                      fontWeight: "600",
                    }}
                  >
                    {banner.position === "right" ? "👉 Lado Direito" : "👈 Lado Esquerdo"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "rgba(255, 255, 255, 0.6)",
                      fontWeight: "600",
                    }}
                  >
                    Bloco #{banner.slot_index}
                  </span>
                </div>
              </div>
              <div className={styles.itemActions}>
                <button
                  type="button"
                  className={styles.editBtn}
                  onClick={() => openEdit(banner)}
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => setModal({ type: "delete", item: banner })}
                  disabled={deletingId === banner.id}
                >
                  <Trash2 size={14} />
                  {deletingId === banner.id ? "Excluindo..." : "Excluir"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {modal && (modal.type === "create" || modal.type === "edit") && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>{modal.type === "create" ? "Novo banner" : "Editar banner"}</h3>
            <div className={styles.formGroup}>
              <label>Nome</label>
              <input
                value={modal.form.name}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, name: e.target.value },
                  }))
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Imagem do Banner (Upload ou URL)</label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="URL da imagem"
                  value={modal.form.image_url}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, image_url: e.target.value },
                    }))
                  }
                  style={{ flex: 1 }}
                />
                <label
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px dashed rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    padding: "10px 14px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "rgba(255,255,255,0.85)"
                  }}
                >
                  {uploading ? "Enviando..." : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: "none" }}
                    disabled={uploading}
                  />
                </label>
              </div>
              {modal.form.image_url && (
                <div style={{
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "8px",
                  overflow: "hidden",
                  maxWidth: "180px",
                  maxHeight: "120px",
                  background: "rgba(0,0,0,0.2)",
                  padding: "4px"
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={modal.form.image_url} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Link (opcional)</label>
              <input
                value={modal.form.link_url}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, link_url: e.target.value },
                  }))
                }
              />
            </div>
            <div className={styles.formGroup}>
              <label>Lado (Posição)</label>
              <select
                value={modal.form.position}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, position: e.target.value, target_banner_id: "" },
                  }))
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff"
                }}
              >
                <option value="left">👈 Lado Esquerdo</option>
                <option value="right">👉 Lado Direito</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Comportamento de Exibição</label>
              <select
                value={modal.form.display_mode}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, display_mode: e.target.value, target_banner_id: "" },
                  }))
                }
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff"
                }}
              >
                <option value="new">Novo bloco (Ficar abaixo dos outros)</option>
                <option value="loop">Looping (Rotacionar em bloco existente)</option>
              </select>
            </div>

            {modal.form.display_mode === "loop" && (
              <div className={styles.formGroup}>
                <label>Selecionar Bloco para Looping</label>
                <select
                  value={modal.form.target_banner_id}
                  onChange={(e) =>
                    setModal((prev) => ({
                      ...prev,
                      form: { ...prev.form, target_banner_id: e.target.value },
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    background: "#1e293b",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#fff"
                  }}
                >
                  <option value="">-- Selecione o banner parceiro de loop --</option>
                  {banners
                    .filter((b) => b.position === modal.form.position && b.id !== modal.id)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} (Bloco #{b.slot_index})
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={submitModal}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && modal.type === "delete" && (
        <div className={styles.modalOverlay} onClick={() => setModal(null)}>
          <div
            className={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Excluir banner</h3>
            <p>
              Confirma excluir o banner{" "}
              <strong>{modal.item.name || "sem nome"}</strong>?
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.confirmBtn}
                onClick={() => deleteBanner(modal.item)}
                disabled={deletingId === modal.item.id}
              >
                {deletingId === modal.item.id ? "Excluindo..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
