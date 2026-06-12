import { Columns3, ListFilter, MailCheck } from "lucide-react";
import { CASE_VIEWS } from "../config/caseManagement";
import styles from "../CasosAdmin.module.css";

const views = [
  {
    value: CASE_VIEWS.PIPELINE,
    label: "Funil operacional",
    icon: Columns3,
  },
  {
    value: CASE_VIEWS.LIST,
    label: "Lista de casos",
    icon: ListFilter,
  },
  {
    value: CASE_VIEWS.EMAIL_FUNNEL,
    label: "Jornada de e-mail",
    icon: MailCheck,
  },
];

export default function CasesNavigation({ activeView, onChange }) {
  return (
    <nav className={styles.viewTabs} aria-label="Visualizações da gestão de casos">
      {views.map(({ value, label, icon: Icon }) => {
        const active = activeView === value;

        return (
          <button
            key={value}
            type="button"
            className={`${styles.viewTab} ${active ? styles.viewTabActive : ""}`}
            onClick={() => onChange(value)}
            aria-pressed={active}
          >
            <Icon size={15} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
