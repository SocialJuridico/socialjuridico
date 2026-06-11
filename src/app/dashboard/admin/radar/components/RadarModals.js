"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { CATEGORY_OPTIONS } from "../utils/radarFormatters";
import styles from "../page.module.css";

export default function RadarModals({
  editingItem,
  setEditingItem,
  rejectingId,
  setRejectingId,
  rejectReason,
  setRejectReason,
  busy,
  onReject,
  onSaveEdit,
}) {
  const dialogRef = useRef(null);
  const open = Boolean(editingItem || rejectingId);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key !== "Escape" || busy) return;
      setEditingItem(null);
      setRejectingId(null);
      setRejectReason("");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, busy, setEditingItem, setRejectingId, setRejectReason]);

  if (!open) return null;

  const close = () => {
    if (busy) return;
    setEditingItem(null);
    setRejectingId(null);
    setRejectReason("");
  };

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => event.target === event.currentTarget && close()}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <div>
            <span>{editingItem ? "Edição administrativa" : "Curadoria"}</span>
            <h2>{editingItem ? "Editar oportunidade" : "Rejeitar oportunidade"}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={close} aria-label="Fechar modal">
            <X size={18} />
          </button>
        </header>

        {editingItem ? (
          <form onSubmit={onSaveEdit}>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Título</span>
                  <input required value={editingItem.titulo || ""} onChange={(e) => setEditingItem({ ...editingItem, titulo: e.target.value })} />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>URL original</span>
                  <input type="url" required value={editingItem.url_original || ""} onChange={(e) => setEditingItem({ ...editingItem, url_original: e.target.value })} />
                </label>
                <label className={styles.formGroup}>
                  <span>Categoria</span>
                  <select value={editingItem.categoria || "Outros"} onChange={(e) => setEditingItem({ ...editingItem, categoria: e.target.value })}>
                    {CATEGORY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Fonte</span>
                  <input required value={editingItem.fonte || ""} onChange={(e) => setEditingItem({ ...editingItem, fonte: e.target.value })} />
                </label>
                <label className={styles.formGroup}>
                  <span>Cidade</span>
                  <input value={editingItem.cidade || ""} onChange={(e) => setEditingItem({ ...editingItem, cidade: e.target.value })} />
                </label>
                <label className={styles.formGroup}>
                  <span>Estado</span>
                  <input maxLength={2} value={editingItem.estado || ""} onChange={(e) => setEditingItem({ ...editingItem, estado: e.target.value.toUpperCase() })} />
                </label>
                <label className={styles.formGroup}>
                  <span>Score</span>
                  <input type="number" min="0" max="100" value={editingItem.score_intencao ?? 0} onChange={(e) => setEditingItem({ ...editingItem, score_intencao: Number(e.target.value) })} />
                </label>
                <label className={styles.formGroup}>
                  <span>Urgência</span>
                  <select value={editingItem.urgencia || "media"} onChange={(e) => setEditingItem({ ...editingItem, urgencia: e.target.value })}>
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Trecho público</span>
                  <textarea rows={3} maxLength={500} value={editingItem.trecho_publico || ""} onChange={(e) => setEditingItem({ ...editingItem, trecho_publico: e.target.value })} />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Resumo IA</span>
                  <textarea rows={3} value={editingItem.resumo_ia || ""} onChange={(e) => setEditingItem({ ...editingItem, resumo_ia: e.target.value })} />
                </label>
              </div>
            </div>
            <footer className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={close}>Cancelar</button>
              <button type="submit" className={styles.goldButton} disabled={busy === editingItem.id}>{busy === editingItem.id ? "Salvando..." : "Salvar alterações"}</button>
            </footer>
          </form>
        ) : (
          <>
            <div className={styles.modalBody}>
              <div className={styles.dangerNotice}>
                <AlertTriangle size={17} />
                <span>Informe um motivo objetivo. Ele ficará registrado para auditoria da curadoria.</span>
              </div>
              <label className={styles.formGroup}>
                <span>Motivo da rejeição</span>
                <textarea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Ex.: conteúdo duplicado, sem intenção jurídica ou com dados pessoais expostos." />
              </label>
            </div>
            <footer className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={close}>Cancelar</button>
              <button type="button" className={styles.dangerButton} onClick={onReject} disabled={busy === rejectingId}>{busy === rejectingId ? "Rejeitando..." : "Confirmar rejeição"}</button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
