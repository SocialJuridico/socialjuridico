import { History, LoaderCircle } from "lucide-react";
import styles from "../../CasosAdmin.module.css";
import { formatCaseDate, getAuditActionLabel } from "./drawerUtils";

export default function CaseAuditTab({ events = [], loading = false }) {
  return (
    <section className={styles.drawerPanel}>
      <div className={styles.drawerPanelHeader}>
        <h3>Trilha de auditoria</h3>
        <History size={17} aria-hidden="true" />
      </div>

      {loading ? (
        <div className={styles.inlineLoading}>
          <LoaderCircle size={22} className={styles.spinning} aria-hidden="true" />
          Carregando eventos...
        </div>
      ) : events.length ? (
        <div className={styles.auditList}>
          {events.map((event) => (
            <div key={event.id} className={styles.auditItem}>
              <span className={styles.auditDot} />
              <div>
                <strong>{getAuditActionLabel(event.action)}</strong>
                <span>{event.purpose || "Finalidade não informada"}</span>
                {event.justification ? <p>{event.justification}</p> : null}
                <time dateTime={event.createdAt || undefined}>
                  {formatCaseDate(event.createdAt)}
                </time>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.mutedText}>Nenhum evento localizado.</p>
      )}
    </section>
  );
}
