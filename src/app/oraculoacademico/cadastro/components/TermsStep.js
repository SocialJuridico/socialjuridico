"use client";

import Link from "next/link";

import styles from "../OraculoWizard.module.css";

export const TERMS_ITEMS = [
  {
    key: "semOabAtiva",
    label: "Declaro que não possuo OAB ativa como advogado.",
  },
  {
    key: "naoSubstituiAdvogado",
    label:
      "Entendo que minha atuação no Social Jurídico não substitui a atuação de um advogado.",
  },
  {
    key: "naoPrometerResultado",
    label:
      "Comprometo-me a não prometer resultado, não captar cliente irregularmente e não me apresentar como advogado.",
  },
  {
    key: "apenasInformacoesGerais",
    label:
      "Comprometo-me a prestar apenas informações gerais, apoio inicial e organização do relato.",
  },
  {
    key: "encaminharAdvogado",
    label:
      "Entendo que casos com necessidade de contratação, urgência, prazo ou ato jurídico deverão ser encaminhados a advogado habilitado.",
  },
  {
    key: "aceitaAuditoria",
    label:
      "Aceito que minhas interações poderão ser auditadas pelo Social Jurídico para fins de segurança, qualidade e compliance.",
  },
  {
    key: "aceitaTermos",
    label: "termos",
  },
];

export default function TermsStep({ terms, onChange, disabled }) {
  function toggle(key) {
    onChange({ ...terms, [key]: !terms[key] });
  }

  return (
    <div>
      {TERMS_ITEMS.map((item) => (
        <div key={item.key} className={styles.checkboxRow}>
          <input
            id={`termo-${item.key}`}
            type="checkbox"
            className={styles.checkbox}
            checked={Boolean(terms[item.key])}
            onChange={() => toggle(item.key)}
            disabled={disabled}
          />

          <label htmlFor={`termo-${item.key}`} className={styles.checkboxLabel}>
            {item.key === "aceitaTermos" ? (
              <>
                Aceito os{" "}
                <Link href="/oraculoacademico/termos" className={styles.linkTag}>
                  Termos de Uso
                </Link>
                , a{" "}
                <Link href="/oraculoacademico/privacidade" className={styles.linkTag}>
                  Política de Privacidade
                </Link>{" "}
                e as{" "}
                <Link href="/oraculoacademico/regras" className={styles.linkTag}>
                  regras do programa
                </Link>
                .
              </>
            ) : (
              item.label
            )}
          </label>
        </div>
      ))}
    </div>
  );
}
