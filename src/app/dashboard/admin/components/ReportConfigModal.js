"use client";

import {
  FileText,
  Loader2,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";

import styles from "../AdminDashboard.module.css";

export default function ReportConfigModal({
  open,
  generating,
  options,
  onChange,
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    dialogRef.current?.focus();

    function handleEscape(event) {
      if (
        event.key === "Escape" &&
        !generating
      ) {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [open, generating, onClose]);

  if (!open) {
    return null;
  }

  function handleOverlayClick(event) {
    if (
      event.target === event.currentTarget &&
      !generating
    ) {
      onClose();
    }
  }

  const targetSelected =
    options.includeLawyers ||
    options.includeClients;

  return (
    <div
      className={styles.reportModalOverlay}
      onMouseDown={handleOverlayClick}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className={styles.reportModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-modal-title"
        tabIndex={-1}
      >
        <header
          className={styles.reportModalHeader}
        >
          <div
            className={
              styles.reportModalTitleArea
            }
          >
            <span
              className={
                styles.reportModalIcon
              }
            >
              <FileText
                size={21}
                aria-hidden="true"
              />
            </span>

            <div>
              <span
                className={
                  styles.reportModalEyebrow
                }
              >
                Relatórios e auditoria
              </span>

              <h2 id="report-modal-title">
                Configurar relatório de uso
              </h2>
            </div>
          </div>

          <button
            type="button"
            className={styles.reportModalClose}
            onClick={onClose}
            disabled={generating}
            aria-label="Fechar configuração"
          >
            <X
              size={19}
              aria-hidden="true"
            />
          </button>
        </header>

        <div className={styles.reportModalBody}>
          <div
            className={
              styles.reportFormGroup
            }
          >
            <label
              htmlFor="report-period"
              className={
                styles.reportFormLabel
              }
            >
              Período analisado
            </label>

            <select
              id="report-period"
              className={
                styles.reportFormSelect
              }
              value={options.period}
              onChange={(event) =>
                onChange(
                  "period",
                  Number(event.target.value),
                )
              }
              disabled={generating}
            >
              <option value={7}>
                Últimos 7 dias
              </option>

              <option value={15}>
                Últimos 15 dias
              </option>

              <option value={30}>
                Últimos 30 dias
              </option>
            </select>
          </div>

          <fieldset
            className={
              styles.reportFieldset
            }
          >
            <legend>
              Públicos incluídos
            </legend>

            <p>
              Selecione quais tipos de usuários
              devem aparecer nas métricas de
              acesso.
            </p>

            <label
              className={
                styles.reportCheckbox
              }
            >
              <input
                type="checkbox"
                checked={
                  options.includeLawyers
                }
                onChange={(event) =>
                  onChange(
                    "includeLawyers",
                    event.target.checked,
                  )
                }
                disabled={generating}
              />

              <span>
                <strong>
                  Advogados
                </strong>

                <small>
                  Cadastros e logins de
                  profissionais
                </small>
              </span>
            </label>

            <label
              className={
                styles.reportCheckbox
              }
            >
              <input
                type="checkbox"
                checked={
                  options.includeClients
                }
                onChange={(event) =>
                  onChange(
                    "includeClients",
                    event.target.checked,
                  )
                }
                disabled={generating}
              />

              <span>
                <strong>
                  Clientes
                </strong>

                <small>
                  Cadastros e logins de
                  usuários contratantes
                </small>
              </span>
            </label>

            {!targetSelected && (
              <p
                className={
                  styles.reportValidation
                }
                role="alert"
              >
                Selecione pelo menos um
                público.
              </p>
            )}
          </fieldset>

          <fieldset
            className={
              styles.reportFieldset
            }
          >
            <legend>
              Métricas complementares
            </legend>

            <p>
              Esses dados são opcionais e
              aparecem no resumo executivo.
            </p>

            <label
              className={
                styles.reportCheckbox
              }
            >
              <input
                type="checkbox"
                checked={
                  options.includeDbTotals
                }
                onChange={(event) =>
                  onChange(
                    "includeDbTotals",
                    event.target.checked,
                  )
                }
                disabled={generating}
              />

              <span>
                <strong>
                  Totais de cadastros
                </strong>

                <small>
                  Quantidade total no banco de
                  dados
                </small>
              </span>
            </label>

            <label
              className={
                styles.reportCheckbox
              }
            >
              <input
                type="checkbox"
                checked={
                  options.includeSatisfaction
                }
                onChange={(event) =>
                  onChange(
                    "includeSatisfaction",
                    event.target.checked,
                  )
                }
                disabled={generating}
              />

              <span>
                <strong>
                  Satisfação da plataforma
                </strong>

                <small>
                  Média e total de pesquisas
                  respondidas
                </small>
              </span>
            </label>
          </fieldset>
        </div>

        <footer
          className={
            styles.reportModalFooter
          }
        >
          <button
            type="button"
            className={
              styles.reportSecondaryButton
            }
            onClick={onClose}
            disabled={generating}
          >
            Cancelar
          </button>

          <button
            type="button"
            className={
              styles.reportPrimaryButton
            }
            onClick={onConfirm}
            disabled={
              generating ||
              !targetSelected
            }
          >
            {generating ? (
              <>
                <Loader2
                  size={18}
                  className={styles.spinner}
                  aria-hidden="true"
                />

                Gerando...
              </>
            ) : (
              <>
                <FileText
                  size={18}
                  aria-hidden="true"
                />

                Gerar relatório
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}