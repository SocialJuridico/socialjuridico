/**
 * Componente de Input Seguro para Campos Sensíveis
 * Exibe como texto estático com botão de editar
 * Útil para: CPF, CNPJ, Telefone, Email
 */

"use client";

import { useState } from "react";
import { Pencil, X, Check } from "lucide-react";
import styles from "./SecureSensitiveInput.module.css";

export default function SecureSensitiveInput({
  label,
  value,
  type = "text",
  onChange,
  placeholder = "",
  maskFunction = null,
  icon: Icon = null,
  readOnly = false,
  required = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");

  const handleSave = () => {
    if (onChange) {
      onChange(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const displayValue = maskFunction ? maskFunction(value) : value;

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        {Icon && <Icon size={14} style={{ marginRight: 6 }} />}
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>

      {!isEditing ? (
        <div className={styles.viewMode}>
          <span className={styles.value}>{displayValue || "—"}</span>
          {!readOnly && (
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setIsEditing(true)}
              title="Editar campo"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      ) : (
        <div className={styles.editMode}>
          <input
            type={type}
            className={styles.input}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder={placeholder}
            autoFocus
          />
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              title="Salvar alteração"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={handleCancel}
              title="Cancelar edição"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
