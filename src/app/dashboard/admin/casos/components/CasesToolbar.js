import { AlertTriangle, Filter, Search, X } from "lucide-react";
import {
  CASE_INTENT_TIERS,
  CASE_RISK_LEVELS,
  CASE_STAGES,
  CASE_VIEWS,
} from "../config/caseManagement";
import styles from "../CasosAdmin.module.css";

const EMAIL_TYPES = [
  { value: "ALL", label: "Todos os e-mails" },
  { value: "INTERESSE", label: "Interesse" },
  { value: "CADASTRO", label: "Cadastro" },
  { value: "CHAT", label: "Chat" },
  { value: "FINANCEIRO", label: "Financeiro" },
  { value: "ADMIN", label: "Admin" },
];

export default function CasesToolbar({
  view,
  searchTerm,
  stageFilter,
  riskFilter,
  intentFilter,
  alertsOnly,
  funnelTypeFilter,
  funnelAlertsOnly,
  visibleCount,
  onSearchChange,
  onStageFilterChange,
  onRiskFilterChange,
  onIntentFilterChange,
  onAlertsOnlyChange,
  onFunnelTypeFilterChange,
  onFunnelAlertsOnlyChange,
}) {
  const emailView = view === CASE_VIEWS.EMAIL_FUNNEL;

  return (
    <section className={styles.toolbar} aria-label="Filtros da gestão de casos">
      <div className={styles.searchField}>
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={
            emailView
              ? "Buscar caso, destinatário ou tipo de e-mail..."
              : "Buscar título, área, localidade, cliente ou advogado..."
          }
          aria-label="Buscar na gestão de casos"
        />
        {searchTerm && (
          <button
            type="button"
            className={styles.clearSearchButton}
            onClick={() => onSearchChange("")}
            aria-label="Limpar busca"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {!emailView ? (
        <div className={styles.filterControls}>
          <label className={styles.selectFilter}>
            <span>Etapa</span>
            <select
              value={stageFilter}
              onChange={(event) => onStageFilterChange(event.target.value)}
            >
              <option value="ALL">Todas</option>
              {CASE_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.selectFilter}>
            <span>Privacidade</span>
            <select
              value={riskFilter}
              onChange={(event) => onRiskFilterChange(event.target.value)}
            >
              <option value="ALL">Todos</option>
              {CASE_RISK_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.selectFilter}>
            <span>Intenção</span>
            <select
              value={intentFilter}
              onChange={(event) => onIntentFilterChange(event.target.value)}
            >
              <option value="ALL">Todas</option>
              {CASE_INTENT_TIERS.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={`${styles.toggleFilter} ${
              alertsOnly ? styles.toggleFilterActive : ""
            }`}
            onClick={() => onAlertsOnlyChange(!alertsOnly)}
            aria-pressed={alertsOnly}
          >
            <AlertTriangle size={14} aria-hidden="true" />
            Só alertas
          </button>
        </div>
      ) : (
        <div className={styles.filterControls}>
          <label className={styles.selectFilter}>
            <span>Tipo</span>
            <select
              value={funnelTypeFilter}
              onChange={(event) => onFunnelTypeFilterChange(event.target.value)}
            >
              {EMAIL_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className={`${styles.toggleFilter} ${
              funnelAlertsOnly ? styles.toggleFilterActive : ""
            }`}
            onClick={() => onFunnelAlertsOnlyChange(!funnelAlertsOnly)}
            aria-pressed={funnelAlertsOnly}
          >
            <Filter size={14} aria-hidden="true" />
            Gargalos
          </button>
        </div>
      )}

      <span className={styles.visibleCount}>
        {visibleCount} resultado{visibleCount === 1 ? "" : "s"}
      </span>
    </section>
  );
}
