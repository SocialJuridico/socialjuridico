"use client";

import { FileSignature, UserRound } from "lucide-react";
import styles from "../DocumentGenerator.module.css";

export default function PartyFields({
  title,
  value,
  onChange,
  attorney = false,
}) {
  const Icon = attorney ? FileSignature : UserRound;
  return (
    <fieldset className={styles.partyCard}>
      <legend>
        <Icon size={16} /> {title}
      </legend>
      <div className={styles.twoColumns}>
        <label className={styles.field}>
          <span>Nome completo</span>
          <input
            value={value.name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="Nome da pessoa ou empresa"
            maxLength={180}
          />
        </label>
        <label className={styles.field}>
          <span>{attorney ? "OAB" : "CPF/CNPJ"}</span>
          <input
            value={attorney ? value.oab || "" : value.document}
            onChange={(event) =>
              onChange(
                attorney
                  ? { oab: event.target.value }
                  : { document: event.target.value },
              )
            }
            placeholder={attorney ? "UF 000000" : "Documento de identificação"}
            maxLength={40}
          />
        </label>
      </div>
      {attorney && (
        <label className={styles.field}>
          <span>CPF do advogado (opcional)</span>
          <input
            value={value.document}
            onChange={(event) => onChange({ document: event.target.value })}
            placeholder="Documento de identificação"
            maxLength={30}
          />
        </label>
      )}
      <div className={styles.twoColumns}>
        <label className={styles.field}>
          <span>Estado civil</span>
          <input
            value={value.civilStatus}
            onChange={(event) => onChange({ civilStatus: event.target.value })}
            placeholder="Ex.: casado(a)"
            maxLength={60}
          />
        </label>
        <label className={styles.field}>
          <span>Profissão</span>
          <input
            value={value.profession}
            onChange={(event) => onChange({ profession: event.target.value })}
            placeholder="Profissão ou atividade"
            maxLength={100}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span>Endereço completo</span>
        <input
          value={value.address}
          onChange={(event) => onChange({ address: event.target.value })}
          placeholder="Rua, número, bairro, cidade e UF"
          maxLength={300}
        />
      </label>
    </fieldset>
  );
}
