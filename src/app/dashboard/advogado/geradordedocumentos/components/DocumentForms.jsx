"use client";

import { CONTRACT_TYPES, DOCUMENT_TONES } from "../documentGeneratorUtils";
import styles from "../DocumentGenerator.module.css";
import PartyFields from "./PartyFields";

function ToneSelector({ value, onChange, disabled }) {
  return (
    <div className={styles.field}>
      <span>Estilo de redação</span>
      <div className={styles.toneGrid}>
        {DOCUMENT_TONES.map((tone) => (
          <button
            key={tone}
            type="button"
            className={value === tone ? styles.activeTone : ""}
            onClick={() => onChange(tone)}
            disabled={disabled}
          >
            {tone}
          </button>
        ))}
      </div>
    </div>
  );
}

function FooterFields({ value, onChange, disabled }) {
  return (
    <div className={styles.threeColumns}>
      <label className={styles.field}>
        <span>Comarca/foro</span>
        <input
          value={value.jurisdiction}
          onChange={(event) => onChange({ jurisdiction: event.target.value })}
          placeholder="Ex.: Porto Alegre/RS"
          maxLength={100}
          disabled={disabled}
        />
      </label>
      <label className={styles.field}>
        <span>Local</span>
        <input
          value={value.city}
          onChange={(event) => onChange({ city: event.target.value })}
          placeholder="Cidade"
          maxLength={100}
          disabled={disabled}
        />
      </label>
      <label className={styles.field}>
        <span>Data</span>
        <input
          type="date"
          value={value.date}
          onChange={(event) => onChange({ date: event.target.value })}
          disabled={disabled}
        />
      </label>
    </div>
  );
}

export function ContractForm({ controller, disabled }) {
  const form = controller.contract;
  return (
    <>
      <label className={styles.field}>
        <span>Tipo de contrato</span>
        <select
          value={form.type}
          onChange={(event) => controller.updateContract({ type: event.target.value })}
          disabled={disabled}
        >
          {CONTRACT_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </label>
      <ToneSelector
        value={form.tone}
        onChange={(tone) => controller.updateContract({ tone })}
        disabled={disabled}
      />
      <PartyFields
        title="Contratante"
        value={form.partyOne}
        onChange={(patch) => controller.updateContractParty("partyOne", patch)}
      />
      <PartyFields
        title="Contratado"
        value={form.partyTwo}
        onChange={(patch) => controller.updateContractParty("partyTwo", patch)}
      />
      <label className={styles.field}>
        <span>Objetivo e condições essenciais</span>
        <textarea
          value={form.purpose}
          onChange={(event) => controller.updateContract({ purpose: event.target.value })}
          placeholder="Descreva objeto, valores, prazos, obrigações, pagamento, multas e condições específicas."
          maxLength={12000}
          disabled={disabled}
        />
      </label>
      <FooterFields value={form} onChange={controller.updateContract} disabled={disabled} />
    </>
  );
}

export function PowerOfAttorneyForm({ controller, disabled }) {
  const form = controller.powerOfAttorney;
  return (
    <>
      <ToneSelector
        value={form.tone}
        onChange={(tone) => controller.updatePowerOfAttorney({ tone })}
        disabled={disabled}
      />
      <PartyFields
        title="Outorgante"
        value={form.grantor}
        onChange={(patch) => controller.updatePowerParty("grantor", patch)}
      />
      <PartyFields
        title="Advogado outorgado"
        value={form.attorney}
        onChange={(patch) => controller.updatePowerParty("attorney", patch)}
        attorney
      />
      <label className={styles.field}>
        <span>Poderes concedidos</span>
        <textarea
          value={form.powers}
          onChange={(event) => controller.updatePowerOfAttorney({ powers: event.target.value })}
          placeholder="Descreva os poderes gerais e específicos concedidos ao advogado."
          maxLength={12000}
          disabled={disabled}
        />
      </label>
      <FooterFields value={form} onChange={controller.updatePowerOfAttorney} disabled={disabled} />
    </>
  );
}
