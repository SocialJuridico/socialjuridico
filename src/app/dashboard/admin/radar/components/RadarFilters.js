import { AlertTriangle } from "lucide-react";

import { SOURCE_OPTIONS, STATUS_OPTIONS } from "../utils/radarFormatters";
import styles from "../page.module.css";

export default function RadarFilters({
  statusFilter,
  sourceTypeFilter,
  reportedOnly,
  onStatus,
  onSource,
  onReported,
}) {
  return (
    <section className={styles.filters} aria-label="Filtros do Radar">
      <div className={styles.filterGroup}>
        <span>Status</span>
        <div className={styles.filterTabs}>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.filterTab} ${
                statusFilter === option.value ? styles.filterTabActive : ""
              }`}
              onClick={() => onStatus(option.value)}
              aria-pressed={statusFilter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.filterGroup}>
        <span>Canal</span>
        <div className={styles.filterTabs}>
          {SOURCE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              className={`${styles.filterTab} ${
                sourceTypeFilter === option.value ? styles.filterTabActive : ""
              }`}
              onClick={() => onSource(option.value)}
              aria-pressed={sourceTypeFilter === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <label className={styles.reportToggle}>
        <input
          type="checkbox"
          checked={reportedOnly}
          onChange={(event) => onReported(event.target.checked)}
        />
        <AlertTriangle size={15} aria-hidden="true" />
        Somente sinalizadas
      </label>
    </section>
  );
}
