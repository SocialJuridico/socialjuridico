import { FolderOpen, Mail, Trash2, UserRound } from "lucide-react";

import {
  getOfficeCapacityLabel,
  getOfficeInitials,
  getPlanDisplayName,
  getPlanFamily,
} from "../utils/officeFormatters";
import styles from "../EscritoriosAdmin.module.css";

function PlanBadge({ plan }) {
  const family = getPlanFamily(plan);

  return (
    <span className={`${styles.planBadge} ${styles[`plan_${family}`]}`}>
      {getPlanDisplayName(plan)}
    </span>
  );
}

function OfficeActions({ office, onOpen, onDelete }) {
  return (
    <div className={styles.actionsCell}>
      <button
        type="button"
        className={styles.manageButton}
        onClick={() => onOpen(office)}
      >
        <FolderOpen size={14} aria-hidden="true" />
        Abrir gestão
      </button>

      <button
        type="button"
        className={styles.deleteButton}
        onClick={() => onDelete(office)}
      >
        <Trash2 size={14} aria-hidden="true" />
        Excluir
      </button>
    </div>
  );
}

export default function OfficesTable({ offices, onOpen, onDelete }) {
  if (!offices.length) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <UserRound size={28} aria-hidden="true" />
        </span>
        <h2>Nenhum escritório encontrado</h2>
        <p>Ajuste os filtros ou cadastre um novo escritório Enterprise.</p>
      </div>
    );
  }

  return (
    <section className={styles.listSection} aria-label="Lista de escritórios">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Escritório</th>
              <th>CNPJ</th>
              <th>Responsável</th>
              <th>Plano</th>
              <th>Capacidade</th>
              <th>Juris</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {offices.map((office) => (
              <tr key={office.id}>
                <td>
                  <div className={styles.officeIdentity}>
                    <span className={styles.officeAvatar} aria-hidden="true">
                      {office.logo_url ? (
                        <img src={office.logo_url} alt="" />
                      ) : (
                        getOfficeInitials(office.nome)
                      )}
                    </span>
                    <div>
                      <strong>{office.nome || "Escritório sem nome"}</strong>
                      <a href={`mailto:${office.email || ""}`}>
                        <Mail size={13} aria-hidden="true" />
                        {office.email || "E-mail não informado"}
                      </a>
                    </div>
                  </div>
                </td>
                <td>{office.cnpj || "Não informado"}</td>
                <td>{office.nome_responsavel || "Não informado"}</td>
                <td><PlanBadge plan={office.plano} /></td>
                <td>{getOfficeCapacityLabel(office)}</td>
                <td><span className={styles.jurisBadge}>{office.balance || 0}</span></td>
                <td>
                  <OfficeActions
                    office={office}
                    onOpen={onOpen}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {offices.map((office) => (
          <article key={office.id} className={styles.mobileCard}>
            <header className={styles.mobileCardHeader}>
              <div className={styles.officeIdentity}>
                <span className={styles.officeAvatar} aria-hidden="true">
                  {office.logo_url ? (
                    <img src={office.logo_url} alt="" />
                  ) : (
                    getOfficeInitials(office.nome)
                  )}
                </span>
                <div>
                  <strong>{office.nome || "Escritório sem nome"}</strong>
                  <span>{office.email || "E-mail não informado"}</span>
                </div>
              </div>
              <PlanBadge plan={office.plano} />
            </header>

            <dl className={styles.mobileDetails}>
              <div><dt>CNPJ</dt><dd>{office.cnpj || "Não informado"}</dd></div>
              <div><dt>Responsável</dt><dd>{office.nome_responsavel || "Não informado"}</dd></div>
              <div><dt>Capacidade</dt><dd>{getOfficeCapacityLabel(office)}</dd></div>
              <div><dt>Juris</dt><dd>{office.balance || 0}</dd></div>
            </dl>

            <OfficeActions
              office={office}
              onOpen={onOpen}
              onDelete={onDelete}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
