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
};

export default function AdminBannersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [modal, setModal] = useState(null);

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
  const openEdit = (banner) =>
    setModal({
      type: "edit",
      id: banner.id,
      form: {
        name: banner.name || "",
        image_url: banner.image_url || "",
        link_url: banner.link_url || "",
      },
    });

  const submitModal = async () => {
    if (!modal) return;
    const form = modal.form;
    if (!form.name.trim() || !form.image_url.trim()) {
      toast.error("Nome e URL da imagem são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const method = modal.type === "create" ? "POST" : "PUT";
      const url =
        modal.type === "create"
          ? "/api/admin/banners"
          : `/api/admin/banners?id=${modal.id}`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Falha ao salvar banner");
        return;
      }

      toast.success(
        modal.type === "create" ? "Banner criado" : "Banner atualizado",
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
              <label>URL da imagem</label>
              <input
                value={modal.form.image_url}
                onChange={(e) =>
                  setModal((prev) => ({
                    ...prev,
                    form: { ...prev.form, image_url: e.target.value },
                  }))
                }
              />
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
