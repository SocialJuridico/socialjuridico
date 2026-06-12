"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  Coins,
  Gauge,
  Save,
  ShieldAlert,
  TicketPercent,
  X,
} from "lucide-react";

import styles from "../CouponsAdmin.module.css";

export default function CouponModal({ coupons }) {
  const modal = coupons.modal;
  const busy = coupons.saving || Boolean(coupons.busyId);

  useEffect(() => {
    if (!modal) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !busy) coupons.closeModal();
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [busy, coupons, modal]);

  if (!modal) return null;

  if (modal.type === "archive") {
    return (
      <div className={styles.modalOverlay} onMouseDown={coupons.closeModal}>
        <section
          className={styles.confirmModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-title"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className={styles.modalClose}
            onClick={coupons.closeModal}
            disabled={busy}
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>

          <span className={styles.dangerIcon}>
            <Archive size={24} aria-hidden="true" />
          </span>
          <span className={styles.eyebrow}>Arquivamento controlado</span>
          <h2 id="archive-title">Arquivar {modal.item.codigo}?</h2>
          <p>
            O cupom será desativado, preservado para auditoria e removido para
            novas compras no Stripe. Usos históricos permanecerão intactos.
          </p>

          <label className={styles.field}>
            <span>Justificativa obrigatória</span>
            <textarea
              rows={4}
              minLength={10}
              maxLength={500}
              placeholder="Explique por que este cupom deve ser arquivado..."
              value={modal.reason}
              onChange={(event) =>
                coupons.setModal((current) => ({
                  ...current,
                  reason: event.target.value,
                }))
              }
              disabled={busy}
            />
            <small>{modal.reason.length}/500 caracteres · mínimo de 10</small>
          </label>

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={coupons.closeModal}
              disabled={busy}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={coupons.archiveCoupon}
              disabled={busy || modal.reason.trim().length < 10}
            >
              <Archive size={15} aria-hidden="true" />
              {coupons.busyId ? "Arquivando..." : "Arquivar cupom"}
            </button>
          </div>
        </section>
      </div>
    );
  }

  const form = modal.form;
  const editing = modal.type === "edit";
  const valueLabel =
    form.desconto_tipo === "PERCENTUAL" ? "Percentual (%)" : "Valor (R$)";

  return (
    <div className={styles.modalOverlay} onMouseDown={coupons.closeModal}>
      <section
        className={styles.formModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coupon-form-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <span className={styles.eyebrow}>Campanha promocional</span>
            <h2 id="coupon-form-title">
              {editing ? `Editar ${modal.item.codigo}` : "Novo cupom"}
            </h2>
            <p>
              Regras comerciais alteradas geram uma nova versão no Stripe sem
              apagar o histórico interno.
            </p>
          </div>
          <button
            type="button"
            className={styles.modalClose}
            onClick={coupons.closeModal}
            disabled={busy}
            aria-label="Fechar"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {editing && coupons.modalDirty && (
          <div className={styles.unsavedNotice} role="status">
            <span />
            Existem alterações ainda não salvas.
          </div>
        )}

        <div className={styles.formSections}>
          <div className={styles.formSection}>
            <div className={styles.formSectionTitle}>
              <TicketPercent size={17} aria-hidden="true" />
              <div>
                <h3>Identificação e aplicação</h3>
                <p>Defina o código e o produto em que ele poderá ser usado.</p>
              </div>
            </div>

            <div className={styles.twoColumnGrid}>
              <label className={styles.field}>
                <span>Código do cupom</span>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="EX.: PRIMEIROMES"
                  value={form.codigo}
                  onChange={(event) =>
                    coupons.updateModalForm(
                      "codigo",
                      event.target.value.toUpperCase().replace(/\s+/g, ""),
                    )
                  }
                  disabled={busy}
                />
                <small>Letras, números, _ ou - · entre 3 e 40 caracteres</small>
              </label>

              <label className={styles.field}>
                <span>Aplicação</span>
                <select
                  value={form.tipo}
                  onChange={(event) =>
                    coupons.updateModalForm("tipo", event.target.value)
                  }
                  disabled={busy}
                >
                  <option value="PLANO_PRO">Planos START e PRO</option>
                  <option value="COMPRA_JURIS">Compra de Juris</option>
                </select>
                <small>
                  {form.tipo === "PLANO_PRO"
                    ? "Válido somente para contratação de planos."
                    : "Válido somente para pacotes de Juris."}
                </small>
              </label>
            </div>

            <label className={styles.field}>
              <span>Descrição interna — opcional</span>
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Ex.: Campanha de lançamento para novos advogados."
                value={form.description}
                onChange={(event) =>
                  coupons.updateModalForm("description", event.target.value)
                }
                disabled={busy}
              />
              <small>{form.description.length}/500 caracteres</small>
            </label>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionTitle}>
              {form.tipo === "PLANO_PRO" ? (
                <ShieldAlert size={17} aria-hidden="true" />
              ) : (
                <Coins size={17} aria-hidden="true" />
              )}
              <div>
                <h3>Regra de desconto</h3>
                <p>O servidor recria o vínculo Stripe quando esta regra muda.</p>
              </div>
            </div>

            <div className={styles.twoColumnGrid}>
              <label className={styles.field}>
                <span>Tipo de desconto</span>
                <select
                  value={form.desconto_tipo}
                  onChange={(event) =>
                    coupons.updateModalForm(
                      "desconto_tipo",
                      event.target.value,
                    )
                  }
                  disabled={busy}
                >
                  <option value="PERCENTUAL">Percentual</option>
                  <option value="FIXO">Valor fixo</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>{valueLabel}</span>
                <input
                  type="number"
                  min="0.01"
                  max={form.desconto_tipo === "PERCENTUAL" ? "100" : undefined}
                  step="0.01"
                  placeholder={form.desconto_tipo === "PERCENTUAL" ? "10" : "20.00"}
                  value={form.valor}
                  onChange={(event) =>
                    coupons.updateModalForm("valor", event.target.value)
                  }
                  disabled={busy}
                />
                {form.tipo === "PLANO_PRO" && (
                  <small>Assinaturas devem manter cobrança mínima de R$ 0,50.</small>
                )}
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionTitle}>
              <Gauge size={17} aria-hidden="true" />
              <div>
                <h3>Limites de utilização</h3>
                <p>Reservas em checkout também contam enquanto estiverem abertas.</p>
              </div>
            </div>

            <div className={styles.twoColumnGrid}>
              <label className={styles.field}>
                <span>Limite por usuário</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={form.limite_por_usuario}
                  onChange={(event) =>
                    coupons.updateModalForm(
                      "limite_por_usuario",
                      event.target.value,
                    )
                  }
                  disabled={busy}
                />
              </label>

              <label className={styles.field}>
                <span>Limite total — opcional</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Sem limite"
                  value={form.limite_total}
                  onChange={(event) =>
                    coupons.updateModalForm("limite_total", event.target.value)
                  }
                  disabled={busy}
                />
                <small>Não pode ser menor que os usos já confirmados.</small>
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <div className={styles.formSectionTitle}>
              <CalendarClock size={17} aria-hidden="true" />
              <div>
                <h3>Disponibilidade</h3>
                <p>Deixe os campos vazios para não limitar o período.</p>
              </div>
            </div>

            <div className={styles.twoColumnGrid}>
              <label className={styles.field}>
                <span>Início</span>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(event) =>
                    coupons.updateModalForm("starts_at", event.target.value)
                  }
                  disabled={busy}
                />
              </label>

              <label className={styles.field}>
                <span>Encerramento</span>
                <input
                  type="datetime-local"
                  min={form.starts_at || undefined}
                  value={form.expira_em}
                  onChange={(event) =>
                    coupons.updateModalForm("expira_em", event.target.value)
                  }
                  disabled={busy}
                />
              </label>
            </div>

            <label className={styles.switchRow}>
              <span className={styles.switchCopy}>
                <strong>Ativar ao salvar</strong>
                <small>A janela de disponibilidade continua sendo respeitada.</small>
              </span>
              <input
                type="checkbox"
                checked={form.ativo}
                onChange={(event) =>
                  coupons.updateModalForm("ativo", event.target.checked)
                }
                disabled={busy}
              />
              <span className={styles.switchTrack} aria-hidden="true">
                <span />
              </span>
            </label>
          </div>
        </div>

        {editing && modal.item.total_usos > 0 && (
          <div className={styles.infoNotice}>
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              Este cupom possui {modal.item.total_usos} uso(s) confirmado(s).
              Alterações comerciais criarão uma nova referência no Stripe, mas o
              histórico continuará vinculado ao mesmo cupom interno.
            </span>
          </div>
        )}

        <div className={styles.modalActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={coupons.closeModal}
            disabled={busy}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={coupons.saveCoupon}
            disabled={busy || (editing && !coupons.modalDirty)}
          >
            <Save size={15} aria-hidden="true" />
            {coupons.saving
              ? "Salvando..."
              : editing
                ? "Salvar alterações"
                : "Criar cupom"}
          </button>
        </div>
      </section>
    </div>
  );
}
