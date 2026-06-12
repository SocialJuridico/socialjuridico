"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
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
  deletingItem,
  setDeletingItem,
  deleteReason,
  setDeleteReason,
  busy,
  onReject,
  onDelete,
  onSaveEdit,
}) {
  const dialogRef = useRef(null);
  const open = Boolean(editingItem || rejectingId || deletingItem);

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
      setDeletingItem(null);
      setDeleteReason("");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    open,
    busy,
    setEditingItem,
    setRejectingId,
    setRejectReason,
    setDeletingItem,
    setDeleteReason,
  ]);

  if (!open) return null;

  const close = () => {
    if (busy) return;
    setEditingItem(null);
    setRejectingId(null);
    setRejectReason("");
    setDeletingItem(null);
    setDeleteReason("");
  };

  const title = editingItem
    ? "Editar oportunidade"
    : deletingItem
      ? "Apagar oportunidade aprovada"
      : "Rejeitar oportunidade";

  const eyebrow = editingItem
    ? "Edição administrativa"
    : deletingItem
      ? "Exclusão auditável"
      : "Curadoria";

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
            <span>{eyebrow}</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={close}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </header>

        {editingItem ? (
          <form onSubmit={onSaveEdit}>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Título</span>
                  <input
                    required
                    value={editingItem.titulo || ""}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        titulo: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>URL original</span>
                  <input
                    type="url"
                    required
                    value={editingItem.url_original || ""}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        url_original: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Categoria</span>
                  <select
                    value={editingItem.categoria || "Outros"}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        categoria: event.target.value,
                      })
                    }
                  >
                    {CATEGORY_OPTIONS.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.formGroup}>
                  <span>Fonte</span>
                  <input
                    required
                    value={editingItem.fonte || ""}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        fonte: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Cidade</span>
                  <input
                    value={editingItem.cidade || ""}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        cidade: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Estado</span>
                  <input
                    maxLength={2}
                    value={editingItem.estado || ""}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        estado: event.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Score</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingItem.score_intencao ?? 0}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        score_intencao: Number(event.target.value),
                      })
                    }
                  />
                </label>
                <label className={styles.formGroup}>
                  <span>Urgência</span>
                  <select
                    value={editingItem.urgencia || "media"}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        urgencia: event.target.value,
                      })
                    }
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                  </select>
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Trecho público</span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={editingItem.trecho_publico || ""}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        trecho_publico: event.target.value,
                      })
                    }
                  />
                </label>
                <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
                  <span>Resumo IA</span>
                  <textarea
                    rows={3}
                    value={editingItem.resumo_ia || ""}
                    onChange={(event) =>
                      setEditingItem({
                        ...editingItem,
                        resumo_ia: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
            </div>
            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={close}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.goldButton}
                disabled={busy === editingItem.id}
              >
                {busy === editingItem.id ? "Salvando..." : "Salvar alterações"}
              </button>
            </footer>
          </form>
        ) : deletingItem ? (
          <>
            <div className={styles.modalBody}>
              <div className={styles.dangerNotice}>
                <Trash2 size={17} />
                <span>
                  A oportunidade e seus registros de clique serão apagados. Um
                  registro mínimo da operação será mantido para auditoria.
                </span>
              </div>

              <p>
                Confirma a exclusão de <strong>{deletingItem.titulo}</strong>?
              </p>

              <label className={styles.formGroup}>
                <span>Justificativa da exclusão</span>
                <textarea
                  rows={4}
                  minLength={10}
                  maxLength={1000}
                  value={deleteReason}
                  onChange={(event) => setDeleteReason(event.target.value)}
                  placeholder="Ex.: oportunidade encerrada, conteúdo removido da fonte ou exclusão administrativa antecipada."
                />
              </label>
            </div>
            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={close}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={onDelete}
                disabled={busy === deletingItem.id || deleteReason.trim().length < 10}
              >
                {busy === deletingItem.id
                  ? "Apagando..."
                  : "Apagar oportunidade"}
              </button>
            </footer>
          </>
        ) : (
          <>
            <div className={styles.modalBody}>
              <div className={styles.dangerNotice}>
                <AlertTriangle size={17} />
                <span>
                  Informe um motivo objetivo. Ele ficará registrado para
                  auditoria da curadoria.
                </span>
              </div>
              <label className={styles.formGroup}>
                <span>Motivo da rejeição</span>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  placeholder="Ex.: conteúdo duplicado, sem intenção jurídica ou com dados pessoais expostos."
                />
              </label>
            </div>
            <footer className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={close}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={onReject}
                disabled={busy === rejectingId}
              >
                {busy === rejectingId
                  ? "Rejeitando..."
                  : "Confirmar rejeição"}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}
