"use client";

import { AlertTriangle, Building2, UserPlus, X } from "lucide-react";
import { useEffect, useRef } from "react";

import {
  BRAZIL_STATES,
  OFFICE_AREAS,
  OFFICE_PLANS,
} from "../utils/officeConstants";
import { formatCep, formatCnpj } from "../utils/officeFormatters";
import styles from "../EscritoriosAdmin.module.css";

function ModalShell({ title, icon: Icon, children, busy, onClose, wide = false }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      role="presentation"
    >
      <section
        ref={dialogRef}
        className={`${styles.modalCard} ${wide ? styles.modalCardWide : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="office-modal-title"
        tabIndex={-1}
      >
        <header className={styles.modalHeader}>
          <span className={styles.modalIcon}><Icon size={20} aria-hidden="true" /></span>
          <div>
            <span className={styles.modalEyebrow}>Ação administrativa</span>
            <h2 id="office-modal-title">{title}</h2>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} disabled={busy} aria-label="Fechar modal">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function OfficeForm({ form, setForm, onSubmit, busy, onClose, onLogo }) {
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form onSubmit={onSubmit}>
      <div className={styles.modalBody}>
        <div className={styles.formGrid}>
          <label className={styles.formGroup}>
            <span>Nome do escritório</span>
            <input required value={form.nome} onChange={(event) => update("nome", event.target.value)} />
          </label>
          <label className={styles.formGroup}>
            <span>CNPJ</span>
            <input required value={form.cnpj} onChange={(event) => update("cnpj", formatCnpj(event.target.value))} maxLength={18} />
          </label>
          <label className={styles.formGroup}>
            <span>Responsável</span>
            <input required value={form.nome_responsavel} onChange={(event) => update("nome_responsavel", event.target.value)} />
          </label>
          <label className={styles.formGroup}>
            <span>E-mail de login/contato</span>
            <input type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} />
          </label>
          <label className={styles.formGroup}>
            <span>Senha de login</span>
            <input type="password" required minLength={8} value={form.senha} onChange={(event) => update("senha", event.target.value)} />
          </label>
          <label className={styles.formGroup}>
            <span>Plano inicial</span>
            <select value={form.plano} onChange={(event) => update("plano", event.target.value)}>
              {OFFICE_PLANS.map((plan) => <option key={plan.value} value={plan.value}>{plan.label}</option>)}
            </select>
          </label>
          <label className={styles.formGroup}>
            <span>Máximo de advogados</span>
            <input type="number" min="1" max="20" value={form.max_advogados} onChange={(event) => update("max_advogados", Number(event.target.value))} />
          </label>
          <label className={styles.formGroup}>
            <span>Máximo de estagiários</span>
            <input type="number" min="0" max="10" value={form.max_estagiarios} onChange={(event) => update("max_estagiarios", Number(event.target.value))} />
          </label>
          <label className={styles.formGroup}>
            <span>CEP</span>
            <input value={form.cep} onChange={(event) => update("cep", formatCep(event.target.value))} maxLength={9} />
          </label>
          <label className={styles.formGroup}>
            <span>Cidade/Estado</span>
            <input value={form.cidade_estado} onChange={(event) => update("cidade_estado", event.target.value)} />
          </label>
          <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
            <span>Endereço completo</span>
            <input value={form.endereco} onChange={(event) => update("endereco", event.target.value)} />
          </label>
          <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
            <span>URL da logo</span>
            <input value={form.logo_url} onChange={(event) => update("logo_url", event.target.value)} placeholder="https://..." />
          </label>
          <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
            <span>Ou envie uma imagem da logo</span>
            <input type="file" accept="image/*" onChange={(event) => onLogo(event.target.files?.[0])} />
          </label>
          <fieldset className={styles.formGroupFull}>
            <legend>Áreas de atuação</legend>
            <div className={styles.checkboxGrid}>
              {OFFICE_AREAS.map((area) => (
                <label key={area} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.areas_atuacao.includes(area)}
                    onChange={(event) => update(
                      "areas_atuacao",
                      event.target.checked
                        ? [...form.areas_atuacao, area]
                        : form.areas_atuacao.filter((item) => item !== area),
                    )}
                  />
                  {area}
                </label>
              ))}
            </div>
          </fieldset>
          <label className={`${styles.formGroup} ${styles.formGroupFull}`}>
            <span>Estado atendido</span>
            <select
              value={form.estados_atendidos?.[0] === "Todo o Território Brasileiro" ? "Nacional" : form.estados_atendidos?.[0] || "Nacional"}
              onChange={(event) => update("estados_atendidos", event.target.value === "Nacional" ? ["Todo o Território Brasileiro"] : [event.target.value])}
            >
              <option value="Nacional">Todo o território brasileiro</option>
              {BRAZIL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
        </div>

        <div className={styles.securityNotice}>
          <AlertTriangle size={17} aria-hidden="true" />
          <span>O login legado do proprietário ainda utiliza senha do escritório. A migração para autenticação segura será feita na etapa técnica.</span>
        </div>
      </div>

      <footer className={styles.modalActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" className={styles.goldButton} disabled={busy}>{busy ? "Cadastrando..." : "Cadastrar escritório"}</button>
      </footer>
    </form>
  );
}

function StaffForm({ office, form, setForm, onSubmit, busy, onClose }) {
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form onSubmit={onSubmit}>
      <div className={styles.modalBody}>
        <p className={styles.modalIntro}>Novo membro para <strong>{office.nome}</strong>.</p>
        <div className={styles.formGrid}>
          <label className={styles.formGroup}>
            <span>Nome completo</span>
            <input required value={form.name} onChange={(event) => update("name", event.target.value)} />
          </label>
          <label className={styles.formGroup}>
            <span>E-mail</span>
            <input type="email" required value={form.email} onChange={(event) => update("email", event.target.value)} />
          </label>
          <label className={styles.formGroup}>
            <span>Senha inicial</span>
            <input type="password" required minLength={8} value={form.senha} onChange={(event) => update("senha", event.target.value)} />
          </label>
          <label className={styles.formGroup}>
            <span>Cargo</span>
            <select value={form.cargo} onChange={(event) => update("cargo", event.target.value)}>
              <option value="advogado">Advogado</option>
              <option value="estagiario">Estagiário</option>
            </select>
          </label>
          <label className={styles.formGroup}>
            <span>Telefone/WhatsApp</span>
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </label>
          <label className={styles.formGroup}>
            <span>OAB</span>
            <input value={form.oab} onChange={(event) => update("oab", event.target.value)} disabled={form.cargo === "estagiario"} />
          </label>
          <label className={styles.formGroup}>
            <span>UF da OAB</span>
            <select value={form.estado} onChange={(event) => update("estado", event.target.value)} disabled={form.cargo === "estagiario"}>
              {BRAZIL_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
          </label>
        </div>
      </div>
      <footer className={styles.modalActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="submit" className={styles.goldButton} disabled={busy}>{busy ? "Cadastrando..." : "Cadastrar e associar"}</button>
      </footer>
    </form>
  );
}

export default function OfficeModals({
  modal,
  officeForm,
  setOfficeForm,
  staffForm,
  setStaffForm,
  selectedOffice,
  busy,
  onClose,
  onCreateOffice,
  onCreateStaff,
  onDelete,
  onLogo,
}) {
  if (!modal) return null;

  if (modal.type === "create") {
    return (
      <ModalShell title="Cadastrar escritório Enterprise" icon={Building2} busy={busy} onClose={onClose} wide>
        <OfficeForm form={officeForm} setForm={setOfficeForm} onSubmit={onCreateOffice} busy={busy} onClose={onClose} onLogo={onLogo} />
      </ModalShell>
    );
  }

  if (modal.type === "staff" && selectedOffice) {
    return (
      <ModalShell title="Adicionar membro" icon={UserPlus} busy={busy} onClose={onClose}>
        <StaffForm office={selectedOffice} form={staffForm} setForm={setStaffForm} onSubmit={onCreateStaff} busy={busy} onClose={onClose} />
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Excluir escritório" icon={AlertTriangle} busy={busy} onClose={onClose}>
      <div className={styles.modalBody}>
        <p className={styles.modalIntro}>
          Confirma a exclusão de <strong>{modal.office?.nome || "este escritório"}</strong>?
        </p>
        <div className={styles.dangerNotice}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>Os membros serão desassociados e perderão os benefícios Enterprise. Esta ação não poderá ser desfeita.</span>
        </div>
      </div>
      <footer className={styles.modalActions}>
        <button type="button" className={styles.secondaryButton} onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className={styles.dangerButton} onClick={onDelete} disabled={busy}>{busy ? "Excluindo..." : "Confirmar exclusão"}</button>
      </footer>
    </ModalShell>
  );
}
