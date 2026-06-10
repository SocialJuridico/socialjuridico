import {
  Mail,
  Phone,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";

import {
  formatDate,
  getClientStatus,
  getLastAccessLabel,
} from "../utils/clientFormatters";
import styles from "../ClientesAdmin.module.css";

function ClientActions({ client, deletingId, resettingId, onAction }) {
  const deleting = deletingId === client.id;
  const resetting = resettingId === client.id;

  return (
    <div className={styles.actionsCell}>
      <button
        type="button"
        className={styles.resetButton}
        onClick={() => onAction("reset", client)}
        disabled={deleting || resetting}
      >
        <RotateCcw size={14} aria-hidden="true" />
        {resetting ? "Resetando..." : "Resetar senha"}
      </button>

      <button
        type="button"
        className={styles.deleteButton}
        onClick={() => onAction("delete", client)}
        disabled={deleting || resetting}
      >
        <Trash2 size={14} aria-hidden="true" />
        {deleting ? "Excluindo..." : "Excluir"}
      </button>
    </div>
  );
}

function ClientStatus({ client }) {
  const status = getClientStatus(client);

  return (
    <span className={`${styles.statusBadge} ${styles[`status_${status.tone}`]}`}>
      {status.label}
    </span>
  );
}

export default function ClientsTable({
  clients,
  deletingId,
  resettingId,
  onAction,
}) {
  if (!clients.length) {
    return (
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>
          <UserRound size={27} aria-hidden="true" />
        </span>
        <h2>Nenhum cliente encontrado</h2>
        <p>Ajuste os filtros ou atualize os dados para tentar novamente.</p>
      </div>
    );
  }

  return (
    <section className={styles.listSection} aria-label="Lista de clientes">
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Último acesso</th>
              <th>Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>
                  <div className={styles.clientIdentity}>
                    <span className={styles.clientAvatar} aria-hidden="true">
                      {(client.name || client.email || "C").slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{client.name || "Cliente sem nome"}</strong>
                      <a href={`mailto:${client.email || ""}`}>
                        <Mail size={13} aria-hidden="true" />
                        {client.email || "E-mail não informado"}
                      </a>
                    </div>
                  </div>
                </td>
                <td>
                  {client.phone ? (
                    <a className={styles.contactLink} href={`tel:${client.phone}`}>
                      <Phone size={13} aria-hidden="true" />
                      {client.phone}
                    </a>
                  ) : (
                    <span className={styles.muted}>Não informado</span>
                  )}
                </td>
                <td>
                  <ClientStatus client={client} />
                </td>
                <td>{getLastAccessLabel(client)}</td>
                <td>{formatDate(client.created_at)}</td>
                <td>
                  <ClientActions
                    client={client}
                    deletingId={deletingId}
                    resettingId={resettingId}
                    onAction={onAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {clients.map((client) => (
          <article key={client.id} className={styles.mobileCard}>
            <header className={styles.mobileCardHeader}>
              <div className={styles.clientIdentity}>
                <span className={styles.clientAvatar} aria-hidden="true">
                  {(client.name || client.email || "C").slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{client.name || "Cliente sem nome"}</strong>
                  <span>{client.email || "E-mail não informado"}</span>
                </div>
              </div>
              <ClientStatus client={client} />
            </header>

            <dl className={styles.mobileDetails}>
              <div>
                <dt>Telefone</dt>
                <dd>{client.phone || "Não informado"}</dd>
              </div>
              <div>
                <dt>Último acesso</dt>
                <dd>{getLastAccessLabel(client)}</dd>
              </div>
              <div>
                <dt>Cadastro</dt>
                <dd>{formatDate(client.created_at)}</dd>
              </div>
            </dl>

            <ClientActions
              client={client}
              deletingId={deletingId}
              resettingId={resettingId}
              onAction={onAction}
            />
          </article>
        ))}
      </div>
    </section>
  );
}
