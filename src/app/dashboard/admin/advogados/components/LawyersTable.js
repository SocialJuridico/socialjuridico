import {
  Mail,
  Phone,
  Send,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  formatDate,
  formatDateTime,
  getActivityStatus,
  getOabStatus,
  getPlanStatus,
} from "../utils/lawyerFormatters";
import styles from "../AdvogadosAdmin.module.css";

function StatusBadge({ status }) {
  return (
    <span className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}>
      {status.label}
    </span>
  );
}

function LawyerActions({ lawyer, busyId, onOpen }) {
  const busy = busyId === lawyer.id;

  return (
    <div className={styles.actionsCell}>
      <button
        type="button"
        className={styles.manageButton}
        onClick={() => onOpen("manage", lawyer)}
        disabled={busy}
      >
        <Settings size={14} aria-hidden="true" />
        Gerenciar
      </button>

      <button
        type="button"
        className={styles.resetButton}
        onClick={() => onOpen("reset", lawyer)}
        disabled={busy}
      >
        <Send size={14} aria-hidden="true" />
        Enviar redefinição
      </button>

      <button
        type="button"
        className={styles.deleteButton}
        onClick={() => onOpen("delete", lawyer)}
        disabled={busy}
      >
        <Trash2 size={14} aria-hidden="true" />
        Excluir
      </button>
    </div>
  );
}

export default function LawyersTable({ lawyers, busyId, onOpen }) {
  if (!lawyers.length) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <UserRound size={28} aria-hidden="true" />
        </span>
        <h2>Nenhum advogado encontrado</h2>
        <p>Ajuste os filtros ou atualize os dados para tentar novamente.</p>
      </div>
    );
  }

  return (
    <section className={styles.listSection} aria-label="Lista de advogados">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Advogado</th>
              <th>Contato</th>
              <th>OAB</th>
              <th>Plano</th>
              <th>Juris</th>
              <th>Atividade</th>
              <th>Último acesso</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {lawyers.map((lawyer) => {
              const plan = getPlanStatus(lawyer);
              const oab = getOabStatus(lawyer);
              const activity = getActivityStatus(lawyer);

              return (
                <tr key={lawyer.id}>
                  <td>
                    <div className={styles.lawyerIdentity}>
                      <span className={styles.lawyerAvatar} aria-hidden="true">
                        {(lawyer.name || lawyer.email || "A").slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{lawyer.name || "Advogado sem nome"}</strong>
                        <a href={`mailto:${lawyer.email || ""}`}>
                          <Mail size={13} aria-hidden="true" />
                          {lawyer.email || "E-mail não informado"}
                        </a>
                      </div>
                    </div>
                  </td>
                  <td>
                    {lawyer.phone ? (
                      <a className={styles.contactLink} href={`tel:${lawyer.phone}`}>
                        <Phone size={13} aria-hidden="true" />
                        {lawyer.phone}
                      </a>
                    ) : (
                      <span className={styles.muted}>Não informado</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.oabCell}>
                      <strong>{lawyer.oab ? `${lawyer.oab}/${lawyer.estado || ""}` : "Não informada"}</strong>
                      <StatusBadge status={oab} />
                    </div>
                  </td>
                  <td><StatusBadge status={plan} /></td>
                  <td><span className={styles.jurisBadge}>{lawyer.balance || 0}</span></td>
                  <td><StatusBadge status={activity} /></td>
                  <td>{lawyer.last_sign_in_at ? formatDateTime(lawyer.last_sign_in_at) : "Nunca acessou"}</td>
                  <td>{formatDate(lawyer.created_at)}</td>
                  <td>
                    <LawyerActions lawyer={lawyer} busyId={busyId} onOpen={onOpen} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {lawyers.map((lawyer) => {
          const plan = getPlanStatus(lawyer);
          const oab = getOabStatus(lawyer);
          const activity = getActivityStatus(lawyer);

          return (
            <article key={lawyer.id} className={styles.mobileCard}>
              <header className={styles.mobileCardHeader}>
                <div className={styles.lawyerIdentity}>
                  <span className={styles.lawyerAvatar} aria-hidden="true">
                    {(lawyer.name || lawyer.email || "A").slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{lawyer.name || "Advogado sem nome"}</strong>
                    <span>{lawyer.email || "E-mail não informado"}</span>
                  </div>
                </div>
                <StatusBadge status={plan} />
              </header>

              <div className={styles.mobileBadges}>
                <StatusBadge status={oab} />
                <StatusBadge status={activity} />
              </div>

              <dl className={styles.mobileDetails}>
                <div><dt>OAB</dt><dd>{lawyer.oab ? `${lawyer.oab}/${lawyer.estado || ""}` : "Não informada"}</dd></div>
                <div><dt>Telefone</dt><dd>{lawyer.phone || "Não informado"}</dd></div>
                <div><dt>Juris</dt><dd>{lawyer.balance || 0}</dd></div>
                <div><dt>Último acesso</dt><dd>{lawyer.last_sign_in_at ? formatDateTime(lawyer.last_sign_in_at) : "Nunca acessou"}</dd></div>
                <div><dt>Cadastro</dt><dd>{formatDate(lawyer.created_at)}</dd></div>
              </dl>

              <LawyerActions lawyer={lawyer} busyId={busyId} onOpen={onOpen} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
