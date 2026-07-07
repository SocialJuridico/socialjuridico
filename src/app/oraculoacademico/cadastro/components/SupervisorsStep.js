"use client";

import { Plus, Trash2 } from "lucide-react";

import { BR_STATES } from "@/lib/brStates";
import { normalizeOABNumber, normalizeUF } from "@/lib/oab";

import styles from "../OraculoWizard.module.css";

export const RELACAO_OPTIONS = [
  { value: "PROFESSOR", label: "Professor" },
  { value: "ADVOGADO_CONHECIDO", label: "Advogado conhecido" },
  { value: "ADVOGADO_ESCRITORIO", label: "Advogado do escritório onde estagia" },
  { value: "COORDENADOR_ACADEMICO", label: "Coordenador acadêmico" },
  { value: "MENTOR", label: "Mentor" },
  { value: "OUTRO", label: "Outro" },
];

const EMPTY_SUPERVISOR = { nome: "", email: "", oab_numero: "", oab_uf: "", relacao: "" };

export function createEmptySupervisor() {
  return { ...EMPTY_SUPERVISOR };
}

export default function SupervisorsStep({ supervisores, onChange, disabled }) {
  function updateSupervisor(index, field, value) {
    const next = supervisores.map((item, itemIndex) =>
      itemIndex === index ? { ...item, [field]: value } : item,
    );
    onChange(next);
  }

  function addSupervisor() {
    if (supervisores.length >= 3) return;
    onChange([...supervisores, createEmptySupervisor()]);
  }

  function removeSupervisor(index) {
    if (supervisores.length <= 1) return;
    onChange(supervisores.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div>
      <p className={styles.hint} style={{ marginBottom: 16 }}>
        Indique de 1 a 3 advogados supervisores (&quot;padrinhos&quot;). Eles
        vão receber um e-mail para confirmar ou recusar o convite.
      </p>

      {supervisores.map((supervisor, index) => (
        <div key={index} className={styles.supervisorCard}>
          <div className={styles.supervisorHeader}>
            <strong>Supervisor {index + 1}</strong>

            {supervisores.length > 1 && (
              <button
                type="button"
                className={styles.removeSupervisor}
                onClick={() => removeSupervisor(index)}
                disabled={disabled}
              >
                <Trash2 size={13} aria-hidden="true" />
                Remover
              </button>
            )}
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nome do advogado</label>
              <input
                type="text"
                value={supervisor.nome}
                onChange={(event) =>
                  updateSupervisor(index, "nome", event.target.value)
                }
                className={styles.input}
                maxLength={120}
                disabled={disabled}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>E-mail do advogado</label>
              <input
                type="email"
                value={supervisor.email}
                onChange={(event) =>
                  updateSupervisor(index, "email", event.target.value)
                }
                className={styles.input}
                maxLength={160}
                disabled={disabled}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Número da OAB</label>
              <input
                type="text"
                value={supervisor.oab_numero}
                onChange={(event) =>
                  updateSupervisor(
                    index,
                    "oab_numero",
                    normalizeOABNumber(event.target.value),
                  )
                }
                className={styles.input}
                inputMode="numeric"
                maxLength={10}
                disabled={disabled}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>UF da OAB</label>
              <select
                value={supervisor.oab_uf}
                onChange={(event) =>
                  updateSupervisor(
                    index,
                    "oab_uf",
                    normalizeUF(event.target.value),
                  )
                }
                className={styles.input}
                disabled={disabled}
              >
                <option value="">Selecione</option>
                {BR_STATES.map(([uf, name]) => (
                  <option key={uf} value={uf}>
                    {uf} — {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Relação com o candidato</label>
            <select
              value={supervisor.relacao}
              onChange={(event) =>
                updateSupervisor(index, "relacao", event.target.value)
              }
              className={styles.input}
              disabled={disabled}
            >
              <option value="">Selecione</option>
              {RELACAO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ))}

      {supervisores.length < 3 && (
        <button
          type="button"
          className={styles.addSupervisor}
          onClick={addSupervisor}
          disabled={disabled}
        >
          <Plus size={15} aria-hidden="true" />
          Adicionar outro supervisor
        </button>
      )}
    </div>
  );
}
